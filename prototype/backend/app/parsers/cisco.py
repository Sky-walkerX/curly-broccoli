"""
Deterministic Cisco IOS parser.

This runs FIRST, before any LLM. IOS config is line- and indent-structured, so we can
extract the security facts we care about with plain rules -- fast, offline, and 100%
repeatable. The local LLM is only ever a fallback for vendors this parser doesn't know.
"""
import re
from ..canonical import empty_model

# Distinctive IOS tokens. A brand-new vendor (e.g. AcmeOS) hits none of these, which is
# exactly how we decide "this is a vendor we don't know" and hand it to the LLM.
STRONG_SIGNATURES = [
    r"(?mi)^line vty",
    r"(?mi)^\s*transport input",
    r"(?mi)^enable (secret|password)",
    r"(?mi)^service password-encryption",
    r"(?mi)^snmp-server community",
    r"(?mi)^ip ssh version",
    r"(?mi)^line con",
]

IP_RE = re.compile(r"(\d{1,3}(?:\.\d{1,3}){3})")


def detect(text):
    """Rough confidence (0..1) that this is a Cisco IOS config."""
    hits = sum(1 for pat in STRONG_SIGNATURES if re.search(pat, text))
    return min(1.0, hits / 3.0)


def _blocks(text):
    """Split into (header, [indented children]) so we can read line-vty sub-config."""
    blocks, cur = [], None
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("!"):
            continue
        if raw[0] in (" ", "\t"):
            if cur is not None:
                cur[1].append(raw.strip())
        else:
            cur = (raw.rstrip(), [])
            blocks.append(cur)
    return blocks


def _parse_vty(m, children):
    for c in children:
        cl = c.lower()
        if cl.startswith("transport input"):
            toks = cl.replace("transport input", "").split()
            if "all" in toks:
                val = ["telnet", "ssh"]
            elif "none" in toks:
                val = []
            else:
                val = [t for t in toks if t in ("ssh", "telnet")]
            m["vty"]["transport_input"] = val
        elif cl.startswith("access-class"):
            parts = c.split()
            if len(parts) >= 2:
                m["vty"]["access_class"] = parts[1]
        elif cl.startswith("exec-timeout"):
            nums = re.findall(r"\d+", cl)
            if len(nums) >= 2:
                m["vty"]["exec_timeout"] = [int(nums[0]), int(nums[1])]
            elif len(nums) == 1:
                m["vty"]["exec_timeout"] = [int(nums[0]), 0]


def parse(text):
    """Extract the Canonical Security Model from an IOS config."""
    m = empty_model()
    m["vendor"] = "cisco_ios"
    saw_ssh = False

    for header, children in _blocks(text):
        h = header.strip()
        low = h.lower()
        if low.startswith("hostname "):
            m["hostname"] = h.split(None, 1)[1].strip()
        elif low.startswith("enable secret"):
            m["auth"]["enable_secret"] = True
        elif low.startswith("enable password") and m["auth"]["enable_secret"] is None:
            m["auth"]["enable_secret"] = False  # only a weak plaintext password, no hashed secret
        elif low == "service password-encryption":
            m["auth"]["password_encryption"] = True
        elif low == "no service password-encryption":
            m["auth"]["password_encryption"] = False
        elif low == "aaa new-model":
            m["auth"]["aaa_new_model"] = True
        elif low.startswith("ip http server"):
            m["services"]["http_server"] = True
        elif low.startswith("no ip http server"):
            m["services"]["http_server"] = False
        elif low.startswith("ip ssh version"):
            saw_ssh = True
            mt = re.search(r"version\s+(\d)", low)
            if mt:
                m["services"]["ssh_version"] = int(mt.group(1))
        elif low.startswith("ip ssh"):
            saw_ssh = True
        elif low == "no cdp run":
            m["services"]["cdp_enabled"] = False
        elif low.startswith("snmp-server community"):
            parts = h.split()
            name = parts[2] if len(parts) > 2 else ""
            access = "ro"
            for p in parts[3:]:
                if p.upper() == "RW":
                    access = "rw"
                elif p.upper() == "RO":
                    access = "ro"
            m["services"]["snmp_communities"].append({"name": name, "access": access})
        elif low.startswith("logging "):
            arg = h.split(None, 1)[1].strip()
            m["logging"]["enabled"] = True
            ip = IP_RE.search(arg)
            if ip and ("host" in low or re.match(r"\d", arg)):
                m["logging"]["hosts"].append(ip.group(1))
        elif low.startswith("ntp server"):
            m["ntp"]["configured"] = True
            ip = IP_RE.search(h)
            if ip:
                m["ntp"]["servers"].append(ip.group(1))
        elif low.startswith("banner "):
            m["banner_login"] = True
        elif low.startswith("line vty"):
            _parse_vty(m, children)

    ti = m["vty"]["transport_input"]
    if ti is not None:
        m["services"]["telnet_enabled"] = "telnet" in ti
    if saw_ssh or (ti and "ssh" in ti):
        m["services"]["ssh_enabled"] = True

    # We KNOW this is IOS, so unseen facts fall back to documented IOS defaults.
    _default(m, "auth.password_encryption", False)   # off unless configured
    _default(m, "auth.aaa_new_model", False)         # off unless configured
    _default(m, "services.cdp_enabled", True)        # CDP ships on
    _default(m, "services.http_server", False)
    _default(m, "logging.enabled", False)
    _default(m, "ntp.configured", False)
    _default(m, "banner_login", False)
    return m


def _default(m, dotted, value):
    from ..canonical import get_field, set_field
    if get_field(m, dotted) is None:
        set_field(m, dotted, value)
