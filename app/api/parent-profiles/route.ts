import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ── Row → ParentProfile mapper ────────────────────────────────────────────────
function rowToProfile(r: Record<string, unknown>) {
  return {
    id: r.id,
    orgName: r.org_name,
    orgType: r.org_type,
    parentIndustry: r.parent_industry,
    hqJurisdiction: r.hq_jurisdiction,
    parentGaap: r.parent_gaap,
    parentErp: r.parent_erp,
    fiscalYearEnd: r.fiscal_year_end,
    reportingCurrency: r.reporting_currency,
    imoStructure: r.imo_structure,
    buyerMaturity: r.buyer_maturity,
    integrationPlaybook: r.integration_playbook,
    imoLead: r.imo_lead,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ── GET /api/parent-profiles — list all profiles ──────────────────────────────
export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM parent_profiles ORDER BY created_at DESC
    `;
    return NextResponse.json({ profiles: rows.map(rowToProfile) });
  } catch (e) {
    console.error("parent-profiles GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

// ── POST /api/parent-profiles — create a new profile ─────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    orgName, orgType, parentIndustry, hqJurisdiction, parentGaap,
    parentErp, fiscalYearEnd, reportingCurrency, imoStructure,
    buyerMaturity, integrationPlaybook, imoLead,
  } = body;

  if (!orgName?.trim()) {
    return NextResponse.json({ error: "orgName is required" }, { status: 400 });
  }

  try {
    const [row] = await sql`
      INSERT INTO parent_profiles (
        org_name, org_type, parent_industry, hq_jurisdiction, parent_gaap,
        parent_erp, fiscal_year_end, reporting_currency, imo_structure,
        buyer_maturity, integration_playbook, imo_lead
      ) VALUES (
        ${orgName}, ${orgType ?? null}, ${parentIndustry ?? null}, ${hqJurisdiction ?? null},
        ${parentGaap ?? null}, ${parentErp ?? null}, ${fiscalYearEnd ?? null},
        ${reportingCurrency ?? null}, ${imoStructure ?? null}, ${buyerMaturity ?? null},
        ${integrationPlaybook ?? null}, ${imoLead ?? null}
      )
      RETURNING *
    `;
    return NextResponse.json({ profile: rowToProfile(row) }, { status: 201 });
  } catch (e) {
    console.error("parent-profiles POST error:", e);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}

// ── PATCH /api/parent-profiles?id=<uuid> — update a profile ──────────────────
export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const {
    orgName, orgType, parentIndustry, hqJurisdiction, parentGaap,
    parentErp, fiscalYearEnd, reportingCurrency, imoStructure,
    buyerMaturity, integrationPlaybook, imoLead,
  } = body;

  try {
    const [row] = await sql`
      UPDATE parent_profiles SET
        org_name            = COALESCE(${orgName ?? null}, org_name),
        org_type            = ${orgType ?? null},
        parent_industry     = ${parentIndustry ?? null},
        hq_jurisdiction     = ${hqJurisdiction ?? null},
        parent_gaap         = ${parentGaap ?? null},
        parent_erp          = ${parentErp ?? null},
        fiscal_year_end     = ${fiscalYearEnd ?? null},
        reporting_currency  = ${reportingCurrency ?? null},
        imo_structure       = ${imoStructure ?? null},
        buyer_maturity      = ${buyerMaturity ?? null},
        integration_playbook = ${integrationPlaybook ?? null},
        imo_lead            = ${imoLead ?? null},
        updated_at          = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ profile: rowToProfile(row) });
  } catch (e) {
    console.error("parent-profiles PATCH error:", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

// ── DELETE /api/parent-profiles?id=<uuid> — delete a profile ─────────────────
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    // Unlink from deals first (FK is ON DELETE SET NULL but be explicit)
    await sql`UPDATE deals SET parent_profile_id = NULL WHERE parent_profile_id = ${id}`;
    await sql`DELETE FROM parent_profiles WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("parent-profiles DELETE error:", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
