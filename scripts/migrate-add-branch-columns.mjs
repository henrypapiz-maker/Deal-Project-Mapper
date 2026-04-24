/**
 * scripts/migrate-add-branch-columns.mjs
 *
 * One-time migration: adds neon_branch_id and neon_branch_url to deals.
 *
 * Run once:  node scripts/migrate-add-branch-columns.mjs
 *
 * Existing deals without a branch will remain on main (backward compat).
 * New deals created after Phase 3 deployment will get their own branch.
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_M5Lgd3PWBoqe@ep-ancient-mountain-ai7vu90g-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);

async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  DealMapper — Add Neon branch columns to deals");
  console.log("═".repeat(60) + "\n");

  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS neon_branch_id  VARCHAR(50)`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS neon_branch_url TEXT`;

  console.log("  ✓  neon_branch_id  VARCHAR(50) added to deals");
  console.log("  ✓  neon_branch_url TEXT        added to deals");

  const [row] = await sql`
    SELECT
      COUNT(*)::int                                                   AS total,
      SUM(CASE WHEN neon_branch_id IS NOT NULL THEN 1 ELSE 0 END)::int AS branched
    FROM deals
  `;

  console.log(`\n  Deals in registry:    ${row.total}`);
  console.log(`  Deals with branches:  ${row.branched}`);
  console.log(
    "\n✅  Migration complete. Existing deals use main branch (backward compat).\n"
  );
}

main().catch((e) => {
  console.error("\n❌  Migration failed:", e);
  process.exit(1);
});
