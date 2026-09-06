"""
SQLite persistence: learned vendor mappings + audit history.

Two jobs:
  1. Remember how to parse a vendor once an admin has taught it, so "learn a new vendor"
     survives a restart -- teach it once, it's known forever (no code change).
  2. Keep a history of audits so the dashboard can show trend / past runs.
"""
import os
import json
import sqlite3
import time

_DB_PATH = os.environ.get(
    "AUDITOR_DB",
    os.path.join(os.path.dirname(__file__), "..", "data", "auditor.db"),
)


def _conn():
    os.makedirs(os.path.dirname(os.path.abspath(_DB_PATH)), exist_ok=True)
    c = sqlite3.connect(_DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with _conn() as c:
        c.execute("""
            CREATE TABLE IF NOT EXISTS learned_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vendor TEXT NOT NULL,
                match_keywords TEXT NOT NULL,
                field TEXT NOT NULL,
                value_json TEXT NOT NULL,
                capture_regex TEXT,
                created_at REAL NOT NULL
            )""")
        c.execute("""
            CREATE TABLE IF NOT EXISTS audits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hostname TEXT,
                vendor TEXT,
                vendor_status TEXT,
                score INTEGER,
                passed INTEGER,
                failed INTEGER,
                ts REAL NOT NULL,
                report_json TEXT NOT NULL
            )""")


# ----- learned vendor mappings -----

def save_mappings(vendor, mappings):
    """Persist confirmed line->field mappings for a vendor. Replaces that vendor's set."""
    now = time.time()
    with _conn() as c:
        c.execute("DELETE FROM learned_mappings WHERE vendor = ?", (vendor,))
        for m in mappings:
            c.execute(
                "INSERT INTO learned_mappings (vendor, match_keywords, field, value_json, capture_regex, created_at) "
                "VALUES (?,?,?,?,?,?)",
                (vendor, m["match_keywords"], m["field"], json.dumps(m.get("value")),
                 m.get("capture_regex"), now),
            )
    return len(mappings)


def get_mappings(vendor):
    with _conn() as c:
        rows = c.execute(
            "SELECT match_keywords, field, value_json, capture_regex FROM learned_mappings WHERE vendor = ?",
            (vendor,),
        ).fetchall()
    return [
        {"match_keywords": r["match_keywords"], "field": r["field"],
         "value": json.loads(r["value_json"]), "capture_regex": r["capture_regex"]}
        for r in rows
    ]


def list_vendors():
    with _conn() as c:
        rows = c.execute(
            "SELECT vendor, COUNT(*) n, MAX(created_at) learned_at "
            "FROM learned_mappings GROUP BY vendor ORDER BY learned_at DESC"
        ).fetchall()
    return [{"vendor": r["vendor"], "rules": r["n"], "learned_at": r["learned_at"]} for r in rows]


# ----- audit history -----

def save_audit(report):
    dev = report.get("device", {})
    summ = report.get("report", {})
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO audits (hostname, vendor, vendor_status, score, passed, failed, ts, report_json) "
            "VALUES (?,?,?,?,?,?,?,?)",
            (dev.get("hostname"), dev.get("vendor"), dev.get("vendor_status"),
             summ.get("score"), summ.get("passed"), summ.get("failed"),
             time.time(), json.dumps(report)),
        )
        return cur.lastrowid


def list_audits(limit=25):
    with _conn() as c:
        rows = c.execute(
            "SELECT id, hostname, vendor, vendor_status, score, passed, failed, ts "
            "FROM audits ORDER BY ts DESC LIMIT ?", (limit,),
        ).fetchall()
    return [dict(r) for r in rows]
