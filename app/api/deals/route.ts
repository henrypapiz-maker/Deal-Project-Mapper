import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

// POST /api/deals — Save a full deal (upsert)
export async function POST(request: Request) {
  try {
    const sql = getSql();
    if (!sql) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const deal = await request.json();
    const {
      intake,
      checklistItems,
      riskAlerts,
      milestones,
      people,
      progressSnapshots,
      savedFilters,
      changeLog,
      generatedAt,
    } = deal;

    // Upsert deal — use provided id or generate a fresh UUID
    const dealId: string = deal.id || crypto.randomUUID();

    await sql`
      INSERT INTO deals (
        id, name, deal_structure, integration_model, close_date,
        cross_border, jurisdictions, tsa_required, industry_sector,
        shared_services, deal_value_range, target_entities,
        target_gaap, target_erp, buyer_maturity, acquirer_gaap,
        functional_scope, status, created_at
      )
      VALUES (
        ${dealId},
        ${intake.dealName},
        ${intake.dealStructure},
        ${intake.integrationModel},
        ${intake.closeDate},
        ${intake.crossBorder},
        ${JSON.stringify(intake.jurisdictions || [])},
        ${intake.tsaRequired},
        ${intake.industrySector || null},
        ${JSON.stringify(intake.sharedServices || [])},
        ${intake.dealValueRange || null},
        ${intake.targetEntities || null},
        ${intake.targetGaap || null},
        ${intake.targetErp || null},
        ${intake.buyerMaturity || null},
        ${intake.acquirerGaap || null},
        ${JSON.stringify(intake.functionalScope || [])},
        'active',
        ${generatedAt || new Date().toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        name               = EXCLUDED.name,
        deal_structure     = EXCLUDED.deal_structure,
        integration_model  = EXCLUDED.integration_model,
        close_date         = EXCLUDED.close_date,
        cross_border       = EXCLUDED.cross_border,
        jurisdictions      = EXCLUDED.jurisdictions,
        tsa_required       = EXCLUDED.tsa_required,
        industry_sector    = EXCLUDED.industry_sector,
        shared_services    = EXCLUDED.shared_services,
        deal_value_range   = EXCLUDED.deal_value_range,
        target_entities    = EXCLUDED.target_entities,
        target_gaap        = EXCLUDED.target_gaap,
        target_erp         = EXCLUDED.target_erp,
        buyer_maturity     = EXCLUDED.buyer_maturity,
        acquirer_gaap      = EXCLUDED.acquirer_gaap,
        functional_scope   = EXCLUDED.functional_scope,
        status             = EXCLUDED.status,
        updated_at         = NOW()
    `;

    // Full replace — delete existing child rows then bulk-insert
    await sql`DELETE FROM checklist_items  WHERE deal_id = ${dealId}`;
    await sql`DELETE FROM team_members     WHERE deal_id = ${dealId}`;
    await sql`DELETE FROM risk_alerts      WHERE deal_id = ${dealId}`;
    await sql`DELETE FROM milestones       WHERE deal_id = ${dealId}`;
    await sql`DELETE FROM saved_filters    WHERE deal_id = ${dealId}`;

    // Insert checklist items
    for (const item of checklistItems as any[]) {
      await sql`
        INSERT INTO checklist_items (
          deal_id, item_id, workstream, section, description,
          phase, milestone_date, priority, status, owner_id,
          dependencies, tsa_relevant, cross_border_flag,
          risk_indicators, functional_area,
          notes, attachments, blocked_reason, na_justification
        )
        VALUES (
          ${dealId},
          ${item.itemId},
          ${item.workstream},
          ${item.section || null},
          ${item.description},
          ${item.phase},
          ${item.milestoneDate || null},
          ${item.priority},
          ${item.status},
          ${item.ownerId || null},
          ${JSON.stringify(item.dependencies || [])},
          ${item.tsaRelevant || false},
          ${item.crossBorderFlag || false},
          ${JSON.stringify(item.riskIndicators || [])},
          ${item.functionalArea || null},
          ${JSON.stringify(item.notes || [])},
          ${JSON.stringify(item.attachments || [])},
          ${item.blockedReason || null},
          ${item.naJustification || null}
        )
      `;
    }

    // Insert team members
    for (const p of (people || []) as any[]) {
      await sql`
        INSERT INTO team_members (id, deal_id, name, email, role)
        VALUES (
          ${p.id},
          ${dealId},
          ${p.name},
          ${p.email || null},
          ${p.role || null}
        )
      `;
    }

    // Insert risk alerts
    for (const r of (riskAlerts || []) as any[]) {
      await sql`
        INSERT INTO risk_alerts (
          deal_id, category, severity, description,
          indicators, mitigation, status
        )
        VALUES (
          ${dealId},
          ${r.category},
          ${r.severity},
          ${r.description || null},
          ${JSON.stringify(r.indicators || r.affectedWorkstreams || [])},
          ${r.mitigation || null},
          ${r.status || "open"}
        )
      `;
    }

    // Insert milestones
    for (const m of (milestones || []) as any[]) {
      await sql`
        INSERT INTO milestones (deal_id, label, phase, days_from_close, date)
        VALUES (
          ${dealId},
          ${m.label},
          ${m.phase},
          ${m.daysFromClose},
          ${m.date || null}
        )
      `;
    }

    // Insert saved filters
    for (const f of (savedFilters || []) as any[]) {
      await sql`
        INSERT INTO saved_filters (deal_id, name, filters, is_preset)
        VALUES (
          ${dealId},
          ${f.name},
          ${JSON.stringify(f.filters)},
          ${f.isPreset || false}
        )
      `;
    }

    // Upsert progress snapshots
    for (const snap of (progressSnapshots || []) as any[]) {
      await sql`
        INSERT INTO progress_snapshots (
          deal_id, period_end, summary, workstreams, owners
        )
        VALUES (
          ${dealId},
          ${snap.periodEnd},
          ${JSON.stringify(snap.summary)},
          ${JSON.stringify(snap.workstreams)},
          ${JSON.stringify(snap.owners)}
        )
        ON CONFLICT (deal_id, period_end) DO UPDATE SET
          summary     = EXCLUDED.summary,
          workstreams = EXCLUDED.workstreams,
          owners      = EXCLUDED.owners
      `;
    }

    // Append audit trail (last 50 events only to keep volume manageable)
    for (const evt of ((changeLog || []) as any[]).slice(-50)) {
      await sql`
        INSERT INTO audit.status_history (
          deal_id, field, old_value, new_value, created_at
        )
        VALUES (
          ${dealId},
          ${evt.field},
          ${evt.oldValue},
          ${evt.newValue},
          ${evt.timestamp}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      dealId,
      itemCount: (checklistItems as any[]).length,
    });
  } catch (error: any) {
    console.error("Save deal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/deals — Load a specific deal by ?id= or list all deals
export async function GET(request: Request) {
  try {
    const sql = getSql();
    if (!sql) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("id");

    if (dealId) {
      // ── Load one deal ──────────────────────────────────────────
      const deals = await sql`SELECT * FROM deals WHERE id = ${dealId}`;
      if (deals.length === 0) {
        return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      }

      const deal = deals[0];

      const [items, team, risks, ms, snaps, filters, auditRows] =
        await Promise.all([
          sql`SELECT * FROM checklist_items WHERE deal_id = ${dealId} ORDER BY item_id`,
          sql`SELECT * FROM team_members WHERE deal_id = ${dealId}`,
          sql`SELECT * FROM risk_alerts WHERE deal_id = ${dealId}`,
          sql`SELECT * FROM milestones WHERE deal_id = ${dealId}`,
          sql`SELECT * FROM progress_snapshots WHERE deal_id = ${dealId} ORDER BY period_end`,
          sql`SELECT * FROM saved_filters WHERE deal_id = ${dealId}`,
          sql`SELECT * FROM audit.status_history WHERE deal_id = ${dealId} ORDER BY created_at DESC LIMIT 100`,
        ]);

      return NextResponse.json({
        id: deal.id,
        intake: {
          dealName: deal.name,
          dealStructure: deal.deal_structure,
          integrationModel: deal.integration_model,
          closeDate: deal.close_date,
          crossBorder: deal.cross_border,
          jurisdictions: deal.jurisdictions ?? [],
          tsaRequired: deal.tsa_required,
          industrySector: deal.industry_sector,
          sharedServices: deal.shared_services ?? [],
          dealValueRange: deal.deal_value_range,
          targetEntities: deal.target_entities,
          targetGaap: deal.target_gaap,
          targetErp: deal.target_erp,
          buyerMaturity: deal.buyer_maturity,
          acquirerGaap: deal.acquirer_gaap,
          functionalScope: deal.functional_scope ?? [],
        },
        checklistItems: items.map((i: any) => ({
          id: i.id,
          itemId: i.item_id,
          workstream: i.workstream,
          section: i.section,
          description: i.description,
          phase: i.phase,
          milestoneDate: i.milestone_date,
          priority: i.priority,
          status: i.status,
          ownerId: i.owner_id,
          dependencies: i.dependencies ?? [],
          tsaRelevant: i.tsa_relevant,
          crossBorderFlag: i.cross_border_flag,
          riskIndicators: i.risk_indicators ?? [],
          functionalArea: i.functional_area,
          notes: i.notes ?? [],
          attachments: i.attachments ?? [],
          blockedReason: i.blocked_reason,
          naJustification: i.na_justification,
          aiGuidance: i.ai_guidance,
        })),
        riskAlerts: risks.map((r: any) => ({
          id: r.id,
          category: r.category,
          severity: r.severity,
          description: r.description,
          indicators: r.indicators ?? [],
          mitigation: r.mitigation,
          status: r.status,
          affectedWorkstreams: r.indicators ?? [],
        })),
        milestones: ms.map((m: any) => ({
          label: m.label,
          phase: m.phase,
          daysFromClose: m.days_from_close,
          date: m.date,
        })),
        people: team.map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          role: t.role,
        })),
        progressSnapshots: snaps.map((s: any) => ({
          id: s.id,
          periodEnd: s.period_end,
          createdAt: s.created_at,
          summary: s.summary,
          workstreams: s.workstreams,
          owners: s.owners,
        })),
        savedFilters: filters.map((f: any) => ({
          id: f.id,
          name: f.name,
          filters: f.filters,
          isPreset: f.is_preset,
          createdAt: f.created_at,
        })),
        changeLog: auditRows.map((a: any) => ({
          id: a.id.toString(),
          timestamp: a.created_at,
          itemId: a.checklist_item_id || "",
          field: a.field,
          oldValue: a.old_value,
          newValue: a.new_value,
        })),
        generatedAt: deal.created_at,
        workstreamSummary: [],
      });
    } else {
      // ── List all deals ─────────────────────────────────────────
      const rows = await sql`
        SELECT id, name, deal_structure, integration_model,
               close_date, status, created_at
        FROM deals
        ORDER BY created_at DESC
      `;
      return NextResponse.json({ deals: rows });
    }
  } catch (error: any) {
    console.error("Load deal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a deal and all child records (CASCADE handles it)
export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    if (!sql) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("id");
    if (!dealId) return NextResponse.json({ error: "id parameter required" }, { status: 400 });

    await sql`DELETE FROM deals WHERE id = ${dealId}`;
    return NextResponse.json({ success: true, deleted: dealId });
  } catch (error: any) {
    console.error("Delete deal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
