NIRIKSHAN repository demo dataset
=================================

This repository does not ship a standalone real MPLADS dataset. Its README calls the data
a canonical demo dataset, and backend/services/seeder.py generates it deterministically.
These exports contain that synthetic seed data from commit a08c88ab4e0122b47442731f291495c790dcfd66.

Start with nirikshan_works_with_risk.csv for a simple presentation-ready table.
Use the individual CSV files for the relational data model.
nirikshan-repository-seed.db contains the same data in SQLite.
The users table is intentionally excluded because it contains password hashes.
Two JPG files are the only site-photo assets committed to the repository.
All government connector counts, project records, risk scores, GeM prices and duplicate
metrics are demonstration fixtures, not fetched live government records.
