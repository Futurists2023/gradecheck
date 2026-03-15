import "server-only";

import { Pool } from "pg";
import { getDatabasePoolConfig } from "@/lib/postgres";

declare global {
  var __gradecheckPool: Pool | undefined;
}

const pool =
  global.__gradecheckPool ??
  new Pool(getDatabasePoolConfig({ max: 10 }));

if (process.env.NODE_ENV !== "production") {
  global.__gradecheckPool = pool;
}

export default pool;
