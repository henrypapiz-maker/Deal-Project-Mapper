import { NextRequest, NextResponse } from "next/server";
import { getSqlForDeal } from "@/lib/db";
import { generatePeriods } from "@/lib/bowler";

// POST: Generate reporting periods for a deal
export async function POST(req: NextRequest) {
  try {
    const { dealId, closeDate } = await req.json();
    if (!dealId || !closeDate) {
      return NextResponse.json({ error: "dealId and closeDate required" }, { status: 400 });
    }

    const sql = await getSqlForDeal(dealId);

    // Check if periods already exist
    const existing = await sql`SELECT COUNT(*) as cnt FROM reporting_periods WHERE deal_id = ${dealId}`;
    if (Number(existing[0].cnt) > 0) {
      const periods = await sql`SELECT * FROM reporting_periods WHERE deal_id = ${dealId} ORDER BY sequence_num`;
      return NextResponse.json({ periods, created: false });
    }

    // Generate and insert
    const periods = generatePeriods(closeDate);
    for (const p of periods) {
      await sql`
        INSERT INTO reporting_periods (deal_id, period_label, period_type, period_start, period_end, is_current, sequence_num)
        VALUES (${dealId}, ${p.periodLabel}, ${p.periodType}, ${p.periodStart}, ${p.periodEnd}, ${p.isCurrent}, ${p.sequenceNum})
      `;
    }

    const inserted = await sql`SELECT * FROM reporting_periods WHERE deal_id = ${dealId} ORDER BY sequence_num`;
    return NextResponse.json({ periods: inserted, created: true });
  } catch (e: any) {
    console.error("periods POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Fetch periods for a deal
export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get("dealId");
    if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

    const sql = await getSqlForDeal(dealId);
    const periods = await sql`SELECT * FROM reporting_periods WHERE deal_id = ${dealId} ORDER BY sequence_num`;
    return NextResponse.json({ periods });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
