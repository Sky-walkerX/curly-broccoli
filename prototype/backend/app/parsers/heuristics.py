"""
Keyword heuristic mapper -- the safety net under the LLM.

When we hit a vendor we don't know, the local LLM proposes how each unknown line maps
into the Canonical Security Model. This module does the same job with plain keyword
rules. We run BOTH and merge (LLM preferred, heuristic fills the gaps) so the
teach-a-vendor panel is never empty -- even if the model is slow or returns junk on
stage. Honest engineering for a live demo: the star is the LLM, this is the seatbelt.
"""
import re

SNMP_COMMUNITY_RE = re.compile(
    r'community\s+(?:name\s+)?"?([\w.\-]+)"?.*?(read-only|read-write|ro|rw)', re.I)


# Each entry: (compiled test, field, value-or-extractor, keyword-signature, rationale)
# value can be a literal, or ("capture", regex) to pull a dynamic value from the line.
_RULES = [
    (re.compile(r"telnet", re.I),
     "services.telnet_enabled",
     lambda l: not re.search(r"\b(disabled?|off|no|deny)\b", l, re.I),
     "telnet", "Line mentions telnet; enabled unless it says disabled/off."),

    (re.compile(r"\bssh\b.*(?:version|protocol)[\s:=-]*(\d)", re.I),
     "services.ssh_version",
     lambda l: int(re.search(r"(?:version|protocol)[\s:=-]*(\d)", l, re.I).group(1)),
     "ssh version", "SSH protocol version stated on the line."),

    (re.compile(r"\bssh\b", re.I),
     "services.ssh_enabled",
     lambda l: not re.search(r"\b(disabled?|off)\b", l, re.I),
     "ssh", "Line configures SSH; treated as enabled."),

    (re.compile(r"(web-?ui|http\b|www|gui)", re.I),
     "services.http_server",
     lambda l: bool(re.search(r"\b(enabled?|on|yes)\b", l, re.I)) and not re.search(r"(https|secure)", l, re.I),
     "web-ui", "Plaintext web/management UI toggle."),

    (re.compile(r"(secret|privilege|enable).*(hash|secret|encrypted)", re.I),
     "auth.enable_secret", lambda l: True,
     "secret", "Privileged access protected by a hashed secret."),

    (re.compile(r"password.*(encrypt|hash|storage)", re.I),
     "auth.password_encryption",
     lambda l: not re.search(r"\b(off|none|disabled?)\b", l, re.I),
     "password", "Stored-password encryption setting."),

    (re.compile(r"\baaa\b|authentication\s+mode", re.I),
     "auth.aaa_new_model", lambda l: True,
     "aaa", "Centralized authentication/authorization configured."),

    (re.compile(r"(log|syslog).*(\d{1,3}(?:\.\d{1,3}){3})", re.I),
     "logging.enabled", lambda l: True,
     "log", "A syslog/log target is configured."),

    (re.compile(r"(ntp|time-?source|clock).*(none|disabled?)", re.I),
     "ntp.configured", lambda l: False,
     "ntp", "Time source explicitly none/disabled."),

    (re.compile(r"(ntp|time-?source).*(\d{1,3}(?:\.\d{1,3}){3})", re.I),
     "ntp.configured", lambda l: True,
     "ntp", "An NTP/time server is set."),

    (re.compile(r"(?:idle-?timeout|exec-?timeout|session-?timeout)[\s:=]*(\d+)", re.I),
     "vty.exec_timeout",
     lambda l: [int(re.search(r"timeout[\s:=-]*(\d+)", l, re.I).group(1)), 0],
     "timeout", "Admin session idle timeout (0 = never, which is bad)."),

    (re.compile(r"(cdp|lldp|discovery-?protocol)", re.I),
     "services.cdp_enabled",
     lambda l: bool(re.search(r"\b(enabled?|on)\b", l, re.I)),
     "discovery", "Neighbor discovery protocol broadcasting."),

    (re.compile(r"(login-?banner|banner)\b", re.I),
     "banner_login",
     lambda l: not re.search(r'text\s*""|""\s*$|\bnone\b', l, re.I),
     "banner", "Login banner present and non-empty."),

    (re.compile(r"(mgmt|management|transport).*(telnet)", re.I),
     "vty.transport_input", lambda l: ["telnet"],
     "transport", "Management line allows telnet transport."),
]


def _extract_capture(spec, line):
    _, regex, group = spec[0], spec[1], spec[2]
    mt = regex.search(line)
    if not mt:
        return None
    raw = mt.group(group)
    if len(spec) > 3 and spec[3] == "timeout_list":
        try:
            return [int(raw), 0]
        except ValueError:
            return None
    try:
        return int(raw)
    except (ValueError, TypeError):
        return raw


def heuristic_proposals(lines):
    """Return canonical-field proposals for a list of unknown config lines."""
    out = []
    seen = set()
    for line in lines:
        s = line.strip()
        if not s or s.startswith(("!", "#")):
            continue
        sm = SNMP_COMMUNITY_RE.search(s)
        if sm:
            name = sm.group(1)
            acc = sm.group(2).lower()
            access = "rw" if ("write" in acc or acc == "rw") else "ro"
            key = (s, "services.snmp_communities")
            if key not in seen:
                seen.add(key)
                out.append({
                    "line": s,
                    "field": "services.snmp_communities",
                    "value": [{"name": name, "access": access}],
                    "match_keywords": f"community {name}",
                    "capture_regex": None,
                    "confidence": 0.6,
                    "rationale": f"SNMP community \"{name}\" ({access}).",
                    "source": "heuristic",
                })
            continue
        for test, field, value, kw, why in _RULES:
            if not test.search(s):
                continue
            if isinstance(value, tuple) and value[0] == "capture":
                val = _extract_capture(value, s)
                if val is None:
                    continue
                cap = value[1].pattern
            else:
                try:
                    val = value(s)
                except (AttributeError, ValueError, TypeError):
                    continue
                cap = None
            key = (s, field)
            if key in seen:
                continue
            seen.add(key)
            out.append({
                "line": s,
                "field": field,
                "value": val,
                "match_keywords": kw,
                "capture_regex": cap,
                "confidence": 0.6,
                "rationale": why,
                "source": "heuristic",
            })
    return out
