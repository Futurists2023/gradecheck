## Purpose

This project now includes a local PostgreSQL database populated with normalized sample data from the CIDB Register of Contractors portal. This document is a handoff for the next software-engineering LLM that will build the full platform on top of that database.

The current database is intended as a trustworthy development seed, not the final production corpus.

## Current Status

- Database name: `cidb_contractors`
- Engine: PostgreSQL 16
- Host: `localhost`
- Port: `5432`
- Seed source: JSON files under [normalized](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized)
- Loader script: [insert_local.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/insert_local.ts)
- Normalizer script: [src/normalize.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/src/normalize.ts)

Verified loaded row counts:

- `contractors`: 74
- `contractor_gradings`: 173
- `crawl_evidence`: 74

Verified status counts:

- `Active`: 38
- `Expired`: 29
- `Suspended`: 7

## Connection Details

Use these environment variables when connecting locally:

```powershell
$env:PGHOST='localhost'
$env:PGPORT='5432'
$env:PGDATABASE='cidb_contractors'
$env:PGUSER='postgres'
$env:PGPASSWORD='postgres'
```

Equivalent DSN:

```text
postgresql://postgres:postgres@localhost:5432/cidb_contractors
```

Notes:

- PostgreSQL 16 was installed locally on this machine.
- `psql` is available at `C:\Program Files\PostgreSQL\16\bin\psql.exe`.
- The loader script assumes `PGPASSWORD` is present.

## How To Access The Database

From PowerShell with `psql`:

```powershell
$env:PGPASSWORD='postgres'
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -h localhost -p 5432 -U postgres -d cidb_contractors
```

From Node/TypeScript using `pg`:

```ts
import pg from "pg";

const client = new pg.Client({
  host: "localhost",
  port: 5432,
  database: "cidb_contractors",
  user: "postgres",
  password: "postgres",
});

await client.connect();
const result = await client.query("SELECT COUNT(*) FROM contractors");
await client.end();
```

## Schema

### `contractors`

One row per unique CRS number.

```sql
CREATE TABLE contractors (
  crs_number          TEXT PRIMARY KEY,
  contractor_name     TEXT NOT NULL,
  trading_name        TEXT,
  registration_status TEXT NOT NULL CHECK (registration_status IN ('Active', 'Suspended', 'Expired')),
  pe_flag             BOOLEAN NOT NULL DEFAULT FALSE,
  province            TEXT NOT NULL,
  city                TEXT NOT NULL,
  expiry_date         DATE,
  source_url          TEXT,
  captured_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

Field meanings:

- `crs_number`: CIDB contractor CRS identifier
- `contractor_name`: main contractor name
- `trading_name`: separate trading name when present, else null
- `registration_status`: `Active`, `Suspended`, or `Expired`
- `pe_flag`: Potentially Emerging Enterprise flag
- `province`: province from sampled search context
- `city`: city from sampled search context
- `expiry_date`: parsed from raw CIDB text
- `source_url`: CIDB contractor detail page URL
- `captured_at`: UTC timestamp from scraper run

### `contractor_gradings`

One row per contractor x grade x class combination expanded from `grade_raw`.

```sql
CREATE TABLE contractor_gradings (
  id          TEXT PRIMARY KEY,
  crs_number  TEXT NOT NULL REFERENCES contractors(crs_number) ON DELETE CASCADE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 9),
  class_code  TEXT NOT NULL,
  pe_flag     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Field meanings:

- `id`: deterministic text id in the form `<crs_number>-<ordinal>`
- `crs_number`: foreign key to `contractors`
- `grade_level`: numeric grade, 1 through 9
- `class_code`: 2-letter CIDB works class such as `GB`, `CE`, `ME`
- `pe_flag`: copied from the parent contractor record

### `crawl_evidence`

One row per normalized source record, preserving raw provenance.

```sql
CREATE TABLE crawl_evidence (
  id          SERIAL PRIMARY KEY,
  crs_number  TEXT NOT NULL,
  source_url  TEXT,
  captured_at TIMESTAMPTZ,
  grade_raw   TEXT,
  raw_text    TEXT,
  source_file TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Field meanings:

- `crs_number`: contractor CRS number
- `source_url`: source contractor detail URL
- `captured_at`: scrape capture time
- `grade_raw`: original displayed grading string
- `raw_text`: full raw flattened text retained for auditability
- `source_file`: currently `index.json`

## Indexes

The database currently includes these query-oriented indexes:

```sql
CREATE INDEX idx_gradings_class_grade ON contractor_gradings(class_code, grade_level);
CREATE INDEX idx_gradings_crs ON contractor_gradings(crs_number);
CREATE INDEX idx_contractors_province ON contractors(province);
CREATE INDEX idx_contractors_city ON contractors(city);
CREATE INDEX idx_contractors_status ON contractors(registration_status);
CREATE INDEX idx_contractors_pe_flag ON contractors(pe_flag);
CREATE INDEX idx_contractors_province_city_status ON contractors(province, city, registration_status);
```

There is also one rerun-safety unique index for evidence inserts:

```sql
CREATE UNIQUE INDEX idx_crawl_evidence_dedupe
  ON crawl_evidence (
    crs_number,
    source_url,
    captured_at,
    grade_raw,
    raw_text,
    source_file
  )
  NULLS NOT DISTINCT;
```

This exists so `insert_local.ts` can use `ON CONFLICT DO NOTHING` safely on `crawl_evidence`.

## Loader Workflow

Loader script:

- [insert_local.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/insert_local.ts)

Run command:

```powershell
npm run insert-local
```

What it does:

1. Connects to local Postgres using `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`
2. Ensures tables and indexes exist
3. Reads:
   - [normalized/contractors.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/contractors.json)
   - [normalized/contractor_gradings.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/contractor_gradings.json)
   - [normalized/crawl_evidence.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/crawl_evidence.json)
4. Inserts all rows using `INSERT ... ON CONFLICT DO NOTHING`
5. Prints inserted and total row counts
6. Closes the connection cleanly

Rerun behavior:

- First verified run inserted `74 / 173 / 74`
- Second verified run inserted `0 / 0 / 0`

## Source Data Lineage

Data flow:

1. CIDB scraper writes raw evidence and parsed flat rows to `cidb-sample/`
2. [src/normalize.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/src/normalize.ts) reads `cidb-sample/parsed/index.json`
3. Normalizer writes relational JSON to `normalized/`
4. [insert_local.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/insert_local.ts) loads those JSON files into PostgreSQL

Important source-of-truth detail:

- The normalizer uses `cidb-sample/parsed/index.json` as the single source of truth.
- The city-level parsed JSON files are not used for normalization or insertion.

## Verified Query Patterns

These query patterns already work against the live local database.

### Count checks

```sql
SELECT COUNT(*) FROM contractors;
SELECT COUNT(*) FROM contractor_gradings;
SELECT COUNT(*) FROM crawl_evidence;
```

Expected current results:

- `74`
- `173`
- `74`

### Status breakdown

```sql
SELECT registration_status, COUNT(*)
FROM contractors
GROUP BY registration_status
ORDER BY COUNT(*) DESC;
```

Expected current results:

- `Active 38`
- `Expired 29`
- `Suspended 7`

### Active Grade 1 GB contractors in Gauteng

```sql
SELECT c.crs_number, c.contractor_name, c.city, g.grade_level, g.class_code
FROM contractors c
JOIN contractor_gradings g ON c.crs_number = g.crs_number
WHERE c.province = 'Gauteng'
  AND c.registration_status = 'Active'
  AND g.class_code = 'GB'
  AND g.grade_level = 1
ORDER BY c.contractor_name;
```

Verified current result count:

- `7 rows`

Example matching contractors:

- `A-PREMIUM ELECTRICAL ENGINEERING`
- `ABAFAZIPARTNERSHIP`
- `AMAZON CARRIERS`
- `KHALIPHAA SOLUTIONS`

### Foreign key health

```sql
SELECT COUNT(*) AS orphan_gradings
FROM contractor_gradings g
LEFT JOIN contractors c ON c.crs_number = g.crs_number
WHERE c.crs_number IS NULL;
```

Expected current result:

- `0`

## Platform-Build Guidance

Recommended application-level model:

- Treat `contractors` as the canonical entity table.
- Treat `contractor_gradings` as the search/filter table for pSEO and faceted listings.
- Treat `crawl_evidence` as a provenance and audit trail table only.

Recommended common joins:

```sql
SELECT
  c.crs_number,
  c.contractor_name,
  c.trading_name,
  c.registration_status,
  c.pe_flag,
  c.province,
  c.city,
  c.expiry_date,
  g.grade_level,
  g.class_code
FROM contractors c
JOIN contractor_gradings g ON g.crs_number = c.crs_number;
```

Recommended page/filter dimensions:

- `province`
- `city`
- `registration_status`
- `pe_flag`
- `class_code`
- `grade_level`

Good initial platform features from this schema:

- contractor search results pages by province, city, class code, and grade
- contractor profile pages keyed by `crs_number`
- internal QA pages showing raw evidence from `crawl_evidence`
- freshness and staleness checks using `captured_at` and `expiry_date`

## Important Caveats

This is still a sample dataset, not a production-complete crawl.

Known limitations:

- Only 74 contractors are present.
- Data comes from four sampled city searches, not the full CIDB universe.
- `province` and `city` reflect the sampled query context used during scraping.
- `contractor_gradings.id` is deterministic for the current sample load, but it is not a global UUID strategy.
- `raw_text` is intentionally noisy because it preserves audit text from the portal detail page.
- `crawl_evidence` currently contains one row per normalized source entry, not every intermediate HTML artifact or screenshot.

Normalization assumptions already made:

- `trading_name` comes from the sixth pipe-delimited segment in `raw_text`
- `expiry_date` comes from the fifth pipe-delimited segment in `raw_text`
- `grade_raw` is split into multiple designations and expanded
- `pe_flag` is applied to all child gradings from the parent contractor row

## Files Worth Reading Before Extending

- [insert_local.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/insert_local.ts)
- [src/normalize.ts](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/src/normalize.ts)
- [normalized/summary.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/summary.json)
- [normalized/contractors.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/contractors.json)
- [normalized/contractor_gradings.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/contractor_gradings.json)
- [normalized/crawl_evidence.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/normalized/crawl_evidence.json)
- [cidb-sample/debug/discovery.json](/b:/Blue%20Ocean%20Research/south_africa/apps/cidb_data_extraction/cidb-sample/debug/discovery.json)

## Suggested Next Steps For The Full Platform

1. Move the schema into a formal migration system suitable for Supabase or plain Postgres migrations.
2. Decide whether `contractor_gradings.id` should remain deterministic text or become a surrogate UUID/bigint key.
3. Add materialized views or denormalized read models for pSEO landing pages if the dataset becomes large.
4. Add full refresh and incremental refresh strategies once the scraper expands beyond the sample cities.
5. Introduce higher-confidence provenance linking if the production pipeline needs row-to-HTML or row-to-screenshot traceability.
