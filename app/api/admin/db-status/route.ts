/**
 * GET /api/admin/db-status?dealId=<uuid>
 *
 * Returns the Neon branching status for a specific deal.
 * Called by Admin Tab → Section J "Refresh Status" button.
 *
 * Security: neon_branch_url (which contains DB credentials) is never
 * returned to the client — only the branch ID and boolean flags.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMainSql } from "@/lib/db";
import { isBranchingEnabled } from "@/lib/neon-branch";

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  if (!dealId) {
    return NextResponse.json({ error: "dealId parameter required" }, { status: 400 });
  }

  try {
    const mainSql = getMainSql();
    const rows = await mainSql`
      SELECT neon_branch_id, neon_branch_url IS NOT NULL AS deal_is_on_branch
      FROM   deals
      WHERE  id = ${dealId}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const row = rows[0];

    return NextResponse.json({
      dealId,
      // Feature flag — true only when both NEON_API_KEY and NEON_PROJECT_ID are set
      branchingEnabled:  isBranchingEnabled(),
      // Credential status (configured vs not_set — never expose actual values)
      neonApiKey:        process.env.NEON_API_KEY     ? "configured" : "not_set",
      neonProjectId:     process.env.NEON_PROJECT_ID  ? "configured" : "not_set",
      // Deal-level branch info
      neonBranchId:      (row.neon_branch_id  as string | null) ?? null,
      dealIsOnBranch:    row.deal_is_on_branch as boolean,
    });
  } catch (e: any) {
    console.error("db-status error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
