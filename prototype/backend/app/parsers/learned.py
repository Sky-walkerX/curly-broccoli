"""
Learned-vendor parser.

Once an admin has taught a vendor (confirmed the LLM's line->field proposals), those
mappings live in SQLite. This module replays them: for a config from a taught vendor it
produces a Canonical Security Model deterministically -- no LLM needed on re-run. That's
what makes "it learned a new vendor" real instead of a one-off party trick.
"""
import re
from ..canonical import empty_model, add_or_set, WRITABLE_FIELDS, coerce


def _match(line, mapping):
    """Does this config line correspond to a learned mapping?"""
    kw = (mapping.get("match_keywords") or "").lower().strip()
    if not kw:
        return False
    # every whitespace-separated keyword token must appear in the line (order-free)
    return all(tok in line.lower() for tok in kw.split())


def detect(text, mappings):
    """Confidence (0..1) that this config belongs to the vendor these mappings describe."""
    if not mappings:
        return 0.0
    lines = [l for l in text.splitlines() if l.strip()]
    matched = sum(1 for mp in mappings if any(_match(l, mp) for l in lines))
    return matched / len(mappings)


def parse(text, vendor, mappings):
    """Apply learned mappings to build the canonical model."""
    m = empty_model()
    m["vendor"] = vendor
    lines = [l for l in text.splitlines() if l.strip()]
    for mp in mappings:
        field = mp["field"]
        if field not in WRITABLE_FIELDS:
            continue
        for line in lines:
            if not _match(line, mp):
                continue
            value = mp.get("value")
            cap = mp.get("capture_regex")
            if cap:
                try:
                    found = re.search(cap, line)
                    if found and found.groups():
                        value = coerce(found.group(1), WRITABLE_FIELDS[field])
                except re.error:
                    pass
            add_or_set(m, field, value)
            break  # first matching line wins for this mapping
    return m
