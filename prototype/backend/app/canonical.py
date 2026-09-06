"""
The Canonical Security Model.

This is the heart of the auditor. Every vendor's config -- Cisco, Juniper, or a
brand-new one the tool has never seen -- gets normalized into this one flat set of
security facts. Compliance rules run against THIS model, not raw config text, so a
rule like "telnet must be off" works on any vendor once that vendor knows how to map
its lines into these fields.

Teaching a new vendor == teaching it how to fill these fields. Nothing else changes.
"""
from copy import deepcopy

# The canonical schema. Every field starts unknown (None) and a parser fills what it finds.
# Keep this flat and obvious -- it doubles as the contract we hand the local LLM.
_SKELETON = {
    "vendor": None,          # e.g. "cisco_ios", "acme_os"
    "hostname": None,
    "services": {
        "telnet_enabled": None,     # bool: is the telnet server/line reachable
        "ssh_enabled": None,        # bool
        "ssh_version": None,        # int: 1 or 2
        "http_server": None,        # bool: plaintext web/mgmt UI on
        "cdp_enabled": None,        # bool: discovery protocol (CDP/LLDP) broadcasting
        "snmp_communities": [],     # list of {"name": str, "access": "ro"|"rw"}
    },
    "auth": {
        "enable_secret": None,        # bool: privileged access protected by a hashed secret
        "password_encryption": None,  # bool: stored passwords encrypted at rest
        "aaa_new_model": None,        # bool: centralized authN/authZ enabled
    },
    "logging": {
        "enabled": None,   # bool
        "hosts": [],       # list of syslog server IPs
    },
    "ntp": {
        "configured": None,  # bool: trusted time source set (matters for log integrity)
        "servers": [],
    },
    "vty": {  # the remote-admin lines (vty on Cisco, mgmt line elsewhere)
        "transport_input": None,   # list e.g. ["ssh"] good, ["telnet","ssh"] bad, [] none
        "access_class": None,      # str: ACL restricting who can connect, None if open
        "exec_timeout": None,      # [min, sec]; [0,0] means "never times out" (bad)
    },
    "banner_login": None,          # bool: legal/login banner present and non-empty
    # Security-relevant lines the deterministic parser could NOT classify.
    # These are what the teach-a-vendor loop works on.
    "unknown_lines": [],
}

# Fields the LLM / teach loop is allowed to write, with the value type each expects.
# Anything outside this list is rejected -- the model can't invent fields.
WRITABLE_FIELDS = {
    "hostname": "str",
    "services.telnet_enabled": "bool",
    "services.ssh_enabled": "bool",
    "services.ssh_version": "int",
    "services.http_server": "bool",
    "services.cdp_enabled": "bool",
    "services.snmp_communities": "list",
    "auth.enable_secret": "bool",
    "auth.password_encryption": "bool",
    "auth.aaa_new_model": "bool",
    "logging.enabled": "bool",
    "logging.hosts": "list",
    "ntp.configured": "bool",
    "ntp.servers": "list",
    "vty.transport_input": "list",
    "vty.access_class": "str",
    "vty.exec_timeout": "list",
    "banner_login": "bool",
}


def empty_model():
    """A fresh canonical model with every fact unknown."""
    return deepcopy(_SKELETON)


def get_field(model, dotted):
    """Read a value by dotted path, e.g. get_field(m, 'services.telnet_enabled')."""
    node = model
    for part in dotted.split("."):
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def set_field(model, dotted, value):
    """Write a value by dotted path, creating nothing outside the known schema."""
    parts = dotted.split(".")
    node = model
    for part in parts[:-1]:
        if part not in node or not isinstance(node[part], dict):
            return False
        node = node[part]
    if parts[-1] not in node:
        return False
    node[parts[-1]] = value
    return True


LIST_FIELDS = {
    "services.snmp_communities",
    "logging.hosts",
    "ntp.servers",
    "vty.transport_input",
}


def add_or_set(model, dotted, value):
    """List-typed fields accumulate (deduped); everything else is a plain set."""
    if dotted in LIST_FIELDS and isinstance(value, list):
        cur = get_field(model, dotted) or []
        for item in value:
            if item not in cur:
                cur.append(item)
        return set_field(model, dotted, cur)
    return set_field(model, dotted, value)


def coerce(value, kind):
    """Best-effort coerce a raw value (often a string from the LLM) to the field's type."""
    if value is None:
        return None
    if kind == "bool":
        if isinstance(value, bool):
            return value
        return str(value).strip().lower() in ("true", "yes", "on", "enabled", "1")
    if kind == "int":
        try:
            return int(str(value).strip())
        except (ValueError, TypeError):
            return None
    if kind == "list":
        if isinstance(value, list):
            return value
        return [value]
    return str(value)
