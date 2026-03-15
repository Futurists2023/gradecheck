# Supabase Production Migration

This repo now supports a narrow production migration from local PostgreSQL to Supabase-managed Postgres.

## Goal

Keep the current GradeCheck app and pipeline behavior the same while moving database hosting to Supabase.

- The app keeps using server-side `pg` queries.
- The pipeline keeps using direct Postgres access.
- No Supabase Auth, RLS, or browser-side Supabase client work is required for this migration.
- The generic Supabase SSR/Auth quickstart is intentionally out of scope for this phase.

## 1. Provision Supabase Postgres

Create a Supabase project and obtain:

- the pooled or session `DATABASE_URL`
- an optional `DIRECT_DATABASE_URL` for pipeline/admin tasks if you want a separate direct connection

## 2. Apply the baseline schema

Apply the SQL migration in [supabase/migrations/20260315000100_gradecheck_baseline.sql](/b:/Blue%20Ocean%20Research/south_africa/apps/gradeverify/supabase/migrations/20260315000100_gradecheck_baseline.sql) to the target Supabase database before running the app or any pipeline command.

This migration defines:

- `contractors`
- `contractor_gradings`
- `crawl_evidence`
- `crawl_failures`
- `crawl_batches`
- `crawl_plans`
- `crawl_jobs`
- `pipeline_cycles`

## 3. Configure production env

Use these env vars in production:

```env
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
DATABASE_SSL=true
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_SITE_NAME=GradeCheck
```

Notes:

- `DATABASE_URL` is now the canonical connection string for the app.
- `DIRECT_DATABASE_URL` is optional and falls back to `DATABASE_URL` if omitted.
- The legacy `PGHOST` / `PGPORT` / `PGDATABASE` / `PGUSER` / `PGPASSWORD` values remain as local-development fallback only.

## 4. Load existing data

Recommended order:

1. export the current local Postgres data
2. apply the Supabase baseline migration to a clean target
3. import the current dataset into Supabase
4. run the pipeline audit and planning commands against Supabase

## 5. Verify parity

Run these checks against the Supabase-backed environment:

```bash
npm run db:smoke-test
npm run pipeline:audit
npm run pipeline:plan-crawl
PIPELINE_EXECUTION_DRY_RUN=true npm run pipeline:run-cycle
npm run build
npx tsc --noEmit
```

Then spot-check:

- homepage
- one province page
- one city page
- one leaf page
- one contractor profile
- `/api/search`

## Important behavior change

The loader and pipeline no longer create schema implicitly at runtime.

If the schema is missing, commands now fail with an explicit message telling you to apply migrations first. This is intentional so Supabase production stays predictable and DDL is no longer hidden inside routine data loads.

## Current project details note

If you use a Supabase Postgres password that contains characters like `@` or spaces, it must be URL-encoded inside `DATABASE_URL`.

Also note that a direct database host may resolve differently depending on your local network and IPv6 availability. If `npm run db:smoke-test` fails with host resolution or network errors, fetch the exact connection string from the Supabase dashboard again and verify whether you should use the direct host or the Supavisor/pooler host for your environment.
