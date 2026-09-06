"""
Rule engine.

Loads the YAML pack and evaluates each rule against a Canonical Security Model. Because
rules read canonical fields (never raw config), the SAME pack grades Cisco, a taught
vendor, or a provisional LLM-parsed device. Every check returns its evidence, the fix,
and the benchmark reference so a finding holds up in expert Q&A.
"""
import os
import yaml
from ..canonical import get_field

_PACK = os.path.join(os.path.dirname(__file__), "packs", "cis_ios.yaml")
_SEV_WEIGHT = {"high": 3, "medium": 2, "low": 1}


def load_pack(path=_PACK):
    with open(path) as f:
        return yaml.safe_load(f)


def _snmp_hardening(model):
    comms = get_field(model, "services.snmp_communities") or []
    comms = [{"name": c, "access": "ro"} if isinstance(c, str) else c
             for c in comms if isinstance(c, (str, dict))]
    if not comms:
        return "pass", "No SNMP communities configured.", []
    bad = []
    for c in comms:
        name = str(c.get("name", "")).strip().strip('"')
        access = str(c.get("access", "ro")).lower()
        if name.lower() in ("public", "private"):
            bad.append(f"default community \"{name}\"")
        if access == "rw":
            bad.append(f"read-write community \"{name}\"")
    if bad:
        return "fail", "Weak SNMP: " + "; ".join(bad) + ".", comms
    return "pass", f"{len(comms)} community(ies) present, none default or writable.", comms


def _telnet_off(model):
    svc = get_field(model, "services.telnet_enabled")
    transport = get_field(model, "vty.transport_input")
    telnet_on = (svc is True) or (isinstance(transport, list) and "telnet" in transport)
    if svc is None and transport is None:
        return "na", "Not assessed \u2014 telnet state not determined.", None
    if telnet_on:
        how = "service enabled" if svc is True else "permitted on admin lines"
        return "fail", f"Telnet is {how}.", {"telnet_enabled": svc, "transport_input": transport}
    return "pass", "Telnet is not reachable.", {"telnet_enabled": svc, "transport_input": transport}


_CUSTOM = {"snmp_hardening": _snmp_hardening, "telnet_off": _telnet_off}


def _eval_op(op, value, expected):
    """Returns True/False, or None meaning 'could not determine' (fact unknown)."""
    if op == "exists":            # absence is itself the answer here
        return value is not None
    if value is None:
        return None
    if op == "is_true":
        return value is True
    if op == "is_false":
        return value is False
    if op == "equals":
        return value == expected
    if op == "not_equals":
        return value != expected
    if op == "contains":
        return expected in (value or [])
    if op == "not_contains":
        return expected not in (value or [])
    if op == "is_empty":
        return len(value) == 0
    if op == "not_empty":
        return len(value) > 0
    if op == "timeout_ok":
        return isinstance(value, list) and len(value) == 2 and (value[0] > 0 or value[1] > 0)
    return None


def _fmt(value):
    if value is None:
        return "not set"
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        return ", ".join(str(x) for x in value) if value else "none"
    return str(value)


def evaluate(model, pack=None):
    pack = pack or load_pack()
    checks = []
    for r in pack["rules"]:
        op = r["op"]
        observed = None
        if op == "custom":
            status, detail, observed = _CUSTOM[r["custom"]](model)
        else:
            observed = get_field(model, r["field"])
            res = _eval_op(op, observed, r.get("value"))
            if res is None:
                status = r.get("on_unknown", "na")
                detail = ("Not assessed — this fact was not determined for the device."
                          if status == "na" else
                          "No evidence found; failing closed.")
            else:
                status = "pass" if res else "fail"
                detail = f"Observed: {_fmt(observed)}."
        checks.append({
            "id": r["id"],
            "title": r["title"],
            "severity": r["severity"],
            "reference": r.get("reference", ""),
            "status": status,
            "detail": detail,
            "rationale": r.get("rationale", ""),
            "fix": (r.get("fix") or "").strip(),
            "field": r.get("field"),
            "observed": observed,
        })

    passed = sum(1 for c in checks if c["status"] == "pass")
    failed = sum(1 for c in checks if c["status"] == "fail")
    na = sum(1 for c in checks if c["status"] == "na")
    # severity-weighted score: a high-severity failure hurts more than a low one.
    w_have = sum(_SEV_WEIGHT[c["severity"]] for c in checks if c["status"] in ("pass", "fail"))
    w_pass = sum(_SEV_WEIGHT[c["severity"]] for c in checks if c["status"] == "pass")
    score = round(100 * w_pass / w_have) if w_have else 100
    fails_by_sev = {
        s: sum(1 for c in checks if c["status"] == "fail" and c["severity"] == s)
        for s in ("high", "medium", "low")
    }
    return {
        "checks": checks,
        "score": score,
        "passed": passed,
        "failed": failed,
        "na": na,
        "total": len(checks),
        "fails_by_severity": fails_by_sev,
        "pack": pack["meta"]["name"],
    }
