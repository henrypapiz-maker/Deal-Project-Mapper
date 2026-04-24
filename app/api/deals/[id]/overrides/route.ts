import { NextRequest, NextResponse } from "next/server";
import { getSqlForDeal } from "@/lib/db";

type RouteContext = { params: { id: string } };

// ── GET /api/deals/[id]/overrides — list override log for a deal ──────────────
export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: dealId } = params;
  try {
    const sql = await getSqlForDeal(dealId);
    const rows = await sql`
      SELECT * FROM override_log WHERE deal_id = ${dealId} ORDER BY created_at DESC
    `;
    return NextResponse.json({ overrides: rows });
  } catch (e) {
    console.error("overrides GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

// ── POST /api/deals/[id]/overrides — log a new must-have override ─────────────
export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id: dealId } = params;
  const body = await req.json();
  const {
    itemId,
    itemDescription,
    overrideType,   // 'na_must_have' | 'priority_downgrade' | 'manual_exclude'
    previousValue,
    newValue,
    warningShown,
    overrideReason,
  } = body;

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  try {
    const sql = await getSqlForDeal(dealId);
    const [row] = await sql`
      INSERT INTO override_log (
        deal_id, item_id, item_description, override_type,
        previous_value, new_value, warning_shown, override_reason
      ) VALUES (
        ${dealId},
        ${itemId},
        ${itemDescription ?? null},
        ${overrideType ?? "na_must_have"},
        ${previousValue ?? null},
        ${newValue ?? null},
        ${warningShown ?? true},
        ${overrideReason ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json({ override: row }, { status: 201 });
  } catch (e) {
    console.error("overrides POST error:", e);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
