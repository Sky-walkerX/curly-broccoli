"""
Local LLM client (Ollama) -- the "learns a new vendor" engine.

Runs entirely on the box: no cloud, no API keys, air-gap friendly. Given config lines
from a vendor the deterministic parser doesn't know, the model proposes how each line
maps into the Canonical Security Model. This is the primary normalizer for unknown
vendors (that's the winning angle: generalize, don't hand-code regex per vendor). Its
output is strictly validated and normalized against the allowed field list, and a
keyword heuristic runs alongside as a cross-check + offline fallback. A human confirms
before anything is saved -- so the model is never trusted blindly.
"""
import os
import json
import requests

from .canonical import WRITABLE_FIELDS, coerce
from .streamjson import MappingStream

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:3b")
TIMEOUT = int(os.environ.get("OLLAMA_TIMEOUT", "120"))

_FIELD_LIST = "\n".join(f"  {f}: {t}" for f, t in WRITABLE_FIELDS.items())

_SYSTEM = (
    "You are a network-security configuration normalizer. You read router/firewall "
    "configuration lines from ANY vendor and map them onto ONE fixed canonical schema of "
    "security facts. You never invent fields; you only use fields from the allowed list. "
    "You reply with JSON only."
)

# A few worked examples pin down the tricky semantics (aaa present, empty banner, no ACL).
_FEWSHOT = """Worked examples (different made-up vendor):
  "auth radius-server enabled"        -> auth.aaa_new_model = true   (AAA is configured)
  "banner login text \\"\\""              -> banner_login = false        (banner is empty)
  "mgmt filter none"                  -> (emit NOTHING; there is no ACL name to record)
  "console idle 0"                    -> vty.exec_timeout = [0, 0]    (0 means never)
  "ssh protocol 2"                    -> services.ssh_version = 2
  "discovery lldp on"                 -> services.cdp_enabled = true  (NOT transport_input)"""


def _user_prompt(lines):
    numbered = "\n".join(f"{i+1}. {ln}" for i, ln in enumerate(lines))
    return f"""Allowed canonical fields (name: type):
{_FIELD_LIST}

{_FEWSHOT}

Now map THESE lines from a vendor we have no parser for. Emit a mapping only for lines
that clearly express one of the allowed facts. Skip routing, interfaces, zones, comments.

Config lines:
{numbered}

Reply with ONLY this JSON:
{{"mappings":[
  {{"line":"<exact original line>","field":"<one allowed field>","value":<bool|int|string|list>,
    "match_keywords":"<short distinctive substring of the line>","confidence":<0..1>,
    "rationale":"<short why>"}}
]}}
Types: booleans for *_enabled/_secret/_encryption/aaa_new_model/banner_login; an integer
for ssh_version; ["telnet","ssh"] for vty.transport_input; [{{"name":"public","access":"ro"}}]
for services.snmp_communities (access "ro" or "rw"); vty.exec_timeout is [minutes, seconds]."""


def health():
    """Is Ollama reachable, and is our model pulled?"""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=4)
        r.raise_for_status()
        names = [m.get("name", "") for m in r.json().get("models", [])]
        have = any(n == OLLAMA_MODEL or n.startswith(OLLAMA_MODEL.split(":")[0]) for n in names)
        return {"ok": True, "model": OLLAMA_MODEL, "model_available": have, "models": names}
    except requests.RequestException as e:
        return {"ok": False, "model": OLLAMA_MODEL, "model_available": False, "error": str(e)}


def _keywords_fallback(line):
    toks = [t for t in line.split() if len(t) > 2][:3]
    return " ".join(toks) if toks else line[:20]


_VALID_TRANSPORT = {"telnet", "ssh", "http", "https", "all", "none"}
_EMPTY_ACL = {"none", "any", "", '""', "null", "no", "off"}


def _normalize(field, value):
    """Fix common model slips. Returns (keep, value); keep=False drops the mapping."""
    if field == "vty.access_class":
        # access_class is an ACL NAME. "none"/"any" means there is no ACL -> leave unset
        # (so the 'restrict admin access' rule fails closed) rather than record a fake name.
        if value is None or str(value).strip().lower() in _EMPTY_ACL:
            return False, None
        return True, value
    if field == "vty.exec_timeout":
        if isinstance(value, list) and value:
            try:
                nums = [int(x) for x in value]
            except (ValueError, TypeError):
                return False, None
            return True, (nums + [0])[:2] if len(nums) == 1 else nums[:2]
        return False, None
    if field == "vty.transport_input":
        vals = [str(t).lower() for t in (value or []) if str(t).lower() in _VALID_TRANSPORT]
        if not vals:
            return False, None      # e.g. model mapped an 'lldp' line here -> drop
        if "all" in vals:
            return True, ["telnet", "ssh"]
        if "none" in vals:
            return True, []
        return True, vals
    return True, value


def _clean(raw_mappings, valid_lines):
    """Validate + normalize the model's raw output; drop anything invalid."""
    out = []
    line_set = {l.strip() for l in valid_lines}
    for mp in raw_mappings or []:
        if not isinstance(mp, dict):
            continue
        field = str(mp.get("field", "")).strip()
        if field not in WRITABLE_FIELDS:
            continue
        line = str(mp.get("line", "")).strip()
        if line not in line_set:
            match = next((l for l in line_set if line and line in l), None)
            if not match:
                continue
            line = match
        value = coerce(mp.get("value"), WRITABLE_FIELDS[field])
        keep, value = _normalize(field, value)
        if not keep:
            continue
        kw = str(mp.get("match_keywords") or "").strip() or _keywords_fallback(line)
        try:
            conf = float(mp.get("confidence", 0.7))
        except (ValueError, TypeError):
            conf = 0.7
        out.append({
            "line": line,
            "field": field,
            "value": value,
            "match_keywords": kw,
            "capture_regex": None,
            "confidence": round(max(0.0, min(1.0, conf)), 2),
            "rationale": str(mp.get("rationale") or "").strip()[:160],
            "source": "llm",
        })
    return out


def _payload(lines, stream):
    return {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM},
            {"role": "user", "content": _user_prompt(lines)},
        ],
        "stream": stream,
        "format": "json",
        "options": {"temperature": 0},
    }


def _usable(lines):
    return [l for l in (ln.strip() for ln in lines) if l and not l.startswith(("!", "#"))]


def propose_mappings(lines, on_mapping=None):
    """Ask the local model to map unknown lines. Returns [] on any failure.

    Pass on_mapping to stream: it is called with each validated mapping the moment the
    model finishes writing it, so the UI can show the learning happen instead of
    staring at a spinner. The returned list is identical either way.
    """
    lines = _usable(lines)
    if not lines:
        return []
    if on_mapping is None:
        return _propose_blocking(lines)
    return _propose_streaming(lines, on_mapping)


def _propose_blocking(lines):
    try:
        r = requests.post(f"{OLLAMA_URL}/api/chat", json=_payload(lines, False), timeout=TIMEOUT)
        r.raise_for_status()
        content = r.json().get("message", {}).get("content", "")
        data = json.loads(content)
        return _clean(data.get("mappings", []), lines)
    except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError):
        return []


def _propose_streaming(lines, on_mapping):
    """Same call with stream=True, surfacing each mapping as its closing brace lands.

    A mid-stream failure keeps whatever the model already produced: those mappings are
    real, they were validated, and the admin has already seen them on screen.
    """
    reader = MappingStream()
    out = []
    try:
        with requests.post(f"{OLLAMA_URL}/api/chat", json=_payload(lines, True),
                           stream=True, timeout=TIMEOUT) as r:
            r.raise_for_status()
            for raw in r.iter_lines():
                if not raw:
                    continue
                try:
                    chunk = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                content = chunk.get("message", {}).get("content", "")
                if not content:
                    continue
                for mp in reader.feed(content):
                    for cleaned in _clean([mp], lines):   # never surface unvalidated output
                        out.append(cleaned)
                        on_mapping(cleaned)
    except (requests.RequestException, ValueError):
        return out
    return out
