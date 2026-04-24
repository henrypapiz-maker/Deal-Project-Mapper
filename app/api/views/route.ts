import { NextRequest, NextResponse } from "next/server";
import { getSqlForDeal } from "@/lib/db";
import { VIEW_PRESETS } from "@/lib/bowler";

// GET: Fetch view preferences for a user/deal
export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get("dealId");
    const userId = req.nextUrl.searchParams.get("userId");
    if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

    const sql = await getSqlForDeal(dealId);
    const views = userId
      ? await sql`SELECT * FROM view_preferences WHERE deal_id = ${dealId} AND (user_id = ${userId} OR user_id IS NULL) ORDER BY is_default DESC`
      : await sql`SELECT * FROM view_preferences WHERE deal_id = ${dealId} ORDER BY is_default DESC`;

    return NextResponse.json({ views, presets: VIEW_PRESETS });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Save/update view preference
export async function POST(req: NextRequest) {
  try {
    const { dealId, userId, viewName, config, isDefault } = await req.json();
    if (!dealId || !viewName || !config) {
      return NextResponse.json({ error: "dealId, viewName, config required" }, { status: 400 });
    }

    const sql = await getSqlForDeal(dealId);
    const result = await sql`
      INSERT INTO view_preferences (deal_id, user_id, view_name, config, is_default)
      VALUES (${dealId}, ${userId || null}, ${viewName}, ${JSON.stringify(config)}, ${isDefault || false})
      ON CONFLICT (deal_id, user_id, view_name) DO UPDATE SET
        config     = EXCLUDED.config,
        is_default = EXCLUDED.is_default
      RETURNING *
    `;

    return NextResponse.json({ success: true, view: result[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
