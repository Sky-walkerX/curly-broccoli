# Smart India Hackathon 2026 — Software Edition Entry

This repo holds our SIH 2026 submission work: research, problem-statement analysis, and the idea
presentations. We are competing in the **Software** edition.

## Current status (as of 2026-09-06)
- **Done:** field research + crowd model over all 176 software PS; ranked battle-plan artifact published;
  two PS chosen (SIH26155, SIH26145); both idea decks built, alignment-QA'd slide by slide at 150 DPI,
  and rendered to final 6-page PDFs; demo-video QR added to both title slides.
- **Open to-dos before submission:** (1) fill team name/ID on both title slides (placeholders live);
  (2) record the demo video, then swap the QR link off the placeholder (see Demo-video QR below);
  (3) verify the Gartner misconfiguration stat on SIH26155 slide 6.
- **Next build step:** the working **prototype** for the magic demo. Plan to start with **SIH26155**
  (compliance auditor) — its "upload a config → instant pass/fail + fix" flow is the cleaner demo.
  Nothing is coded yet.

## Who we are (team profile)
- Strong at **AI/ML + deep learning**, **full-stack web/app**, and **cybersecurity / systems**.
- Good hackathon shippers, but this is our **first SIH**. **No specialist domain mentor.**
- Strategy: **maximize win probability via crowd arbitrage** (pick thin-crowd problem statements that
  match our stack, rather than crowded consumer themes).
- Team name / ID / members: **PLACEHOLDER** — fill on the title slides before submitting.

## The two problem statements we chose
Both are **NTRO** (National Technical Research Organisation): low competition, exact skill match,
public/offline data. We submit the SAME team to both (rules allow max 2 PS per team).

### Primary — SIH26155 · Multi-Vendor Network Security Compliance Auditor
- **Winning angle:** "it learns a new vendor live." A **local, offline LLM** normalizes *any* vendor's
  router/firewall config into one canonical schema (not brittle regex). Unknown config lines go to a
  **"teach it" GUI** where the admin tags them, so it learns new vendors with no code change.
- **Build:** upload config → normalize → check against **CIS / NIST / STIG** → per-device report with
  pass/fail, severity, and copy-paste fix commands. Hybrid: deterministic parser first, local LLM only
  for unknown lines.
- **Magic demo:** drop in a Cisco config → instant red/green report + fixes. Then a never-seen vendor →
  tag two lines in the GUI → re-run → it now parses. "It learned a new vendor on stage."
- **Offline stack:** React + FastAPI + Ollama (local model) + ciscoconfparse/NAPALM + YAML rule packs +
  ReportLab PDF + SQLite.
- **Main risk:** local-model parse accuracy. Mitigation: deterministic-first hybrid; demo 2 known vendors
  + 1 learned-live.

### Secondary — SIH26145 · AI Threat Detection in Unidirectional IP Traffic
- **Winning angle:** "catch malware inside encrypted traffic without decrypting it," using **JA3/JA4 TLS
  fingerprints + packet-size/timing** — the PS's hardest ask, which most teams skip. Plus a real
  **streaming** pipeline (not a batch script) with a stated throughput target.
- **Build:** streaming pipeline over one-way traffic with a **separate detector per threat** (entropy for
  DDoS, periodicity for C2 beaconing, n-gram entropy for DGA/DNS-tunnel, JA3/JA4 for encrypted malware,
  fan-out for scans, byte-ratio asymmetry for exfil). Every alert carries its evidence + confidence.
- **Magic demo:** live dashboard replaying real traffic; alerts pop in real time; showstopper = malware
  flagged inside encrypted TLS from its fingerprint alone, no decryption.
- **Offline stack:** Scapy/PyShark + replay engine + flow/packet features + lightweight local ML
  (IsolationForest/GBM per class) + Streamlit or React+FastAPI live feed. Datasets: CIC-IDS-2017/2018,
  CTU-13. No cloud.
- **Main risk:** making it feel live + honest encrypted-malware accuracy. Mitigation: controlled-rate
  replay; state scope plainly.

Both share PCAP/flow parsing + Python + dashboard stack, so building one advances the other.

## The deliverable: the Idea PPT (per PS)
- **Official template, 6 slides max including the title, submit as PDF only.** No PPT/Word on the portal.
  Template files: `research/SIH2026-IDEA-Presentation-Format.pptx`.
- Required sections in order: (1) Title, (2) Proposed Solution, (3) Technical Approach,
  (4) Feasibility & Viability, (5) Impact & Benefits, (6) Research & References.
- **How we want our decks (non-negotiable):**
  - **Impact-first.** The impact we cause is the most important thing — concrete, human, quantified
    where honest. Never generic. Verify any cited stat before submitting.
  - **Readability.** Points not paragraphs. Clear hierarchy. Bold the keywords. No wall of buzzwords.
  - **Diagrams.** A clean architecture/flow diagram per deck that shows the real mechanism.
  - **Proper narrative flow** that conveys *our* thinking (problem → insight → solution → impact),
    not a list of technical words.
- Decks are built as 16:9 HTML and rendered to PDF with headless Chrome
  (`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --print-to-pdf`),
  wrapped by `decks/render.sh`. No LibreOffice / python-pptx installed here.
- **Demo-video QR** sits on each title slide (right side), generated by `decks/make_qr.py` into
  `decks/qr-demo.svg` (both decks reference it). It currently encodes a **PLACEHOLDER**
  (`youtu.be/your-demo-id`). After recording the demo: run
  `python3 decks/make_qr.py "https://youtu.be/REAL_ID"`, update the `.dq-url` text in both decks'
  HTML, then `./render.sh`. **Do not submit with the placeholder QR live.**

## Key facts & rules (verified Sept 2026)
- **Idea submission deadline: 30 September 2026** (portal shows this per PS; guidelines PDF mentions
  15 Sep for SPOC nomination — confirm with SPOC).
- 233 PS total (176 software, 57 hardware). Each PS caps at **500 ideas** then freezes. Max **2 PS/team**.
- Only **4–5 teams shortlisted per PS** for the Dec 2026 Grand Finale; ~1–2 win ₹1.5L. **96%** of PS
  crowned a winner in 2024 — a thin-crowd PS is close to a reserved slot if we reach the finale.
- NTRO expects **offline / air-gapped** solutions — design local-model-only, no cloud APIs.
- Official evaluation criteria: novelty, complexity, clarity/format, feasibility, practicability,
  sustainability, scale of impact, user experience, future scope. Community weighting: innovation 25%,
  problem understanding 20%, feasibility 20%, impact/scalability 20%, presentation 15%.

## Where things are
- `research/` — official templates, guidelines text, full PS descriptions (`candidates_full.txt`).
- `corpus/raw/` — parsed 233 PS (`sih2026_all_ps.json`), crowd model outputs, 2024/25 winner tables.
- `corpus/analysis/sih-patterns.md` — the "what wins here" read.
- Ranked battle-plan artifact: https://claude.ai/code/artifact/24e9820f-9661-4ac6-b381-b47df5099c66
- `decks/` — the idea presentations. `SIH26155-compliance-auditor.{html,pdf}` and
  `SIH26145-threat-detection.{html,pdf}` (HTML is the editable source, PDF is what gets submitted);
  `render.sh` (HTML→PDF for both), `make_qr.py` + `qr-demo.svg` + `qr-url.txt` (the demo QR).

## Conventions
- **Offline-first.** No cloud API calls in any prototype design; local/open models only.
- Impact claims must be defensible in expert NTRO Q&A. Facts over buzzwords, always.
- Keep decks to the 6 mandated sections; never add slides.
