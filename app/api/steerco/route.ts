import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// GET: Fetch narratives for a deal (optionally filtered by period)
export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get("dealId");
    const periodId = req.nextUrl.searchParams.get("periodId");
    if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

    const narratives = periodId
      ? await sql`SELECT * FROM steerco_narratives WHERE deal_id = ${dealId} AND period_id = ${periodId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM steerco_narratives WHERE deal_id = ${dealId} ORDER BY created_at DESC`;

    return NextResponse.json({ narratives });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Create or update a SteerCo narrative
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dealId, periodId, periodLabel,
      overallStatus, keyIssues, keyDelays, keyFindings,
      materialImpacts, materialDependencies, materialOperationalImpacts,
      keyDecisionsEscalations, financialImpacts, overallBudget,
      pctComplete, authorId, status,
    } = body;

    if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

    const result = await sql`
      INSERT INTO steerco_narratives (
        deal_id, period_id, period_label,
        overall_status, key_issues, key_delays, key_findings,
        material_impacts, material_dependencies, material_operational_impacts,
        key_decisions_escalations, financial_impacts, overall_budget,
        pct_complete, author_id, status
      ) VALUES (
        ${dealId}, ${periodId || null}, ${periodLabel || null},
        ${overallStatus || null}, ${keyIssues || null}, ${keyDelays || null}, ${keyFindings || null},
        ${materialImpacts || null}, ${materialDependencies || null}, ${materialOperationalImpacts || null},
        ${keyDecisionsEscalations || null}, ${financialImpacts || null}, ${overallBudget || null},
        ${pctComplete || null}, ${authorId || null}, ${status || 'draft'}
      )
      ON CONFLICT (deal_id, period_id) DO UPDATE SET
        overall_status = EXCLUDED.overall_status,
        key_issues = EXCLUDED.key_issues,
        key_delays = EXCLUDED.key_delays,
        key_findings = EXCLUDED.key_findings,
        material_impacts = EXCLUDED.material_impacts,
        material_dependencies = EXCLUDED.material_dependencies,
        material_operational_impacts = EXCLUDED.material_operational_impacts,
        key_decisions_escalations = EXCLUDED.key_decisions_escalations,
        financial_impacts = EXCLUDED.financial_impacts,
        overall_budget = EXCLUDED.overall_budget,
        pct_complete = EXCLUDED.pct_complete,
        author_id = EXCLUDED.author_id,
        status = EXCLUDED.status,
        updated_at = now()
      RETURNING *
    `;

    return NextResponse.json({ success: true, narrative: result[0] });
  } catch (e: any) {
    console.error("steerco POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
