/**
 * Write-back protocol — promotes a net-new checklist item from a deal branch
 * into master_catalogue on main.
 *
 * "Net-new" means the item_id does not exist in master_catalogue.
 * These are custom tasks added by PMO during deal execution that are valuable
 * enough to become part of the shared baseline for future deals.
 *
 * GET  /api/catalogue/promote?dealId=<uuid>
 *   Returns all checklist items in the deal's branch that are NOT in
 *   master_catalogue — these are candidates for promotion.
 *
 * POST /api/catalogue/promote
 *   Body: { dealId: string, itemId: string }
 *   Promotes a single item from the deal branch into master_catalogue on main.
 *   Returns 409 if the item already exists in the catalogue.
 */

import { NextRequest, NextResponse } from "next/server";
import { getMainSql, getSqlForDeal } from "@/lib/db";
import { WORKSTREAM_CAPABILITY_NODES } from "@/lib/catalogue-metadata";

// ── GET — list eligible (net-new) items ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  if (!dealId) {
    return NextResponse.json({ error: "dealId parameter required" }, { status: 400 });
  }

  try {
    const mainSql   = getMainSql();
    const branchSql = await getSqlForDeal(dealId);

    // All item IDs currently in the master catalogue
    const catalogueRows = await mainSql`SELECT item_id FROM master_catalogue`;
    const catalogueIds  = new Set(catalogueRows.map((r: any) => r.item_id as string));

    // All checklist items in this deal
    const dealItems = await branchSql`
      SELECT item_id, workstream, section, description, phase, priority,
             tsa_relevant, cross_border_flag, functional_area
      FROM   checklist_items
      WHERE  deal_id = ${dealId}
      ORDER  BY item_id
    `;

    // Filter to only those that don't exist in master_catalogue
    const eligible = dealItems.filter((i: any) => !catalogueIds.has(i.item_id));

    return NextResponse.json({
      dealId,
      eligible,
      totalDealItems:      dealItems.length,
      catalogueItemCount:  catalogueIds.size,
    });
  } catch (e: any) {
    console.error("promote GET error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST — promote one item ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { dealId, itemId } = await req.json();
    if (!dealId || !itemId) {
      return NextResponse.json(
        { error: "dealId and itemId are required" },
        { status: 400 }
      );
    }

    const mainSql   = getMainSql();
    const branchSql = await getSqlForDeal(dealId);

    // Guard: item must NOT already exist in master_catalogue
    const existing = await mainSql`
      SELECT item_id FROM master_catalogue WHERE item_id = ${itemId}
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        {
          error:   "item_already_in_catalogue",
          message: `${itemId} already exists in master_catalogue — no promotion needed`,
        },
        { status: 409 }
      );
    }

    // Fetch the full item from the deal branch
    const items = await branchSql`
      SELECT * FROM checklist_items
      WHERE  deal_id = ${dealId} AND item_id = ${itemId}
    `;
    if (items.length === 0) {
      return NextResponse.json(
        { error: "item_not_found", message: `${itemId} not found in deal ${dealId}` },
        { status: 404 }
      );
    }
    const item = items[0] as any;

    // Derive capability_node from workstream mapping
    const capabilityNode = WORKSTREAM_CAPABILITY_NODES[item.workstream] ?? "GENERAL";

    // Insert into master_catalogue on main
    await mainSql`
      INSERT INTO master_catalogue (
        item_id, workstream, section, description, phase, priority,
        tsa_relevant, cross_border_flag, risk_indicators,
        functional_area, dependencies,
        node_id, capability_node,
        must_have, must_have_reason,
        sector_affinity, maturity_sensitive,
        updated_at
      ) VALUES (
        ${item.item_id},
        ${item.workstream},
        ${item.section       ?? null},
        ${item.description},
        ${item.phase},
        ${item.priority},
        ${item.tsa_relevant  ?? false},
        ${item.cross_border_flag ?? false},
        ${JSON.stringify(item.risk_indicators ?? [])},
        ${item.functional_area ?? null},
        ${JSON.stringify(item.dependencies    ?? [])},
        ${item.item_id},
        ${capabilityNode},
        false,
        null,
        '[]',
        false,
        NOW()
      )
    `;

    console.log(`[catalogue/promote] Promoted ${itemId} from deal ${dealId} to master_catalogue`);

    return NextResponse.json({
      success:  true,
      promoted: itemId,
      message:  `${itemId} has been promoted to master_catalogue and will appear in future generated deals`,
    }, { status: 201 });
  } catch (e: any) {
    console.error("promote POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
