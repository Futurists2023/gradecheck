import { Pool, type PoolClient } from "pg";

import {
  createDatabasePool,
  getConfiguredDatabaseLabel,
  getLegacyDatabasePoolConfig,
} from "@/lib/postgres";
import { loadLocalEnv } from "@/lib/load-local-env";

type ContractorRow = {
  crs_number: string;
  contractor_name: string;
  trading_name: string | null;
  registration_status: string;
  pe_flag: boolean;
  province: string;
  city: string;
  expiry_date: string | null;
  source_url: string | null;
  captured_at: string | null;
};

type ContractorGradingRow = {
  id: string;
  crs_number: string;
  grade_level: number;
  class_code: string;
  pe_flag: boolean;
};

type CrawlEvidenceRow = {
  batch_id: string | null;
  capture_id: string | null;
  target_id: string | null;
  target_type: string | null;
  view_name: string | null;
  province: string | null;
  city: string | null;
  search_term: string | null;
  page_number: number | null;
  crs_number: string;
  contractor_name: string | null;
  trading_name: string | null;
  registration_status: string | null;
  pe_flag: boolean | null;
  expiry_date: string | null;
  source_url: string | null;
  captured_at: string | null;
  grade_raw: string | null;
  raw_text: string | null;
  source_file: string | null;
  page_title: string | null;
  page_loaded_successfully: boolean | null;
  error_state: string | null;
  http_status: number | null;
  retry_eligible: boolean | null;
  html_snapshot_path: string | null;
  evidence_excerpt: string | null;
  extraction_confidence: string | null;
  extraction_completeness_score: number | null;
};

type CrawlFailureRow = {
  batch_id: string | null;
  target_id: string | null;
  stage: string;
  attempted_url: string;
  province: string | null;
  city: string | null;
  search_term: string | null;
  page_number: number | null;
  failure_reason: string;
  http_status: number | null;
  retry_eligible: boolean;
  extraction_completeness_score: number | null;
  captured_at: string | null;
  screenshot_path: string | null;
};

type CrawlBatchRow = {
  batch_id: string;
  source_dir: string;
  generated_at: string;
  qa_verdict: string;
  qa_report: unknown;
  upstream_summary: unknown;
  contractor_count: number;
  contractor_grading_count: number;
  crawl_evidence_count: number;
  crawl_failure_count: number;
  parse_error_count: number;
  loaded_at: string | null;
};

type MigrationReport = {
  sourceDatabase: string;
  targetDatabase: string;
  moved: {
    contractors: number;
    contractor_gradings: number;
    crawl_evidence: number;
    crawl_failures: number;
    crawl_batches: number;
  };
};

const CHUNK_SIZE = 250;

function chunk<T>(rows: T[], size = CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function fetchSourceData(sourcePool: Pool) {
  const [
    contractors,
    gradings,
    evidence,
    failures,
    batches,
  ] = await Promise.all([
    sourcePool.query<ContractorRow>(`
      SELECT
        crs_number,
        contractor_name,
        trading_name,
        registration_status,
        pe_flag,
        province,
        city,
        expiry_date::text,
        source_url,
        captured_at::text
      FROM contractors
      ORDER BY crs_number ASC
    `),
    sourcePool.query<ContractorGradingRow>(`
      SELECT
        id,
        crs_number,
        grade_level,
        class_code,
        pe_flag
      FROM contractor_gradings
      ORDER BY crs_number ASC, grade_level ASC, class_code ASC
    `),
    sourcePool.query<CrawlEvidenceRow>(`
      SELECT
        batch_id,
        capture_id,
        target_id,
        target_type,
        view_name,
        province,
        city,
        search_term,
        page_number,
        crs_number,
        contractor_name,
        trading_name,
        registration_status,
        pe_flag,
        expiry_date::text,
        source_url,
        captured_at::text,
        grade_raw,
        raw_text,
        source_file,
        page_title,
        page_loaded_successfully,
        error_state,
        http_status,
        retry_eligible,
        html_snapshot_path,
        evidence_excerpt,
        extraction_confidence,
        extraction_completeness_score
      FROM crawl_evidence
      ORDER BY id ASC
    `),
    sourcePool.query<CrawlFailureRow>(`
      SELECT
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
        captured_at::text,
        screenshot_path
      FROM crawl_failures
      ORDER BY id ASC
    `),
    sourcePool.query<CrawlBatchRow>(`
      SELECT
        batch_id,
        source_dir,
        generated_at::text,
        qa_verdict,
        qa_report,
        upstream_summary,
        contractor_count,
        contractor_grading_count,
        crawl_evidence_count,
        crawl_failure_count,
        parse_error_count,
        loaded_at::text
      FROM crawl_batches
      ORDER BY generated_at ASC
    `),
  ]);

  return {
    contractors: contractors.rows,
    gradings: gradings.rows,
    evidence: evidence.rows,
    failures: failures.rows,
    batches: batches.rows,
  };
}

async function insertContractors(client: PoolClient, rows: ContractorRow[]) {
  for (const group of chunk(rows)) {
    await client.query(
      `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            crs_number text,
            contractor_name text,
            trading_name text,
            registration_status text,
            pe_flag boolean,
            province text,
            city text,
            expiry_date text,
            source_url text,
            captured_at text
          )
        )
        INSERT INTO contractors (
          crs_number,
          contractor_name,
          trading_name,
          registration_status,
          pe_flag,
          province,
          city,
          expiry_date,
          source_url,
          captured_at
        )
        SELECT
          crs_number,
          contractor_name,
          trading_name,
          registration_status,
          COALESCE(pe_flag, FALSE),
          province,
          city,
          expiry_date::date,
          source_url,
          captured_at::timestamptz
        FROM input
        ON CONFLICT (crs_number) DO UPDATE
        SET
          contractor_name = EXCLUDED.contractor_name,
          trading_name = EXCLUDED.trading_name,
          registration_status = EXCLUDED.registration_status,
          pe_flag = EXCLUDED.pe_flag,
          province = EXCLUDED.province,
          city = EXCLUDED.city,
          expiry_date = EXCLUDED.expiry_date,
          source_url = EXCLUDED.source_url,
          captured_at = EXCLUDED.captured_at
      `,
      [JSON.stringify(group)],
    );
  }
}

async function insertGradings(client: PoolClient, rows: ContractorGradingRow[]) {
  for (const group of chunk(rows)) {
    await client.query(
      `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            id text,
            crs_number text,
            grade_level integer,
            class_code text,
            pe_flag boolean
          )
        )
        INSERT INTO contractor_gradings (
          id,
          crs_number,
          grade_level,
          class_code,
          pe_flag
        )
        SELECT
          id,
          crs_number,
          grade_level,
          class_code,
          COALESCE(pe_flag, FALSE)
        FROM input
        ON CONFLICT (crs_number, grade_level, class_code, pe_flag) DO NOTHING
      `,
      [JSON.stringify(group)],
    );
  }
}

async function insertEvidence(client: PoolClient, rows: CrawlEvidenceRow[]) {
  for (const group of chunk(rows, 150)) {
    await client.query(
      `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            batch_id text,
            capture_id text,
            target_id text,
            target_type text,
            view_name text,
            province text,
            city text,
            search_term text,
            page_number integer,
            crs_number text,
            contractor_name text,
            trading_name text,
            registration_status text,
            pe_flag boolean,
            expiry_date text,
            source_url text,
            captured_at text,
            grade_raw text,
            raw_text text,
            source_file text,
            page_title text,
            page_loaded_successfully boolean,
            error_state text,
            http_status integer,
            retry_eligible boolean,
            html_snapshot_path text,
            evidence_excerpt text,
            extraction_confidence text,
            extraction_completeness_score integer
          )
        )
        INSERT INTO crawl_evidence (
          batch_id,
          capture_id,
          target_id,
          target_type,
          view_name,
          province,
          city,
          search_term,
          page_number,
          crs_number,
          contractor_name,
          trading_name,
          registration_status,
          pe_flag,
          expiry_date,
          source_url,
          captured_at,
          grade_raw,
          raw_text,
          source_file,
          page_title,
          page_loaded_successfully,
          error_state,
          http_status,
          retry_eligible,
          html_snapshot_path,
          evidence_excerpt,
          extraction_confidence,
          extraction_completeness_score
        )
        SELECT
          batch_id,
          capture_id,
          target_id,
          target_type,
          view_name,
          province,
          city,
          search_term,
          page_number,
          crs_number,
          contractor_name,
          trading_name,
          registration_status,
          pe_flag,
          expiry_date::date,
          source_url,
          captured_at::timestamptz,
          grade_raw,
          raw_text,
          source_file,
          page_title,
          page_loaded_successfully,
          error_state,
          http_status,
          retry_eligible,
          html_snapshot_path,
          evidence_excerpt,
          extraction_confidence,
          extraction_completeness_score
        FROM input
        ON CONFLICT DO NOTHING
      `,
      [JSON.stringify(group)],
    );
  }
}

async function insertFailures(client: PoolClient, rows: CrawlFailureRow[]) {
  for (const group of chunk(rows)) {
    await client.query(
      `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            batch_id text,
            target_id text,
            stage text,
            attempted_url text,
            province text,
            city text,
            search_term text,
            page_number integer,
            failure_reason text,
            http_status integer,
            retry_eligible boolean,
            extraction_completeness_score integer,
            captured_at text,
            screenshot_path text
          )
        )
        INSERT INTO crawl_failures (
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
        SELECT
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
          COALESCE(retry_eligible, FALSE),
          extraction_completeness_score,
          captured_at::timestamptz,
          screenshot_path
        FROM input
        ON CONFLICT DO NOTHING
      `,
      [JSON.stringify(group)],
    );
  }
}

async function insertBatches(client: PoolClient, rows: CrawlBatchRow[]) {
  for (const group of chunk(rows)) {
    await client.query(
      `
        WITH input AS (
          SELECT *
          FROM jsonb_to_recordset($1::jsonb) AS x(
            batch_id text,
            source_dir text,
            generated_at text,
            qa_verdict text,
            qa_report jsonb,
            upstream_summary jsonb,
            contractor_count integer,
            contractor_grading_count integer,
            crawl_evidence_count integer,
            crawl_failure_count integer,
            parse_error_count integer,
            loaded_at text
          )
        )
        INSERT INTO crawl_batches (
          batch_id,
          source_dir,
          generated_at,
          qa_verdict,
          qa_report,
          upstream_summary,
          contractor_count,
          contractor_grading_count,
          crawl_evidence_count,
          crawl_failure_count,
          parse_error_count,
          loaded_at
        )
        SELECT
          batch_id,
          source_dir,
          generated_at::timestamptz,
          qa_verdict,
          qa_report,
          upstream_summary,
          contractor_count,
          contractor_grading_count,
          crawl_evidence_count,
          crawl_failure_count,
          parse_error_count,
          loaded_at::timestamptz
        FROM input
        ON CONFLICT (batch_id) DO UPDATE
        SET
          source_dir = EXCLUDED.source_dir,
          generated_at = EXCLUDED.generated_at,
          qa_verdict = EXCLUDED.qa_verdict,
          qa_report = EXCLUDED.qa_report,
          upstream_summary = EXCLUDED.upstream_summary,
          contractor_count = EXCLUDED.contractor_count,
          contractor_grading_count = EXCLUDED.contractor_grading_count,
          crawl_evidence_count = EXCLUDED.crawl_evidence_count,
          crawl_failure_count = EXCLUDED.crawl_failure_count,
          parse_error_count = EXCLUDED.parse_error_count,
          loaded_at = EXCLUDED.loaded_at
      `,
      [JSON.stringify(group)],
    );
  }
}

async function main() {
  await loadLocalEnv();

  const sourcePool = new Pool(getLegacyDatabasePoolConfig({ max: 2 }));
  const targetPool = createDatabasePool({ direct: true, max: 2 });

  try {
    const sourceData = await fetchSourceData(sourcePool);
    const targetClient = await targetPool.connect();

    try {
      await targetClient.query("BEGIN");
      await targetClient.query("SET LOCAL statement_timeout = 0");
      await targetClient.query("SET LOCAL lock_timeout = 0");

      await insertContractors(targetClient, sourceData.contractors);
      await insertGradings(targetClient, sourceData.gradings);
      await insertEvidence(targetClient, sourceData.evidence);
      await insertFailures(targetClient, sourceData.failures);
      await insertBatches(targetClient, sourceData.batches);

      await targetClient.query("COMMIT");
    } catch (error) {
      await targetClient.query("ROLLBACK");
      throw error;
    } finally {
      targetClient.release();
    }

    const report: MigrationReport = {
      sourceDatabase: process.env.PGDATABASE ?? "cidb_contractors",
      targetDatabase: getConfiguredDatabaseLabel(),
      moved: {
        contractors: sourceData.contractors.length,
        contractor_gradings: sourceData.gradings.length,
        crawl_evidence: sourceData.evidence.length,
        crawl_failures: sourceData.failures.length,
        crawl_batches: sourceData.batches.length,
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await Promise.all([sourcePool.end(), targetPool.end()]);
  }
}

main().catch((error) => {
  console.error("Failed to migrate local PostgreSQL data into Supabase.");
  console.error(error);
  process.exit(1);
});
