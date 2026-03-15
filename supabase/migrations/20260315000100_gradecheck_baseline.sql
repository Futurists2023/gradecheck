CREATE TABLE IF NOT EXISTS contractors (
  crs_number TEXT PRIMARY KEY,
  contractor_name TEXT NOT NULL,
  trading_name TEXT,
  registration_status TEXT NOT NULL,
  pe_flag BOOLEAN NOT NULL DEFAULT FALSE,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  expiry_date DATE,
  source_url TEXT,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractors
DROP CONSTRAINT IF EXISTS contractors_registration_status_check;

ALTER TABLE contractors
ADD CONSTRAINT contractors_registration_status_check
CHECK (registration_status IN ('Active', 'Suspended', 'Expired', 'DeRegistered'));

CREATE TABLE IF NOT EXISTS contractor_gradings (
  id TEXT PRIMARY KEY,
  crs_number TEXT NOT NULL REFERENCES contractors(crs_number) ON DELETE CASCADE,
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 9),
  class_code TEXT NOT NULL,
  pe_flag BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_evidence (
  id SERIAL PRIMARY KEY,
  batch_id TEXT,
  capture_id TEXT,
  target_id TEXT,
  target_type TEXT,
  view_name TEXT,
  province TEXT,
  city TEXT,
  search_term TEXT,
  page_number INTEGER,
  crs_number TEXT NOT NULL,
  contractor_name TEXT,
  trading_name TEXT,
  registration_status TEXT,
  pe_flag BOOLEAN,
  expiry_date DATE,
  source_url TEXT,
  captured_at TIMESTAMPTZ,
  grade_raw TEXT,
  raw_text TEXT,
  source_file TEXT,
  page_title TEXT,
  page_loaded_successfully BOOLEAN,
  error_state TEXT,
  http_status INTEGER,
  retry_eligible BOOLEAN,
  html_snapshot_path TEXT,
  evidence_excerpt TEXT,
  extraction_confidence TEXT,
  extraction_completeness_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crawl_evidence
ADD COLUMN IF NOT EXISTS batch_id TEXT,
ADD COLUMN IF NOT EXISTS capture_id TEXT,
ADD COLUMN IF NOT EXISTS target_id TEXT,
ADD COLUMN IF NOT EXISTS target_type TEXT,
ADD COLUMN IF NOT EXISTS view_name TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS search_term TEXT,
ADD COLUMN IF NOT EXISTS page_number INTEGER,
ADD COLUMN IF NOT EXISTS contractor_name TEXT,
ADD COLUMN IF NOT EXISTS trading_name TEXT,
ADD COLUMN IF NOT EXISTS registration_status TEXT,
ADD COLUMN IF NOT EXISTS pe_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS page_title TEXT,
ADD COLUMN IF NOT EXISTS page_loaded_successfully BOOLEAN,
ADD COLUMN IF NOT EXISTS error_state TEXT,
ADD COLUMN IF NOT EXISTS http_status INTEGER,
ADD COLUMN IF NOT EXISTS retry_eligible BOOLEAN,
ADD COLUMN IF NOT EXISTS html_snapshot_path TEXT,
ADD COLUMN IF NOT EXISTS evidence_excerpt TEXT,
ADD COLUMN IF NOT EXISTS extraction_confidence TEXT,
ADD COLUMN IF NOT EXISTS extraction_completeness_score INTEGER;

CREATE TABLE IF NOT EXISTS crawl_failures (
  id SERIAL PRIMARY KEY,
  batch_id TEXT,
  target_id TEXT,
  stage TEXT NOT NULL,
  attempted_url TEXT NOT NULL,
  province TEXT,
  city TEXT,
  search_term TEXT,
  page_number INTEGER,
  failure_reason TEXT NOT NULL,
  http_status INTEGER,
  retry_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  extraction_completeness_score INTEGER,
  captured_at TIMESTAMPTZ,
  screenshot_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_batches (
  batch_id TEXT PRIMARY KEY,
  source_dir TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  qa_verdict TEXT NOT NULL,
  qa_report JSONB NOT NULL,
  upstream_summary JSONB,
  contractor_count INTEGER NOT NULL,
  contractor_grading_count INTEGER NOT NULL,
  crawl_evidence_count INTEGER NOT NULL,
  crawl_failure_count INTEGER NOT NULL,
  parse_error_count INTEGER NOT NULL,
  loaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_plans (
  plan_id TEXT PRIMARY KEY,
  planner_version TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  total_jobs INTEGER NOT NULL,
  manifest JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawl_jobs (
  job_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES crawl_plans(plan_id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  priority_score INTEGER NOT NULL,
  run_mode TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reasons JSONB NOT NULL,
  metrics JSONB NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  batch_id TEXT,
  upstream_run_dir TEXT,
  execution_report JSONB,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crawl_jobs
ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS batch_id TEXT,
ADD COLUMN IF NOT EXISTS upstream_run_dir TEXT,
ADD COLUMN IF NOT EXISTS execution_report JSONB,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS pipeline_cycles (
  cycle_id TEXT PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  lock_acquired BOOLEAN NOT NULL DEFAULT FALSE,
  execution_report JSONB,
  operations_report JSONB,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DELETE FROM contractor_gradings
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY crs_number, grade_level, class_code, COALESCE(pe_flag, FALSE)
        ORDER BY created_at ASC, id ASC
      ) AS duplicate_rank
    FROM contractor_gradings
  ) ranked
  WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_gradings_logical_unique
  ON contractor_gradings (crs_number, grade_level, class_code, pe_flag);

CREATE INDEX IF NOT EXISTS idx_gradings_class_grade
  ON contractor_gradings (class_code, grade_level);

CREATE INDEX IF NOT EXISTS idx_gradings_crs
  ON contractor_gradings (crs_number);

CREATE INDEX IF NOT EXISTS idx_contractors_province
  ON contractors (province);

CREATE INDEX IF NOT EXISTS idx_contractors_city
  ON contractors (city);

CREATE INDEX IF NOT EXISTS idx_contractors_status
  ON contractors (registration_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_evidence_dedupe
  ON crawl_evidence (crs_number, source_url, captured_at, grade_raw, raw_text, source_file)
  NULLS NOT DISTINCT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_evidence_capture_id_unique
  ON crawl_evidence (capture_id)
  WHERE capture_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_failures_dedupe
  ON crawl_failures (
    batch_id,
    target_id,
    stage,
    attempted_url,
    province,
    city,
    search_term,
    page_number,
    failure_reason,
    http_status,
    retry_eligible,
    extraction_completeness_score,
    captured_at,
    screenshot_path
  )
  NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status_priority
  ON crawl_jobs (status, priority_score DESC, created_at ASC);
