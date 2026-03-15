import { Pool, type PoolConfig } from "pg";

function getBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function shouldUseUrlSsl(): boolean {
  const explicitSsl = getBooleanEnv("DATABASE_SSL");
  if (explicitSsl !== undefined) {
    return explicitSsl;
  }

  const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
  if (sslMode === "disable") {
    return false;
  }

  return true;
}

function getUrlConfig(connectionString: string, max?: number): PoolConfig {
  return {
    connectionString,
    max,
    ssl: shouldUseUrlSsl() ? { rejectUnauthorized: false } : undefined,
  };
}

function getLegacyConfig(max?: number): PoolConfig {
  return {
    host: process.env.PGHOST ?? "localhost",
    port: Number(process.env.PGPORT ?? 5432),
    database: process.env.PGDATABASE ?? "cidb_contractors",
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    max,
  };
}

export function getLegacyDatabasePoolConfig(options: { max?: number } = {}): PoolConfig {
  return getLegacyConfig(options.max);
}

export function getDatabasePoolConfig(options: { max?: number } = {}): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    return getUrlConfig(connectionString, options.max);
  }

  return getLegacyConfig(options.max);
}

export function getDirectDatabasePoolConfig(options: { max?: number } = {}): PoolConfig {
  const connectionString =
    process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (connectionString) {
    return getUrlConfig(connectionString, options.max);
  }

  return getLegacyConfig(options.max);
}

export function getConfiguredDatabaseLabel(): string {
  const connectionString =
    process.env.DIRECT_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (connectionString) {
    try {
      const url = new URL(connectionString);
      return url.pathname.replace(/^\//, "") || "postgres";
    } catch {
      return "postgres";
    }
  }

  return process.env.PGDATABASE ?? "cidb_contractors";
}

export function createDatabasePool(options: { direct?: boolean; max?: number } = {}): Pool {
  return new Pool(
    options.direct
      ? getDirectDatabasePoolConfig({ max: options.max })
      : getDatabasePoolConfig({ max: options.max }),
  );
}
