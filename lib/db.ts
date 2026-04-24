import { neon } from "@neondatabase/serverless";

/**
 * SQL client pointing at the main Neon branch (DATABASE_URL).
 * Use for: deal listing, branch URL lookups, master_catalogue reads,
 * parent_profiles, agents.* tables.
 */
export function getMainSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return neon(url);
}

/**
 * SQL client for a specific deal.
 *
 * Looks up neon_branch_url from the main branch's deals registry.
 * Returns a branch-scoped client when the deal has a branch,
 * otherwise falls back to the main SQL client.
 *
 * Use for: all deal-specific reads/writes (checklist_items, risk_alerts,
 * milestones, team_members, override_log, bowler tables, steerco_narratives,
 * reporting_periods, view_preferences).
 */
export async function getSqlForDeal(dealId: string) {
  const mainSql = getMainSql();
  const rows = await mainSql`
    SELECT neon_branch_url FROM deals WHERE id = ${dealId}
  `;
  const branchUrl = rows[0]?.neon_branch_url ?? null;
  return branchUrl ? neon(branchUrl) : mainSql;
}
