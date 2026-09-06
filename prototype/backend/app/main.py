"""
FastAPI app for the Multi-Vendor Network Security Compliance Auditor.

Everything here runs locally: deterministic parsing, a local Ollama model for unknown
vendors, rule checks, SQLite persistence, and offline PDF export. No config data ever
leaves the machine -- built for the air-gapped networks NTRO cares about.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from . import store, llm
from .audit import run_audit
from .models import AuditRequest, TeachRequest
from .rules.engine import load_pack
from .report import build_pdf
from .canonical import WRITABLE_FIELDS, coerce

app = FastAPI(title="Network Security Compliance Auditor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local demo; lock down in production
    allow_methods=["*"],
    allow_headers=["*"],
)

_FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "..", "fixtures")
_FIXTURES = [
    {"name": "cisco-ios.cfg", "label": "Cisco IOS router (known vendor)",
     "note": "Deterministic parser handles this instantly."},
    {"name": "cisco-ios-hardened.cfg", "label": "Cisco IOS router (hardened)",
     "note": "The same device after applying the fixes."},
    {"name": "acme-os.cfg", "label": "AcmeOS firewall (never seen before)",
     "note": "No parser exists -> the local LLM learns it live."},
]


@app.on_event("startup")
def _startup():
    store.init_db()


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "ollama": llm.health(),
        "rules": len(load_pack()["rules"]),
        "vendors_taught": store.list_vendors(),
    }


@app.post("/api/audit")
def audit(req: AuditRequest):
    if not req.config.strip():
        raise HTTPException(400, "Empty config")
    result = run_audit(req.config, req.vendor_hint)
    result["audit_id"] = store.save_audit(result)
    return result


@app.post("/api/teach")
def teach(req: TeachRequest):
    vendor = req.vendor.strip().lower().replace(" ", "_")
    if not vendor:
        raise HTTPException(400, "Vendor name required")
    clean = []
    for m in req.mappings:
        if m.field not in WRITABLE_FIELDS:
            continue
        clean.append({
            "match_keywords": m.match_keywords.strip(),
            "field": m.field,
            "value": coerce(m.value, WRITABLE_FIELDS[m.field]),
            "capture_regex": m.capture_regex,
        })
    if not clean:
        raise HTTPException(400, "No valid mappings to save")
    n = store.save_mappings(vendor, clean)
    return {"saved": n, "vendor": vendor}


@app.get("/api/vendors")
def vendors():
    return {"builtin": ["cisco_ios"], "taught": store.list_vendors()}


@app.get("/api/rules")
def rules():
    pack = load_pack()
    return {"pack": pack["meta"], "rules": [
        {k: r.get(k) for k in ("id", "title", "severity", "reference", "rationale")}
        for r in pack["rules"]]}


@app.get("/api/history")
def history():
    return {"audits": store.list_audits()}


@app.post("/api/report/pdf")
def report_pdf(req: AuditRequest):
    if not req.config.strip():
        raise HTTPException(400, "Empty config")
    result = run_audit(req.config, req.vendor_hint)
    pdf = build_pdf(result)
    host = (result["device"].get("hostname") or "device").replace(" ", "_")
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{host}-compliance.pdf"'})


@app.get("/api/fixtures")
def fixtures():
    return {"fixtures": _FIXTURES}


@app.get("/api/fixtures/{name}")
def fixture(name: str):
    if name not in {f["name"] for f in _FIXTURES}:
        raise HTTPException(404, "Unknown fixture")
    path = os.path.join(_FIXTURES_DIR, name)
    if not os.path.exists(path):
        raise HTTPException(404, "Fixture file missing")
    with open(path) as f:
        return {"name": name, "config": f.read()}


# Serve the built frontend if it exists (single-origin production/demo mode).
_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(_DIST):
    app.mount("/", StaticFiles(directory=_DIST, html=True), name="frontend")
