import { createDatabasePool } from "@/lib/postgres";
import { loadLocalEnv } from "@/lib/load-local-env";

async function main() {
  await loadLocalEnv();

  const pool = createDatabasePool({ direct: true, max: 1 });

  try {
    const result = await pool.query<{
      database_name: string;
      database_user: string;
      server_time: string;
      server_version: string;
    }>(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        NOW()::text AS server_time,
        version() AS server_version
    `);

    console.log(JSON.stringify(result.rows[0], null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Database smoke test failed.");
  console.error(error);
  process.exit(1);
});
