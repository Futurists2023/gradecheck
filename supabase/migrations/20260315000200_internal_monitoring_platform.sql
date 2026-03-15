CREATE TABLE IF NOT EXISTS monitoring_page_catalog (
  href TEXT PRIMARY KEY,
  route_type TEXT NOT NULL,
  template_cluster TEXT NOT NULL,
  intended_index_state TEXT NOT NULL,
  quality_qualified BOOLEAN NOT NULL DEFAULT FALSE,
  within_budget BOOLEAN NOT NULL DEFAULT FALSE,
  current_effective_index_state TEXT NOT NULL,
  default_priority NUMERIC(5,2) NOT NULL DEFAULT 0.70,
  effective_priority NUMERIC(5,2) NOT NULL DEFAULT 0.70,
  page_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_gsc_daily (
  snapshot_date DATE NOT NULL,
  href TEXT NOT NULL,
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  indexed BOOLEAN NOT NULL DEFAULT FALSE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(12,6) NOT NULL DEFAULT 0,
  average_position NUMERIC(12,4),
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, href)
);

CREATE TABLE IF NOT EXISTS monitoring_ga4_daily (
  snapshot_date DATE NOT NULL,
  href TEXT NOT NULL,
  sessions INTEGER NOT NULL DEFAULT 0,
  engaged_sessions INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, href)
);

CREATE TABLE IF NOT EXISTS monitoring_action_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  event_date DATE NOT NULL,
  session_id TEXT NOT NULL,
  href TEXT NOT NULL,
  route_type TEXT,
  event_name TEXT NOT NULL,
  referrer_href TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monitoring_page_daily_rollups (
  snapshot_date DATE NOT NULL,
  href TEXT NOT NULL,
  route_type TEXT NOT NULL,
  template_cluster TEXT NOT NULL,
  intended_index_state TEXT NOT NULL,
  current_effective_index_state TEXT NOT NULL,
  submitted_pages INTEGER NOT NULL DEFAULT 0,
  indexed_pages INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(12,6) NOT NULL DEFAULT 0,
  average_position NUMERIC(12,4),
  sessions INTEGER NOT NULL DEFAULT 0,
  engaged_sessions INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  next_step_sessions INTEGER NOT NULL DEFAULT 0,
  low_value_exit_sessions INTEGER NOT NULL DEFAULT 0,
  source_click_sessions INTEGER NOT NULL DEFAULT 0,
  page_view_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, href)
);

CREATE TABLE IF NOT EXISTS monitoring_cluster_daily_rollups (
  snapshot_date DATE NOT NULL,
  route_type TEXT NOT NULL,
  template_cluster TEXT NOT NULL,
  intended_index_pages INTEGER NOT NULL DEFAULT 0,
  effective_index_pages INTEGER NOT NULL DEFAULT 0,
  submitted_pages INTEGER NOT NULL DEFAULT 0,
  indexed_pages INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC(12,6) NOT NULL DEFAULT 0,
  average_position NUMERIC(12,4),
  sessions INTEGER NOT NULL DEFAULT 0,
  engaged_sessions INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  next_step_sessions INTEGER NOT NULL DEFAULT 0,
  low_value_exit_sessions INTEGER NOT NULL DEFAULT 0,
  source_click_sessions INTEGER NOT NULL DEFAULT 0,
  page_view_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (snapshot_date, route_type)
);

CREATE TABLE IF NOT EXISTS monitoring_cluster_reviews (
  review_date DATE NOT NULL,
  route_type TEXT NOT NULL,
  template_cluster TEXT NOT NULL,
  window_days INTEGER NOT NULL,
  metrics JSONB NOT NULL,
  previous_metrics JSONB,
  gates JSONB NOT NULL,
  triggered_rules JSONB NOT NULL,
  reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_verdict TEXT NOT NULL,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_date, route_type, window_days)
);

CREATE TABLE IF NOT EXISTS monitoring_action_approvals (
  id BIGSERIAL PRIMARY KEY,
  template_cluster TEXT NOT NULL,
  route_type TEXT NOT NULL,
  action_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  actor TEXT NOT NULL,
  note TEXT,
  review_date DATE,
  effective_from DATE NOT NULL,
  expires_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_action_events_date_href
  ON monitoring_action_events (event_date, href);

CREATE INDEX IF NOT EXISTS idx_monitoring_action_events_route_type
  ON monitoring_action_events (route_type, event_name, event_date);

CREATE INDEX IF NOT EXISTS idx_monitoring_cluster_reviews_latest
  ON monitoring_cluster_reviews (route_type, window_days, review_date DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_action_approvals_route_type
  ON monitoring_action_approvals (route_type, effective_from DESC);
