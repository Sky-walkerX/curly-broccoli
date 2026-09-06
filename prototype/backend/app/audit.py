"""
Audit orchestration -- the hybrid brain.

Order of attack for any uploaded config:
  1. Deterministic Cisco parser (fast, exact) if it recognizes the syntax.
  2. A previously TAUGHT vendor's learned mappings (also deterministic).
  3. Otherwise it's a vendor we've never seen -> the local LLM + keyword heuristic
     PROPOSE how each line maps into the canonical model. The result is 'provisional'
     and the UI asks the admin to confirm -> that's the teach-a-vendor loop.

Rules then grade the canonical model the same way regardless of how we got there.
"""
import time

from .parsers import cisco, learned
from .parsers.heuristics import heuristic_proposals
from . import llm, store
from .rules import engine
from .canonical import empty_model, add_or_set, WRITABLE_FIELDS, coerce

CISCO_MIN = 0.66     # 2 of 3 strong IOS signatures
LEARNED_MIN = 0.40   # 40% of a vendor's learned mappings must match this config


def _clean_lines(text):
    return [l.strip() for l in text.splitlines()
            if l.strip() and not l.strip().startswith(("!", "#"))]


def _same_value(a, b):
    return a == b


def _merge_proposals(llm_props, heur_props):
    """Merge the two engines. The LLM is primary (it generalizes to any vendor); the
    keyword heuristic cross-checks it and fills gaps. Where they disagree we DON'T guess
    silently -- we flag the proposal for human review and surface both values. That
    human-in-the-loop confirm step is the teach-a-vendor safety net."""
    heur_by_key = {(h["line"], h["field"]): h for h in heur_props}
    used = set()
    merged = []
    for p in llm_props:
        key = (p["line"], p["field"])
        prop = dict(p)
        if key in heur_by_key:
            used.add(key)
            h = heur_by_key[key]
            if _same_value(p["value"], h["value"]):
                prop["source"] = "llm+heuristic"
                prop["agreement"] = "agree"
                prop["confidence"] = round(min(1.0, prop.get("confidence", 0.7) + 0.15), 2)
            else:
                prop["agreement"] = "conflict"
                prop["alt_value"] = h["value"]
                prop["needs_review"] = True
        else:
            prop["agreement"] = "llm_only"
            prop["needs_review"] = True
        merged.append(prop)
    for h in heur_props:
        key = (h["line"], h["field"])
        if key in used:
            continue
        hp = dict(h)
        hp["agreement"] = "heuristic_only"
        merged.append(hp)
    return merged


def _model_from_proposals(proposals):
    m = empty_model()
    m["vendor"] = "provisional"
    for p in proposals:
        field = p["field"]
        if field in WRITABLE_FIELDS:
            add_or_set(m, field, coerce(p["value"], WRITABLE_FIELDS[field]))
    return m


def _best_learned(text):
    best = (None, 0.0, None)
    for v in store.list_vendors():
        maps = store.get_mappings(v["vendor"])
        conf = learned.detect(text, maps)
        if conf > best[1]:
            best = (v["vendor"], conf, maps)
    return best


def run_audit(config_text, vendor_hint=None, on_event=None):
    """Grade one config.

    on_event, when given, reports progress as it happens -- which path was taken and
    each mapping the local model produces while it is still writing. It changes no
    outcome: with on_event=None this behaves exactly as it always has.
    """
    emit = on_event or (lambda kind, data: None)
    started = time.perf_counter()

    cisco_conf = cisco.detect(config_text)
    l_vendor, l_conf, l_maps = _best_learned(config_text)

    if cisco_conf >= CISCO_MIN and cisco_conf >= l_conf:
        emit("parsing", {"mode": "deterministic", "vendor": "cisco_ios"})
        model = cisco.parse(config_text)
        status = "known"
        mode = "deterministic"
        learning = {"needed": False, "proposals": [], "unknown_lines": []}
    elif l_conf >= LEARNED_MIN:
        emit("parsing", {"mode": "deterministic", "vendor": l_vendor})
        model = learned.parse(config_text, l_vendor, l_maps)
        status = "learned"
        mode = "deterministic (learned)"
        learning = {"needed": False, "proposals": [], "unknown_lines": []}
    else:
        lines = _clean_lines(config_text)
        emit("learning", {"lines": lines, "vendor_guess": vendor_hint or "new-vendor",
                          "model": llm.OLLAMA_MODEL})
        mode = "local model"
        llm_props = llm.propose_mappings(
            lines, on_mapping=(lambda p: emit("mapping", p)) if on_event else None)
        heur_props = heuristic_proposals(lines)
        proposals = _merge_proposals(llm_props, heur_props)
        model = _model_from_proposals(proposals)
        status = "provisional"
        covered = {p["line"] for p in proposals}
        learning = {
            "needed": True,
            "proposals": proposals,
            "unknown_lines": [l for l in lines if l not in covered][:40],
            "llm_used": bool(llm_props),
            "vendor_guess": vendor_hint or "new-vendor",
        }

    report = engine.evaluate(model)
    elapsed_ms = int(round((time.perf_counter() - started) * 1000))
    device = {
        "vendor": model.get("vendor"),
        "vendor_status": status,
        "hostname": model.get("hostname"),
        "detect": {"cisco": round(cisco_conf, 2), "learned": round(l_conf, 2),
                   "learned_vendor": l_vendor},
    }
    return {"device": device, "canonical": model, "report": report, "learning": learning,
            "timing": {"elapsed_ms": elapsed_ms, "mode": mode}}
