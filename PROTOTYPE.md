# NIRIKSHAN local SIH prototype

Project: C:\Code\SIH-102

## Start and stop
Double-click **Start-Prototype.cmd**. Open http://127.0.0.1:8102.
To stop the background server, double-click **Stop-Prototype.cmd**.
Starting twice reuses this project's running server. Closing the browser does not stop the server.

On this device dependencies and the compiled frontend are already installed.
The first setup on another Windows machine needs Python 3.12+ and Node.js 22.12+ with npm on PATH, plus internet for dependency installation.
After setup, the core demo runs locally. Map background tiles and the optional Google font use internet; local photographs, APIs, charts, records and reviews do not need government connections.

The launcher runs only on 127.0.0.1, uses port 8102, and serves the original React UI and FastAPI API together.
Original two-terminal development paths remain under NIRIKSHAN/backend and NIRIKSHAN/frontend.
For the prototype settings and sample endpoints during development, use:
- Backend: .venv\Scripts\python.exe -m uvicorn prototype:app --host 127.0.0.1 --port 8000
- Frontend: npm.cmd run dev

After editing frontend source, rebuild with:
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\start.ps1 -Rebuild -NoBrowser
Stop the server first when changing backend code or rebuilding.

## Demo sign-in
Select a role card and click **Sign In to NIRIKSHAN**.

| Role | Email | Demo password |
|---|---|---|
| District Officer | district@nirikshan.gov.in | district123 |
| Administrator | admin@nirikshan.gov.in | admin123 |
| Ministry Officer | ministry@nirikshan.gov.in | ministry123 |
| State Officer | state.officer@nirikshan.gov.in | state123 |
| MP | mp@nirikshan.gov.in | mp123 |

These are local demonstration accounts from the upstream repository.

## Four-minute presentation flow
1. Official MPLADS Data: show the 774-MP national baseline, state chart, Lok Sabha/Rajya Sabha filters and MP explorer.
2. Command Center: move from the official portfolio layer to 51 seeded work-level investigation scenarios.
3. Open Construction of Community Hall, work MPLADS-BR-00481.
4. Inspect Evidence Receipts: explain the five signals and the default 30/20/15/15/20 weights.
5. Price Intelligence: inspect LED Street Light (100W), billed INR 18,500 versus reference INR 11,200.
6. Duplicate Detection: show the original curated photo/geo/text comparison scenarios.
7. Review Queue or the work dossier: submit Investigation Required, Requires Clarification, Escalate or a clearance.
8. Audit Trail: show the persisted decision.
9. Reports: generate a CSV, JSON or PDF snapshot.

Reports contain actual scoped demo records and are saved as snapshots in SQLite.
Uploading the same work codes again skips duplicates. Invalid rows produce errors without discarding earlier valid rows.
Settings persist weight changes locally; Run Pipeline applies them to the portfolio. This changes initial curated risk scores.

## Scope and reference compatibility
Source: https://github.com/QuorLum/NIRIKSHAN
Upstream commit: a08c88ab4e0122b47442731f291495c790dcfd66

This is a runnable local adaptation of the original prototype, retaining its React page components, visual design, navigation, sample photographs, domain models and analytical modules. It is not a new production implementation.

Cross-checked against:
- NIRIKSHAN_SIH.pptx, slides 2–4: five engines, weights, React/TypeScript/Recharts/Leaflet, Python/FastAPI, SQLAlchemy and SQLite/PostgreSQL architecture, JWT, human review, mock providers.
- NIRIKSHAN_SIH_Report.docx, sections 3–9: architecture, modules, database, ingestion and recommended live demo.
- Report sections 8 and 10: prototype authentication, operational audit log, incomplete photo-ingestion integration and production roadmap.

Neither supplied document was edited. The local launcher is an additional way to run the same architecture; the documents' development setup still describes separate API and Vite processes.

Preserved stack: React 19.2.8, TypeScript 6.0.2, Vite 8.2.2, Tailwind 3.4, Recharts, Leaflet, Python 3.12, FastAPI, SQLAlchemy, SQLite, RapidFuzz, NumPy/SciPy, Pillow/ImageHash, JWT/bcrypt and ReportLab. Exact resolved frontend dependencies are in package-lock.json and backend dependencies in requirements-prototype.lock.txt.

## Prototype boundaries
- The official MPLADS snapshot at `datasets/official/mplads_mp_summary_2026-09-03.csv` contains 774 MP-level records dated 3 September 2026. Its allocation, recommendation, expenditure, work-count and payment totals drive the Official MPLADS Data page.
- In that export, `Utilization %` means recommended amount divided by allocated amount. NIRIKSHAN work dossiers use expenditure divided by sanctioned amount; the prototype labels these separately.
- The official file has no work IDs, vendors, bill-of-quantity items, agencies, dates, GPS or photographs. It therefore supplies portfolio context and is not converted into manufactured work records or fraud scores.
- Government connectors and GeM references used by the work-level investigation demo are synthetic fixtures.
- The initial highlighted risk scores and photo pair metrics are curated upstream demonstration scenarios. They are not accuracy measurements or live government findings.
- Only two original sample photos are bundled. Duplicate comparisons use seeded similarity evidence, not a new automatic image-upload pipeline.
- CSV/JSON imports compute available financial signals and mark missing photo evidence Pending.
- Audit records persist in SQLite; this is not a cryptographic or blockchain ledger.
- Role switching demonstrates UI workflows; it is not production server-side authorization.
- National-scale PostgreSQL operations, connectors, OCR, object storage and deployment remain roadmap work.
- Some upstream dashboard aggregates, detail summaries and timeline values are illustrative fixtures.
- Exports support CSV, JSON and PDF. Open CSV in Excel when needed.

## Files and troubleshooting
- Presentation database: NIRIKSHAN/backend/data/prototype.db
- Engine configuration: NIRIKSHAN/backend/data/weights.json
- Startup logs: .runtime/server.log and .runtime/server-error.log
- Sample upload: samples/demo-works.csv
- Official data snapshot: datasets/official/mplads_mp_summary_2026-09-03.csv
- Backend entry point: NIRIKSHAN/backend/prototype.py
- API documentation: http://127.0.0.1:8102/docs

If port 8102 is occupied by another application, the launcher reports it and leaves that application alone.
If installation fails, verify Python/Node are installed and internet is available.
If the browser shows an old page after a rebuild, reload it.
To preserve an independent demo state, stop the prototype and copy prototype.db as a backup before experimenting.

## Verification
From NIRIKSHAN/backend:
.venv\Scripts\python.exe -m pytest tests -q

From NIRIKSHAN/frontend:
npm.cmd run build

Tests use a temporary database and do not change presentation records. Coverage includes original engines and routes, authentication, mixed-validity imports, duplicate skipping, available-signal scoring, weight validation, report types and snapshots, review/audit persistence, direct page navigation and local assets.
