import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { computeWorkstreamRAG, computeTrackRAG, computeProgramRAG, WORKSTREAM_TRACK_MAP, TRACK_ORDER } from "@/lib/bowler";

const sql = neon(process.env.DATABASE_URL!);

// GET: Fetch bowler table data
export async function GET(req: NextRequest) {
  try {
    const dealId = req.nextUrl.searchParams.get("dealId");
    const level = req.nextUrl.searchParams.get("level") || "workstream";
    const periodsCount = parseInt(req.nextUrl.searchParams.get("periods") || "8");

    if (!dealId) return NextResponse.json({ error: "dealId required" }, { status: 400 });

    // Get the most recent N periods
    const periods = await sql`
      SELECT * FROM reporting_periods
      WHERE deal_id = ${dealId}
      ORDER BY sequence_num DESC
      LIMIT ${periodsCount}
    `;
    periods.reverse(); // chronological order

    if (periods.length === 0) {
      return NextResponse.json({ periods: [], cells: [], message: "No reporting periods. POST /api/periods to generate." });
    }

    const periodIds = periods.map((p: any) => p.id);

    // Get bowler cells for requested level
    const cells = await sql`
      SELECT * FROM bowler_cells
      WHERE deal_id = ${dealId}
        AND period_id = ANY(${periodIds})
        AND level = ${level}
      ORDER BY row_key, period_id
    `;

    return NextResponse.json({ periods, cells });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Trigger snapshot — compute bowler cells for a specific period
export async function POST(req: NextRequest) {
  try {
    const { dealId, periodId } = await req.json();
    if (!dealId || !periodId) {
      return NextResponse.json({ error: "dealId and periodId required" }, { status: 400 });
    }

    // Get all active checklist items for this deal
    const items = await sql`
      SELECT item_id, workstream, status, priority, owner_id, blocked_reason,
             notes, attachments, milestone_date
      FROM checklist_items
      WHERE deal_id = ${dealId} AND status != 'na'
    `;

    const todayStr = new Date().toISOString().split("T")[0];

    // 1. Snapshot each item into item_period_status
    for (const item of items) {
      const notesCount = Array.isArray(item.notes) ? item.notes.length : 0;
      const attCount = Array.isArray(item.attachments) ? item.attachments.length : 0;
      await sql`
        INSERT INTO item_period_status (deal_id, period_id, item_id, status, priority, owner_id, blocked_reason, notes_count, attachments_count)
        VALUES (${dealId}, ${periodId}, ${item.item_id}, ${item.status}, ${item.priority}, ${item.owner_id}, ${item.blocked_reason}, ${notesCount}, ${attCount})
        ON CONFLICT (deal_id, period_id, item_id) DO UPDATE SET
          status = EXCLUDED.status,
          priority = EXCLUDED.priority,
          owner_id = EXCLUDED.owner_id,
          blocked_reason = EXCLUDED.blocked_reason,
          notes_count = EXCLUDED.notes_count,
          attachments_count = EXCLUDED.attachments_count
      `;
    }

    // 2. Compute workstream-level cells
    const wsMap: Record<string, any[]> = {};
    items.forEach((item: any) => {
      if (!wsMap[item.workstream]) wsMap[item.workstream] = [];
      wsMap[item.workstream].push(item);
    });

    const wsRags: Record<string, "red" | "amber" | "green"> = {};

    for (const [ws, wsItems] of Object.entries(wsMap)) {
      const total = wsItems.length;
      const completed = wsItems.filter((i: any) => i.status === "complete").length;
      const blocked = wsItems.filter((i: any) => i.status === "blocked").length;
      const inProgress = wsItems.filter((i: any) => i.status === "in_progress").length;
      const pastDue = wsItems.filter((i: any) => i.milestone_date && i.milestone_date < todayStr && i.status !== "complete").length;
      const notStarted = wsItems.filter((i: any) => i.status === "not_started").length;
      const pctComplete = total ? Math.round((completed / total) * 100) : 0;

      const rag = computeWorkstreamRAG({ total, completed, blocked, pastDue });
      wsRags[ws] = rag;

      const metrics = { total, completed, inProgress, blocked, pastDue, notStarted, pctComplete };

      await sql`
        INSERT INTO bowler_cells (deal_id, period_id, level, row_key, computed_rag, metrics)
        VALUES (${dealId}, ${periodId}, 'workstream', ${ws}, ${rag}, ${JSON.stringify(metrics)})
        ON CONFLICT (deal_id, period_id, level, row_key) DO UPDATE SET
          computed_rag = EXCLUDED.computed_rag,
          metrics = EXCLUDED.metrics,
          updated_at = now()
      `;
    }

    // 3. Compute track-level cells
    const trackRags: Record<string, ("red" | "amber" | "green")[]> = {};
    const trackMetrics: Record<string, { total: number; completed: number; blocked: number; greenWs: number; amberWs: number; redWs: number }> = {};

    for (const [ws, rag] of Object.entries(wsRags)) {
      const track = WORKSTREAM_TRACK_MAP[ws] || "Other";
      if (!trackRags[track]) {
        trackRags[track] = [];
        trackMetrics[track] = { total: 0, completed: 0, blocked: 0, greenWs: 0, amberWs: 0, redWs: 0 };
      }
      trackRags[track].push(rag);
      const wsItems = wsMap[ws] || [];
      trackMetrics[track].total += wsItems.length;
      trackMetrics[track].completed += wsItems.filter((i: any) => i.status === "complete").length;
      trackMetrics[track].blocked += wsItems.filter((i: any) => i.status === "blocked").length;
      if (rag === "green") trackMetrics[track].greenWs++;
      else if (rag === "amber") trackMetrics[track].amberWs++;
      else trackMetrics[track].redWs++;
    }

    const allTrackRags: ("red" | "amber" | "green")[] = [];
    for (const track of TRACK_ORDER) {
      if (!trackRags[track]) continue;
      const rag = computeTrackRAG(trackRags[track]);
      allTrackRags.push(rag);
      const m = trackMetrics[track];
      const pctComplete = m.total ? Math.round((m.completed / m.total) * 100) : 0;
      const metrics = { ...m, pctComplete, totalWs: trackRags[track].length };

      await sql`
        INSERT INTO bowler_cells (deal_id, period_id, level, row_key, computed_rag, metrics)
        VALUES (${dealId}, ${periodId}, 'track', ${track}, ${rag}, ${JSON.stringify(metrics)})
        ON CONFLICT (deal_id, period_id, level, row_key) DO UPDATE SET
          computed_rag = EXCLUDED.computed_rag,
          metrics = EXCLUDED.metrics,
          updated_at = now()
      `;
    }

    // 4. Compute program-level cell
    const programRag = computeProgramRAG(allTrackRags);
    const programMetrics = {
      totalItems: items.length,
      completed: items.filter((i: any) => i.status === "complete").length,
      blocked: items.filter((i: any) => i.status === "blocked").length,
      pctComplete: items.length ? Math.round((items.filter((i: any) => i.status === "complete").length / items.length) * 100) : 0,
      totalWs: Object.keys(wsMap).length,
      greenWs: Object.values(wsRags).filter(r => r === "green").length,
      amberWs: Object.values(wsRags).filter(r => r === "amber").length,
      redWs: Object.values(wsRags).filter(r => r === "red").length,
    };

    await sql`
      INSERT INTO bowler_cells (deal_id, period_id, level, row_key, computed_rag, metrics)
      VALUES (${dealId}, ${periodId}, 'program', NULL, ${programRag}, ${JSON.stringify(programMetrics)})
      ON CONFLICT (deal_id, period_id, level, row_key) DO UPDATE SET
        computed_rag = EXCLUDED.computed_rag,
        metrics = EXCLUDED.metrics,
        updated_at = now()
    `;

    return NextResponse.json({
      success: true,
      itemsSnapshotted: items.length,
      workstreams: Object.keys(wsMap).length,
      tracks: Object.keys(trackRags).length,
      programRag,
    });
  } catch (e: any) {
    console.error("bowler POST error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Update a bowler cell (override RAG, add narrative, etc.)
export async function PUT(req: NextRequest) {
  try {
    const { cellId, overrideRag, overrideBy, narrative, keyRisks, nextSteps, highlightedItems, authorId } = await req.json();
    if (!cellId) return NextResponse.json({ error: "cellId required" }, { status: 400 });

    const updates: string[] = [];
    if (overrideRag !== undefined) {
      await sql`UPDATE bowler_cells SET override_rag = ${overrideRag}, override_by = ${overrideBy || null}, override_at = now(), updated_at = now() WHERE id = ${cellId}`;
    }
    if (narrative !== undefined) {
      await sql`UPDATE bowler_cells SET narrative = ${narrative}, author_id = ${authorId || null}, updated_at = now() WHERE id = ${cellId}`;
    }
    if (keyRisks !== undefined) {
      await sql`UPDATE bowler_cells SET key_risks = ${keyRisks}, updated_at = now() WHERE id = ${cellId}`;
    }
    if (nextSteps !== undefined) {
      await sql`UPDATE bowler_cells SET next_steps = ${nextSteps}, updated_at = now() WHERE id = ${cellId}`;
    }
    if (highlightedItems !== undefined) {
      await sql`UPDATE bowler_cells SET highlighted_items = ${JSON.stringify(highlightedItems)}, updated_at = now() WHERE id = ${cellId}`;
    }

    const updated = await sql`SELECT * FROM bowler_cells WHERE id = ${cellId}`;
    return NextResponse.json({ success: true, cell: updated[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
