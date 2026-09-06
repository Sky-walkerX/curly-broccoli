"""
The streaming extractor is the one genuinely fragile piece of the live-learning path:
it pulls completed mapping objects out of a half-arrived JSON buffer while the local
model is still writing it. These tests pin the cases that actually bite -- objects
split mid-token across chunks, braces and quotes inside string values, and junk that
must not stall the ones after it.
"""
import json
import pytest

from app.streamjson import MappingStream

M1 = {"line": "service telnet state enabled port 23", "field": "services.telnet_enabled",
      "value": True, "match_keywords": "state enabled", "confidence": 1.0,
      "rationale": "Telnet service enabled"}
M2 = {"line": "service ssh state enabled protocol-version 2", "field": "services.ssh_enabled",
      "value": True, "match_keywords": "state enabled", "confidence": 1.0,
      "rationale": "SSH enabled"}


def envelope(*objs, closed=True):
    body = ",".join(json.dumps(o) for o in objs)
    return '{"mappings":[' + body + (']}' if closed else '')


def test_emits_a_complete_object():
    s = MappingStream()
    assert s.feed(envelope(M1, closed=False)) == [M1]


def test_emits_each_object_exactly_once_across_feeds():
    s = MappingStream()
    first = s.feed(envelope(M1, closed=False))
    second = s.feed("," + json.dumps(M2) + "]}")
    assert first == [M1]
    assert second == [M2]


def test_object_split_across_chunk_boundaries():
    """The realistic case: Ollama hands us a few characters at a time."""
    s = MappingStream()
    got = []
    for ch in envelope(M1, M2):
        got.extend(s.feed(ch))
    assert got == [M1, M2]


def test_nothing_emitted_until_an_object_closes():
    s = MappingStream()
    partial = envelope(M1, closed=False)[:-8]
    assert s.feed(partial) == []


def test_braces_and_quotes_inside_string_values():
    tricky = dict(M1, rationale='has {braces} and an \\"escaped\\" quote')
    raw = '{"mappings":[{"line":"x","field":"f","value":true,' \
          '"rationale":"has {braces} and an \\"escaped\\" quote"}]}'
    s = MappingStream()
    out = s.feed(raw)
    assert len(out) == 1
    assert out[0]["rationale"] == 'has {braces} and an "escaped" quote'


def test_malformed_object_is_skipped_without_blocking_later_ones():
    s = MappingStream()
    raw = '{"mappings":[{"line":"a","field":,,,},' + json.dumps(M2) + ']}'
    out = s.feed(raw)
    assert out == [M2]


def test_ignores_content_before_the_mappings_array():
    s = MappingStream()
    assert s.feed('{"note":{"nested":"object"},"mappings":[') == []
    assert s.feed(json.dumps(M1) + "]}") == [M1]


def test_no_mappings_key_yet_emits_nothing():
    s = MappingStream()
    assert s.feed('{"map') == []


def test_stops_cleanly_at_end_of_array():
    s = MappingStream()
    out = s.feed(envelope(M1) + '  trailing noise {"line":"nope"}')
    assert out == [M1]
