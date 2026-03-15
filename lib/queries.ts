import "server-only";

import pool from "@/lib/db";
import { buildCitySlug, buildProvinceSlug, parseProvinceSlug } from "@/lib/utils";
import type {
  CityGradeChooserRow,
  CityGradeClassPath,
  CityGradeBreakdown,
  CitySummary,
  ClassSummary,
  Contractor,
  ContractorWithGradings,
  EvidenceSummary,
  GradeLocation,
  HomepageStats,
  LeafPageSummary,
  ProvinceStats,
  RelatedLeafLink,
} from "@/types";

type JoinedContractorRow = {
  crs_number: string;
  contractor_name: string;
  trading_name: string | null;
  registration_status: Contractor["registration_status"];
  pe_flag: boolean;
  province: string;
  city: string;
  expiry_date: string | null;
  source_url: string;
  captured_at: Date | string;
  grading_id: string | null;
  grade_level: number | null;
  class_code: string | null;
  grading_pe_flag: boolean | null;
};

function normalizeContractor(row: {
  crs_number: string;
  contractor_name: string;
  trading_name: string | null;
  registration_status: Contractor["registration_status"];
  pe_flag: boolean;
  province: string;
  city: string;
  expiry_date: string | null;
  source_url: string;
  captured_at: Date | string;
}): Contractor {
  return {
    crs_number: row.crs_number,
    contractor_name: row.contractor_name,
    trading_name: row.trading_name,
    registration_status: row.registration_status,
    pe_flag: row.pe_flag,
    province: row.province,
    city: row.city,
    expiry_date: row.expiry_date,
    source_url: row.source_url,
    captured_at:
      row.captured_at instanceof Date
        ? row.captured_at.toISOString()
        : new Date(row.captured_at).toISOString(),
  };
}

function normalizeTimestamp(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}

function groupContractorRows(rows: JoinedContractorRow[]): ContractorWithGradings[] {
  const grouped = new Map<string, ContractorWithGradings>();

  for (const row of rows) {
    if (!grouped.has(row.crs_number)) {
      grouped.set(row.crs_number, {
        ...normalizeContractor(row),
        gradings: [],
      });
    }

    if (row.grading_id && row.grade_level && row.class_code) {
      grouped.get(row.crs_number)?.gradings.push({
        id: row.grading_id,
        crs_number: row.crs_number,
        grade_level: row.grade_level,
        class_code: row.class_code,
        pe_flag: row.grading_pe_flag ?? row.pe_flag,
      });
    }
  }

  return [...grouped.values()].map((contractor) => ({
    ...contractor,
    gradings: contractor.gradings.sort(
      (left, right) =>
        right.grade_level - left.grade_level || left.class_code.localeCompare(right.class_code),
    ),
  }));
}

async function getContractorJoinRows(whereSql = "", values: unknown[] = []): Promise<JoinedContractorRow[]> {
  const result = await pool.query<JoinedContractorRow>(
    `
      SELECT
        c.crs_number,
        c.contractor_name,
        c.trading_name,
        c.registration_status,
        c.pe_flag,
        c.province,
        c.city,
        c.expiry_date::text AS expiry_date,
        c.source_url,
        c.captured_at,
        g.id AS grading_id,
        g.grade_level,
        g.class_code,
        g.pe_flag AS grading_pe_flag
      FROM contractors c
      LEFT JOIN contractor_gradings g ON g.crs_number = c.crs_number
      ${whereSql}
      ORDER BY c.contractor_name ASC, g.grade_level DESC NULLS LAST, g.class_code ASC NULLS LAST
    `,
    values,
  );

  return result.rows;
}

export async function getContractorBySlug(slug: string): Promise<ContractorWithGradings | null> {
  const crsNumber = slug.split("-")[0];
  if (!crsNumber) {
    return null;
  }

  const rows = await getContractorJoinRows("WHERE c.crs_number = $1", [crsNumber]);
  return groupContractorRows(rows)[0] ?? null;
}

export async function getContractorsByFilter(params: {
  province: string;
  city: string;
  grade_level: number;
  class_code: string;
}): Promise<ContractorWithGradings[]> {
  const result = await pool.query<JoinedContractorRow>(
    `
      SELECT
        c.crs_number,
        c.contractor_name,
        c.trading_name,
        c.registration_status,
        c.pe_flag,
        c.province,
        c.city,
        c.expiry_date::text AS expiry_date,
        c.source_url,
        c.captured_at,
        all_g.id AS grading_id,
        all_g.grade_level,
        all_g.class_code,
        all_g.pe_flag AS grading_pe_flag
      FROM contractors c
      INNER JOIN contractor_gradings match_g
        ON match_g.crs_number = c.crs_number
        AND match_g.grade_level = $3
        AND match_g.class_code = $4
      LEFT JOIN contractor_gradings all_g ON all_g.crs_number = c.crs_number
      WHERE c.province = $1
        AND c.city = $2
      ORDER BY c.contractor_name ASC, all_g.grade_level DESC, all_g.class_code ASC
    `,
    [params.province, params.city, params.grade_level, params.class_code],
  );

  return groupContractorRows(result.rows);
}

export async function getContractorsByCity(
  province: string,
  city: string,
): Promise<ContractorWithGradings[]> {
  const rows = await getContractorJoinRows("WHERE c.province = $1 AND c.city = $2", [province, city]);
  return groupContractorRows(rows);
}

export async function getContractorsByProvince(province: string): Promise<ContractorWithGradings[]> {
  const rows = await getContractorJoinRows("WHERE c.province = $1", [province]);
  return groupContractorRows(rows);
}

export async function getAllContractorsWithGradings(): Promise<ContractorWithGradings[]> {
  const rows = await getContractorJoinRows();
  return groupContractorRows(rows);
}

export async function getAllContractors(): Promise<Contractor[]> {
  const result = await pool.query<
    Contractor & {
      captured_at: Date | string;
    }
  >(
    `
      SELECT
        crs_number,
        contractor_name,
        trading_name,
        registration_status,
        pe_flag,
        province,
        city,
        expiry_date::text AS expiry_date,
        source_url,
        captured_at
      FROM contractors
      ORDER BY contractor_name ASC
    `,
  );

  return result.rows.map((row) => normalizeContractor(row));
}

export async function getAllCities(): Promise<CitySummary[]> {
  const result = await pool.query<CitySummary>(
    `
      SELECT province, city, COUNT(*)::int AS count
      FROM contractors
      GROUP BY province, city
      ORDER BY province ASC, city ASC
    `,
  );

  return result.rows;
}

export async function getClassSummaries(): Promise<ClassSummary[]> {
  const result = await pool.query<ClassSummary>(
    `
      SELECT
        g.class_code,
        COUNT(DISTINCT g.crs_number)::int AS contractor_count
      FROM contractor_gradings g
      GROUP BY g.class_code
      ORDER BY contractor_count DESC, g.class_code ASC
    `,
  );

  return result.rows;
}

export async function getAllLeafPages(): Promise<LeafPageSummary[]> {
  const result = await pool.query<LeafPageSummary>(
    `
      SELECT
        c.province,
        c.city,
        g.grade_level,
        g.class_code,
        COUNT(DISTINCT c.crs_number)::int AS count
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      GROUP BY c.province, c.city, g.grade_level, g.class_code
      HAVING COUNT(DISTINCT c.crs_number) >= 5
      ORDER BY c.province ASC, c.city ASC, g.grade_level ASC, g.class_code ASC
    `,
  );

  return result.rows;
}

export async function searchContractors(query: string): Promise<Contractor[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const exact = trimmed;
  const prefix = `${trimmed}%`;
  const fuzzy = `%${trimmed}%`;

  const result = await pool.query<
    Contractor & {
      captured_at: Date | string;
    }
  >(
    `
      SELECT
        crs_number,
        contractor_name,
        trading_name,
        registration_status,
        pe_flag,
        province,
        city,
        expiry_date::text AS expiry_date,
        source_url,
        captured_at
      FROM contractors c
      WHERE
        c.crs_number ILIKE $2
        OR c.contractor_name ILIKE $3
        OR COALESCE(c.trading_name, '') ILIKE $3
      ORDER BY
        CASE
          WHEN c.crs_number = $1 THEN 0
          WHEN c.crs_number ILIKE $2 THEN 1
          WHEN c.contractor_name ILIKE $2 THEN 2
          WHEN COALESCE(c.trading_name, '') ILIKE $2 THEN 3
          ELSE 4
        END,
        c.contractor_name ASC
      LIMIT 20
    `,
    [exact, prefix, fuzzy],
  );

  return result.rows.map((row) => normalizeContractor(row));
}

export async function getStats(): Promise<HomepageStats> {
  const result = await pool.query<HomepageStats & { latest_capture: Date | string | null }>(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE registration_status = 'Active')::int AS active,
        COUNT(*) FILTER (WHERE registration_status = 'Suspended')::int AS suspended,
        COUNT(*) FILTER (WHERE registration_status = 'Expired')::int AS expired,
        COUNT(DISTINCT province)::int AS provinces,
        COUNT(DISTINCT city)::int AS cities,
        MAX(captured_at) AS latest_capture
      FROM contractors
    `,
  );

  const row = result.rows[0];
  return {
    ...row,
    latest_capture: normalizeTimestamp(row.latest_capture as Date | string | null),
  };
}

export async function getAllProvinces(): Promise<string[]> {
  const result = await pool.query<{ province: string }>(
    `
      SELECT DISTINCT province
      FROM contractors
      ORDER BY province ASC
    `,
  );

  return result.rows.map((row) => row.province);
}

export async function getProvinceBySlug(slug: string): Promise<string | null> {
  const parsed = parseProvinceSlug(slug);
  if (!parsed) {
    return null;
  }

  const provinces = await getAllProvinces();
  return provinces.find((province) => province === parsed) ?? null;
}

export async function getCityBySlugs(provinceSlug: string, citySlug: string): Promise<CitySummary | null> {
  const cities = await getAllCities();
  return (
    cities.find(
      (item) =>
        buildProvinceSlug(item.province) === provinceSlug && buildCitySlug(item.city) === citySlug,
    ) ?? null
  );
}

export async function getProvinceStats(province: string): Promise<ProvinceStats | null> {
  const result = await pool.query<ProvinceStats>(
    `
      SELECT
        province,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE registration_status = 'Active')::int AS active,
        COUNT(*) FILTER (WHERE registration_status = 'Suspended')::int AS suspended,
        COUNT(*) FILTER (WHERE registration_status = 'Expired')::int AS expired,
        COUNT(DISTINCT city)::int AS cities
      FROM contractors
      WHERE province = $1
      GROUP BY province
    `,
    [province],
  );

  return result.rows[0] ?? null;
}

export async function getCityGradeBreakdown(
  province: string,
  city: string,
): Promise<CityGradeBreakdown[]> {
  const result = await pool.query<{
    grade_level: number;
    classes: string[];
    contractor_count: number;
  }>(
    `
      SELECT
        g.grade_level,
        ARRAY_AGG(DISTINCT g.class_code ORDER BY g.class_code) AS classes,
        COUNT(DISTINCT c.crs_number)::int AS contractor_count
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      WHERE c.province = $1
        AND c.city = $2
      GROUP BY g.grade_level
      ORDER BY g.grade_level ASC
    `,
    [province, city],
  );

  return result.rows;
}

export async function getCityGradeChooser(
  province: string,
  city: string,
): Promise<CityGradeChooserRow[]> {
  const result = await pool.query<CityGradeChooserRow>(
    `
      WITH class_counts AS (
        SELECT
          g.grade_level,
          g.class_code,
          COUNT(DISTINCT c.crs_number)::int AS contractor_count
        FROM contractors c
        INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
        WHERE c.province = $1
          AND c.city = $2
        GROUP BY g.grade_level, g.class_code
      )
      SELECT
        g.grade_level,
        COUNT(DISTINCT c.crs_number)::int AS contractor_count,
        COUNT(DISTINCT c.crs_number) FILTER (WHERE c.registration_status = 'Active')::int AS active_count,
        ARRAY_AGG(DISTINCT g.class_code ORDER BY g.class_code) AS classes,
        COUNT(*) FILTER (WHERE cc.contractor_count >= 5)::int AS public_leaf_count,
        COUNT(DISTINCT c.crs_number) FILTER (WHERE c.pe_flag = true)::int AS pe_count
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      INNER JOIN class_counts cc
        ON cc.grade_level = g.grade_level
        AND cc.class_code = g.class_code
      WHERE c.province = $1
        AND c.city = $2
      GROUP BY g.grade_level
      ORDER BY g.grade_level ASC
    `,
    [province, city],
  );

  return result.rows;
}

export async function getCityGradeClassPaths(
  province: string,
  city: string,
  gradeLevel: number,
): Promise<CityGradeClassPath[]> {
  const result = await pool.query<CityGradeClassPath>(
    `
      SELECT
        g.class_code,
        COUNT(DISTINCT c.crs_number)::int AS contractor_count,
        COUNT(DISTINCT c.crs_number) FILTER (WHERE c.registration_status = 'Active')::int AS active_count,
        COUNT(DISTINCT c.crs_number) FILTER (WHERE c.pe_flag = true)::int AS pe_count,
        (COUNT(DISTINCT c.crs_number) >= 5) AS has_public_leaf
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      WHERE c.province = $1
        AND c.city = $2
        AND g.grade_level = $3
      GROUP BY g.class_code
      ORDER BY contractor_count DESC, g.class_code ASC
    `,
    [province, city, gradeLevel],
  );

  return result.rows;
}

export async function getCityGradeEvidenceSummary(
  province: string,
  city: string,
  gradeLevel: number,
): Promise<EvidenceSummary> {
  const result = await pool.query<{
    evidence_rows: number;
    contractors_with_evidence: number;
    source_urls: number;
    latest_capture: Date | string | null;
  }>(
    `
      SELECT
        COUNT(e.id)::int AS evidence_rows,
        COUNT(DISTINCT e.crs_number)::int AS contractors_with_evidence,
        COUNT(DISTINCT e.source_url)::int AS source_urls,
        MAX(e.captured_at) AS latest_capture
      FROM crawl_evidence e
      INNER JOIN contractors c ON c.crs_number = e.crs_number
      WHERE c.province = $1
        AND c.city = $2
        AND EXISTS (
          SELECT 1
          FROM contractor_gradings g
          WHERE g.crs_number = c.crs_number
            AND g.grade_level = $3
        )
    `,
    [province, city, gradeLevel],
  );

  const row = result.rows[0];

  return {
    ...row,
    latest_capture: normalizeTimestamp(row.latest_capture),
  };
}

export async function getLeafPagesForProvince(province: string): Promise<LeafPageSummary[]> {
  const result = await pool.query<LeafPageSummary>(
    `
      SELECT
        c.province,
        c.city,
        g.grade_level,
        g.class_code,
        COUNT(DISTINCT c.crs_number)::int AS count
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      WHERE c.province = $1
      GROUP BY c.province, c.city, g.grade_level, g.class_code
      HAVING COUNT(DISTINCT c.crs_number) >= 5
      ORDER BY c.city ASC, g.grade_level ASC, g.class_code ASC
    `,
    [province],
  );

  return result.rows;
}

export async function getLeafPagesForCity(
  province: string,
  city: string,
): Promise<LeafPageSummary[]> {
  const result = await pool.query<LeafPageSummary>(
    `
      SELECT
        c.province,
        c.city,
        g.grade_level,
        g.class_code,
        COUNT(DISTINCT c.crs_number)::int AS count
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      WHERE c.province = $1
        AND c.city = $2
      GROUP BY c.province, c.city, g.grade_level, g.class_code
      HAVING COUNT(DISTINCT c.crs_number) >= 5
      ORDER BY g.grade_level ASC, g.class_code ASC
    `,
    [province, city],
  );

  return result.rows;
}

export async function getRelatedLeafPages(
  province: string,
  city: string,
  gradeLevel: number,
  classCode: string,
): Promise<{
  sameClassDifferentGrade: RelatedLeafLink[];
  sameGradeDifferentClass: RelatedLeafLink[];
}> {
  const pages = await getLeafPagesForCity(province, city);

  return {
    sameClassDifferentGrade: pages.filter(
      (page) => page.class_code === classCode && page.grade_level !== gradeLevel,
    ),
    sameGradeDifferentClass: pages.filter(
      (page) => page.grade_level === gradeLevel && page.class_code !== classCode,
    ),
  };
}

export async function getLeafEvidenceSummary(
  province: string,
  city: string,
  gradeLevel: number,
  classCode: string,
): Promise<EvidenceSummary> {
  const result = await pool.query<{ evidence_rows: number; contractors_with_evidence: number; source_urls: number; latest_capture: Date | string | null }>(
    `
      SELECT
        COUNT(e.id)::int AS evidence_rows,
        COUNT(DISTINCT e.crs_number)::int AS contractors_with_evidence,
        COUNT(DISTINCT e.source_url)::int AS source_urls,
        MAX(e.captured_at) AS latest_capture
      FROM crawl_evidence e
      INNER JOIN contractors c ON c.crs_number = e.crs_number
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      WHERE c.province = $1
        AND c.city = $2
        AND g.grade_level = $3
        AND g.class_code = $4
    `,
    [province, city, gradeLevel, classCode],
  );

  const row = result.rows[0];

  return {
    ...row,
    latest_capture: normalizeTimestamp(row.latest_capture),
  };
}

export async function getGradeLocations(gradeLevel: number): Promise<GradeLocation[]> {
  const result = await pool.query<GradeLocation>(
    `
      SELECT
        c.province,
        c.city,
        COUNT(DISTINCT c.crs_number)::int AS count
      FROM contractors c
      INNER JOIN contractor_gradings g ON g.crs_number = c.crs_number
      WHERE g.grade_level = $1
      GROUP BY c.province, c.city
      ORDER BY count DESC, c.province ASC, c.city ASC
    `,
    [gradeLevel],
  );

  return result.rows;
}

export async function getAvailableClassesForGrade(gradeLevel: number): Promise<string[]> {
  const result = await pool.query<{ class_code: string }>(
    `
      SELECT DISTINCT class_code
      FROM contractor_gradings
      WHERE grade_level = $1
      ORDER BY class_code ASC
    `,
    [gradeLevel],
  );

  return result.rows.map((row) => row.class_code);
}
