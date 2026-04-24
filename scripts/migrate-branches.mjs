/**
 * scripts/migrate-branches.mjs
 *
 * Scatter-Gather DDL runner — fans a schema migration out to every active
 * deal branch then reports per-branch success/failure.
 *
 * Background
 * ──────────
 * Because each deal lives on its own Neon branch (forked from main at creation
 * time), running ALTER TABLE on main does NOT propagate to existing branches.
 * This script queries main for all deals with a branch URL and applies your
 * DDL to each one sequentially.
 *
 * Usage
 * ─────
 *   # Single statement via env var
 *   MIGRATION_SQL="ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS esg_score INT" \
 *   node scripts/migrate-branches.mjs
 *
 *   # Or hardcode statements in the MIGRATIONS array below and run without env var.
 *
 * Output
 *   ✓  <Deal Name>   (id)
 *   ✗  <Deal Name>   (id): <error>
 *
 * Exits with code 1 if any branch fails so CI/CD can catch the error.
 */

import { neon } from "@neondatabase/serverless";

// ── Config ─────────────────────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL env var is not set.");
  process.exit(1);
}

// Optionally hardcode a sequence of statements here for committed migrations.
// When MIGRATION_SQL env var is also set, it is appended to this list.
const MIGRATIONS = [
  // Example: "ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS esg_score INT",
];

const envSql = process.env.MIGRATION_SQL;
if (envSql) MIGRATIONS.push(envSql);

if (MIGRATIONS.length === 0) {
  console.error(
    "❌  Nothing to run.\n" +
    "    Either set MIGRATION_SQL env var or add statements to the MIGRATIONS array.\n\n" +
    '    Example:\n' +
    '      MIGRATION_SQL="ALTER TABLE deals ADD COLUMN IF NOT EXISTS esg_score INT" \\\n' +
    '      node scripts/migrate-branches.mjs'
  );
  process.exit(1);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "═".repeat(60));
  console.log("  DealMapper — Scatter-Gather Branch Migration");
  console.log("═".repeat(60));

  console.log(`\n📋  ${MIGRATIONS.length} statement(s) to apply:`);
  MIGRATIONS.forEach((s, i) => console.log(`  ${i + 1}. ${s.trim().slice(0, 80)}${s.length > 80 ? "…" : ""}`));

  // Fetch all deals that have a Neon branch
  const mainSql = neon(DATABASE_URL);
  const branches = await mainSql`
    SELECT id, name, neon_branch_url
    FROM   deals
    WHERE  neon_branch_url IS NOT NULL
    ORDER  BY created_at
  `;

  if (branches.length === 0) {
    console.log("\n⚠️   No branched deals found — nothing to migrate.\n");
    return;
  }

  console.log(`\n🌿  ${branches.length} active deal branch(es) found:\n`);

  let passed = 0;
  let failed = 0;
  /** @type {string[]} */
  const errors = [];

  for (const deal of branches) {
    const branchSql = neon(deal.neon_branch_url);
    try {
      for (const stmt of MIGRATIONS) {
        await branchSql.unsafe(stmt);
      }
      console.log(`  ✓  ${deal.name.padEnd(36)} (${deal.id})`);
      passed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗  ${deal.name.padEnd(36)} (${deal.id}): ${msg}`);
      errors.push(`${deal.name} (${deal.id}): ${msg}`);
      failed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log(`  ✓ Passed: ${passed}   ✗ Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n🚨  ${failed} branch(es) failed migration:`);
    errors.forEach(e => console.error(`   ❌  ${e}`));
    console.error(
      "\nThe failed branches still have the old schema.\n" +
      "Fix the error and re-run to apply the migration to the remaining branches.\n"
    );
    process.exit(1);
  }

  console.log("\n✅  All branches migrated successfully.\n");
  console.log("Next step: run npm run seed:dry to regenerate the JSON snapshot if needed.\n");
}

main().catch(e => {
  console.error("\n❌  Migration runner failed:", e);
  process.exit(1);
});
