# Presentation compatibility check

Read-only review on 5 September 2026 of the two user-supplied files:
C:\Users\amanr\Downloads\NIRIKSHAN_SIH_Report.docx
C:\Users\amanr\Downloads\NIRIKSHAN_SIH.pptx

| Reference | Prototype implementation |
|---|---|
| PPT slide 2, five independent signals and evidence | Original five analytical modules, work dossiers and evidence pages retained |
| PPT slide 3, weights 30/20/15/15/20 | Same defaults; local Settings save and pipeline recalculate available |
| PPT slide 3, React/TypeScript/Recharts/Leaflet | Original frontend dependencies, components and layouts retained |
| PPT slide 3, FastAPI/SQLAlchemy/SQLite/PostgreSQL | Actual FastAPI and SQLAlchemy API using SQLite for this local prototype; PostgreSQL remains architecture |
| PPT slide 3, JWT, notes and audit log | Original JWT login plus database-backed reviewer decisions and audit events |
| PPT slide 4, mock government providers | Local seeded catalog and data connectors; no API key or live government access required |
| Official MPLADS MP summary, 3 September 2026 | Added as a separate 774-record portfolio layer with national/state/house/MP analysis; aggregate rows are not presented as work-level evidence |
| Word section 5, upload flow | Repaired engine method calls, valid-row persistence, duplicate-code skipping and error reporting |
| Word section 9, four-minute demo | Command Center > Work > Evidence > Prices > Duplicates > Review > Audit, available in the original navigation |
| Word sections 8/10, remaining gaps | Real photo ingestion, cryptographic logging, national-scale services and production authorization stay outside this prototype |

The extracted PPT text specifies the same architecture and workflow and makes no fixed dashboard record-count or accuracy promise.

No modifications were made to the source PPT or DOCX. The project adds one-click local execution and repairs working-demo behavior. Initial curated demonstration values and limitations are documented in PROTOTYPE.md.
