import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getMainSql } from "@/lib/db";
import {
  createDealBranch,
  deleteDealBranch,
  isBranchingEnabled,
} from "@/lib/neon-branch";

// ── POST /api/deals — Save a full deal (upsert) ─────────────────────────────
export async function POST(request: Request) {
  try {
    const mainSql = getMainSql();

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
      generationLog,
      parentProfile,
      workstreamOverrides,
    } = deal;

    const isNew = !deal.id;
    const dealId: string = deal.id || crypto.randomUUID();

    // ── Branch management ──────────────────────────────────────────────────
    let branchId: string | null = null;
    let branchUrl: string | null = null;

    if (isNew && isBranchingEnabled()) {
      // Create a dedicated Neon branch for this deal, forked from main.
      // The branch inherits master_catalogue + empty deal tables at this LSN.
      try {
        const branch = await createDealBranch(dealId);
        branchId = branch.branchId;
        branchUrl = branch.branchUrl;
        console.log(`[deals] Created branch ${branchId} for deal ${dealId}`);
      } catch (err) {
        // Non-fatal — fall back to writing everything on main
        console.warn("[deals] Branch creation failed, falling back to main:", err);
      }
    } else if (!isNew) {
      // Look up existing branch URL from main deals registry
      const rows = await mainSql`
        SELECT neon_branch_id, neon_branch_url FROM deals WHERE id = ${dealId}
      `;
      if (rows.length > 0) {
        branchId  = (rows[0].neon_branch_id  as string | null) ?? null;
        branchUrl = (rows[0].neon_branch_url as string | null) ?? null;
      }
    }

    // writeSql points at the branch when available, main otherwise
    const hasBranch = !!branchUrl;
    const writeSql  = hasBranch ? neon(branchUrl!) : mainSql;

    // ── Upsert deals header on MAIN (registry + branch URL storage) ────────
    // COALESCE on neon_branch_* prevents overwriting with NULL on re-saves.
    await mainSql`
      INSERT INTO deals (
        id, name, deal_structure, integration_model, close_date,
        cross_border, jurisdictions, tsa_required, industry_sector,
        shared_services, deal_value_range, target_entities,
        target_gaap, target_erp, buyer_maturity, acquirer_gaap,
        functional_scope, status, created_at,
        generation_log, parent_profile_id, workstream_overrides,
        neon_branch_id, neon_branch_url
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
        ${generatedAt || new Date().toISOString()},
        ${generationLog ? JSON.stringify(generationLog) : null},
        ${parentProfile?.id ?? intake.parentProfileId ?? null},
        ${workstreamOverrides ? JSON.stringify(workstreamOverrides) : null},
        ${branchId},
        ${branchUrl}
      )
      ON CONFLICT (id) DO UPDATE SET
        name                 = EXCLUDED.name,
        deal_structure       = EXCLUDED.deal_structure,
        integration_model    = EXCLUDED.integration_model,
        close_date           = EXCLUDED.close_date,
        cross_border         = EXCLUDED.cross_border,
        jurisdictions        = EXCLUDED.jurisdictions,
        tsa_required         = EXCLUDED.tsa_required,
        industry_sector      = EXCLUDED.industry_sector,
        shared_services      = EXCLUDED.shared_services,
        deal_value_range     = EXCLUDED.deal_value_range,
        target_entities      = EXCLUDED.target_entities,
        target_gaap          = EXCLUDED.target_gaap,
        target_erp           = EXCLUDED.target_erp,
        buyer_maturity       = EXCLUDED.buyer_maturity,
        acquirer_gaap        = EXCLUDED.acquirer_gaap,
        functional_scope     = EXCLUDED.functional_scope,
        status               = EXCLUDED.status,
        generation_log       = EXCLUDED.generation_log,
        parent_profile_id    = EXCLUDED.parent_profile_id,
        workstream_overrides = EXCLUDED.workstream_overrides,
        neon_branch_id       = COALESCE(EXCLUDED.neon_branch_id,  deals.neon_branch_id),
        neon_branch_url      = COALESCE(EXCLUDED.neon_branch_url, deals.neon_branch_url),
        updated_at           = NOW()
    `;

    // ── Mirror deals header onto the branch (enables branch-level reads) ───
    // When GET loads a deal via the branch connection, it does SELECT * FROM
    // deals WHERE id = $1 — the row must exist on the branch.
    if (hasBranch) {
      await writeSql`
        INSERT INTO deals (
          id, name, deal_structure, integration_model, close_date,
          cross_border, jurisdictions, tsa_required, industry_sector,
          shared_services, deal_value_range, target_entities,
          target_gaap, target_erp, buyer_maturity, acquirer_gaap,
          functional_scope, status, created_at,
          generation_log, parent_profile_id, workstream_overrides,
          neon_branch_id, neon_branch_url
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
          ${generatedAt || new Date().toISOString()},
          ${generationLog ? JSON.stringify(generationLog) : null},
          ${parentProfile?.id ?? intake.parentProfileId ?? null},
          ${workstreamOverrides ? JSON.stringify(workstreamOverrides) : null},
          ${branchId},
          ${branchUrl}
        )
        ON CONFLICT (id) DO UPDATE SET
          name                 = EXCLUDED.name,
          deal_structure       = EXCLUDED.deal_structure,
          integration_model    = EXCLUDED.integration_model,
          close_date           = EXCLUDED.close_date,
          cross_border         = EXCLUDED.cross_border,
          jurisdictions        = EXCLUDED.jurisdictions,
          tsa_required         = EXCLUDED.tsa_required,
          industry_sector      = EXCLUDED.industry_sector,
          shared_services      = EXCLUDED.shared_services,
          deal_value_range     = EXCLUDED.deal_value_range,
          target_entities      = EXCLUDED.target_entities,
          target_gaap          = EXCLUDED.target_gaap,
          target_erp           = EXCLUDED.target_erp,
          buyer_maturity       = EXCLUDED.buyer_maturity,
          acquirer_gaap        = EXCLUDED.acquirer_gaap,
          functional_scope     = EXCLUDED.functional_scope,
          status               = EXCLUDED.status,
          generation_log       = EXCLUDED.generation_log,
          parent_profile_id    = EXCLUDED.parent_profile_id,
          workstream_overrides = EXCLUDED.workstream_overrides,
          neon_branch_id       = COALESCE(EXCLUDED.neon_branch_id,  deals.neon_branch_id),
          neon_branch_url      = COALESCE(EXCLUDED.neon_branch_url, deals.neon_branch_url),
          updated_at           = NOW()
      `;
    }

    // ── Full replace — delete existing child rows then bulk-insert ─────────
    // All child writes go to writeSql (branch or main).
    await writeSql`DELETE FROM checklist_items  WHERE deal_id = ${dealId}`;
    await writeSql`DELETE FROM team_members     WHERE deal_id = ${dealId}`;
    await writeSql`DELETE FROM risk_alerts      WHERE deal_id = ${dealId}`;
    await writeSql`DELETE FROM milestones       WHERE deal_id = ${dealId}`;
    await writeSql`DELETE FROM saved_filters    WHERE deal_id = ${dealId}`;

    // Insert team members FIRST (checklist_items.owner_id FK references team_members)
    for (const p of (people || []) as any[]) {
      await writeSql`
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

    // Insert checklist items
    for (const item of checklistItems as any[]) {
      const ownerId =
        item.ownerId && /^[0-9a-f]{8}-/.test(item.ownerId) ? item.ownerId : null;
      await writeSql`
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
          ${ownerId},
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

    // Insert risk alerts
    for (const r of (riskAlerts || []) as any[]) {
      await writeSql`
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
      await writeSql`
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
      await writeSql`
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
      await writeSql`
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

    // Append audit trail (last 50 events to keep volume manageable)
    for (const evt of ((changeLog || []) as any[]).slice(-50)) {
      await writeSql`
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
      branched: hasBranch,
      branchId: branchId ?? undefined,
    });
  } catch (error: any) {
    console.error("Save deal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── GET /api/deals — Load a specific deal by ?id= or list all deals ──────────
export async function GET(request: Request) {
  try {
    const mainSql = getMainSql();

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("id");

    if (dealId) {
      // ── Load one deal ────────────────────────────────────────────────────
      // Step 1: Look up branch URL from main registry
      const registryRows = await mainSql`
        SELECT neon_branch_url FROM deals WHERE id = ${dealId}
      `;
      if (registryRows.length === 0) {
        return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      }

      const branchUrl = (registryRows[0].neon_branch_url as string | null) ?? null;
      const readSql   = branchUrl ? neon(branchUrl) : mainSql;

      // Step 2: Load full deal data from branch (or main if unbranched)
      const deals = await readSql`SELECT * FROM deals WHERE id = ${dealId}`;
      if (deals.length === 0) {
        return NextResponse.json({ error: "Deal not found" }, { status: 404 });
      }

      const deal = deals[0];

      const [items, team, risks, ms, snaps, filters, auditRows] =
        await Promise.all([
          readSql`SELECT * FROM checklist_items    WHERE deal_id = ${dealId} ORDER BY item_id`,
          readSql`SELECT * FROM team_members       WHERE deal_id = ${dealId}`,
          readSql`SELECT * FROM risk_alerts        WHERE deal_id = ${dealId}`,
          readSql`SELECT * FROM milestones         WHERE deal_id = ${dealId}`,
          readSql`SELECT * FROM progress_snapshots WHERE deal_id = ${dealId} ORDER BY period_end`,
          readSql`SELECT * FROM saved_filters      WHERE deal_id = ${dealId}`,
          readSql`SELECT * FROM audit.status_history WHERE deal_id = ${dealId} ORDER BY created_at DESC LIMIT 100`,
        ]);

      return NextResponse.json({
        id: deal.id,
        intake: {
          dealName:        deal.name,
          dealStructure:   deal.deal_structure,
          integrationModel: deal.integration_model,
          closeDate:       deal.close_date,
          crossBorder:     deal.cross_border,
          jurisdictions:   deal.jurisdictions ?? [],
          tsaRequired:     deal.tsa_required,
          industrySector:  deal.industry_sector,
          sharedServices:  deal.shared_services ?? [],
          dealValueRange:  deal.deal_value_range,
          targetEntities:  deal.target_entities,
          targetGaap:      deal.target_gaap,
          targetErp:       deal.target_erp,
          buyerMaturity:   deal.buyer_maturity,
          acquirerGaap:    deal.acquirer_gaap,
          functionalScope: deal.functional_scope ?? [],
        },
        checklistItems: items.map((i: any) => ({
          id:              i.id,
          itemId:          i.item_id,
          workstream:      i.workstream,
          section:         i.section,
          description:     i.description,
          phase:           i.phase,
          milestoneDate:   i.milestone_date,
          priority:        i.priority,
          status:          i.status,
          ownerId:         i.owner_id,
          dependencies:    i.dependencies ?? [],
          tsaRelevant:     i.tsa_relevant,
          crossBorderFlag: i.cross_border_flag,
          riskIndicators:  i.risk_indicators ?? [],
          functionalArea:  i.functional_area,
          notes:           i.notes ?? [],
          attachments:     i.attachments ?? [],
          blockedReason:   i.blocked_reason,
          naJustification: i.na_justification,
          aiGuidance:      i.ai_guidance,
        })),
        riskAlerts: risks.map((r: any) => ({
          id:                 r.id,
          category:           r.category,
          severity:           r.severity,
          description:        r.description,
          indicators:         r.indicators ?? [],
          mitigation:         r.mitigation,
          status:             r.status,
          affectedWorkstreams: r.indicators ?? [],
        })),
        milestones: ms.map((m: any) => ({
          label:        m.label,
          phase:        m.phase,
          daysFromClose: m.days_from_close,
          date:         m.date,
        })),
        people: team.map((t: any) => ({
          id:    t.id,
          name:  t.name,
          email: t.email,
          role:  t.role,
        })),
        progressSnapshots: snaps.map((s: any) => ({
          id:         s.id,
          periodEnd:  s.period_end,
          createdAt:  s.created_at,
          summary:    s.summary,
          workstreams: s.workstreams,
          owners:     s.owners,
        })),
        savedFilters: filters.map((f: any) => ({
          id:        f.id,
          name:      f.name,
          filters:   f.filters,
          isPreset:  f.is_preset,
          createdAt: f.created_at,
        })),
        changeLog: auditRows.map((a: any) => ({
          id:        a.id.toString(),
          timestamp: a.created_at,
          itemId:    a.checklist_item_id || "",
          field:     a.field,
          oldValue:  a.old_value,
          newValue:  a.new_value,
        })),
        generatedAt:        deal.created_at,
        generationLog:      deal.generation_log ?? null,
        workstreamOverrides: deal.workstream_overrides ?? null,
        workstreamSummary:  [],
      });
    } else {
      // ── List all deals (header only, always from main) ───────────────────
      const rows = await mainSql`
        SELECT id, name, deal_structure, integration_model,
               close_date, status, created_at,
               neon_branch_id IS NOT NULL AS is_branched
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

// ── DELETE /api/deals — Remove a deal and delete its Neon branch ─────────────
export async function DELETE(request: Request) {
  try {
    const mainSql = getMainSql();

    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get("id");
    if (!dealId) {
      return NextResponse.json({ error: "id parameter required" }, { status: 400 });
    }

    // Look up branch ID before deleting the row
    const rows = await mainSql`
      SELECT neon_branch_id FROM deals WHERE id = ${dealId}
    `;
    const branchId = (rows[0]?.neon_branch_id as string | null) ?? null;

    // Delete Neon branch first (non-fatal if it fails)
    if (branchId && isBranchingEnabled()) {
      try {
        await deleteDealBranch(branchId);
        console.log(`[deals] Deleted branch ${branchId} for deal ${dealId}`);
      } catch (err) {
        console.warn(`[deals] Branch deletion failed for ${branchId}:`, err);
      }
    }

    // Delete deal row from main (CASCADE removes child rows on main)
    await mainSql`DELETE FROM deals WHERE id = ${dealId}`;

    return NextResponse.json({
      success: true,
      deleted: dealId,
      branchDeleted: !!branchId,
    });
  } catch (error: any) {
    console.error("Delete deal error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
