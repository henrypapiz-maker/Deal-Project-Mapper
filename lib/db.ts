import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Lazily initialised — throws if DATABASE_URL is not set
let _sql: NeonQueryFunction<false, false> | null = null;

export function getDb(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  if (!_sql) _sql = neon(url);
  return _sql;
}

// Idempotent migration — call once per cold start
let _migrated = false;
export async function ensureSchema(): Promise<void> {
  if (_migrated) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name        TEXT        NOT NULL,
      data        JSONB       NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  _migrated = true;
}
