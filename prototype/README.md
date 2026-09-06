# Multi-Vendor Network Security Compliance Auditor

**SIH26155 (NTRO) — working prototype.** Upload a router/firewall config, get an
instant CIS/NIST/STIG pass-fail report with copy-paste fixes. The winning angle: it
**learns a new vendor live** using a **local, offline LLM** — no cloud, air-gap friendly.

## The one idea that makes it work: a Canonical Security Model

Every vendor's config is normalized into one flat set of security facts (telnet on/off,
ssh version, snmp communities, enable secret, logging, ntp, admin-line ACL, timeout…).
**Compliance rules run against that model, not raw text**, so a rule like "telnet must be
off" works on *any* vendor once that vendor knows how to map its lines into the model.

**Teaching a new vendor = teaching it how to fill those fields.** That is exactly what the
local LLM + the "teach it" panel do — with no code change.

## How a config is handled (hybrid, deterministic-first)

1. **Deterministic Cisco IOS parser** runs first — fast, exact, offline.
2. A previously **taught vendor**'s saved mappings (also deterministic).
3. Otherwise it's a **vendor we've never seen** → the local model (Ollama `qwen2.5:3b`)
   proposes how each line maps into the canonical model. A keyword heuristic runs
   alongside as a cross-check + offline fallback, and **a human confirms** before anything
   is saved. Confirmed mappings persist in SQLite → next time it parses deterministically.

```
 React/Vite UI ── /api ──► FastAPI
   upload config            deterministic parser ─┐
   red/green report         local LLM (unknown) ──┼─► Canonical Security Model ─► rule engine ─► report
   teach-a-vendor panel     learned mappings ─────┘        (YAML: CIS/NIST/STIG)      + PDF (ReportLab)
                            SQLite: learned vendors + audit history
   Everything runs locally. No config data leaves the machine.
```

## Run it

```bash
cd prototype
./run.sh            # builds the UI, starts everything on http://127.0.0.1:8099
./run.sh --reset    # same, but wipe learned vendors first (for a fresh live-learn demo)
```

Prereqs: Python 3.11+, Node 18+, and [Ollama](https://ollama.com) with a small model
pulled (`ollama pull qwen2.5:3b`). Without Ollama the app still runs — unknown-vendor
learning falls back to the offline keyword heuristic. Override the model with
`OLLAMA_MODEL=qwen3.5:9b ./run.sh`.

Dev mode (hot reload): run the API with `uvicorn app.main:app --app-dir backend --port 8099`
and the UI with `cd frontend && npm run dev` (Vite proxies `/api` to :8099).

## The 3-act demo

1. **Known vendor** — load *Cisco IOS (known)* → instant 52% report, 2 high-severity fails
   (telnet, weak SNMP), each with a copy-paste fix. Load *Cisco IOS (hardened)* → 100%.
2. **Learn a new vendor live** — load *AcmeOS (never seen)*. No parser exists, so the local
   model reads a syntax it has never seen and proposes the mappings; the panel shows which
   the deterministic cross-check **confirmed**. Click **Teach & re-audit**.
3. **It's now a known vendor** — the same device re-parses **deterministically and
   instantly** ("Learned vendor · match 100%"), full report, offline. No code was changed.

## Stack

React + Vite + Tailwind · FastAPI + Pydantic · Ollama (local model) · YAML rule packs ·
ReportLab (offline PDF) · SQLite. No cloud APIs anywhere.

## Honest limitations (for Q&A)

- The LLM proposes; a human confirms. We never trust the model blindly — that human step
  is the security control, and it's how the tool stays auditable.
- The rule pack here is a representative CIS/NIST/STIG **subset** (13 checks), not the full
  benchmark. The engine is data-driven (YAML), so packs extend without code changes.
- The deterministic parser covers Cisco IOS today; other known vendors are added the same
  way any taught vendor is.
