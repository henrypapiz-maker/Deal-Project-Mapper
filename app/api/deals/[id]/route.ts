import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function dbUnavailable(err: unknown) {
  const msg = (err as Error).message ?? "";
  return msg.includes("DATABASE_URL") || msg.includes("not configured");
}

// GET /api/deals/[id] — fetch full deal data
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getDb();
    const rows = await sql`SELECT data FROM deals WHERE id = ${params.id}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(rows[0].data);
  } catch (err) {
    if (dbUnavailable(err)) {
      return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    }
    console.error("[GET /api/deals/[id]]", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

// PUT /api/deals/[id] — update deal data in place
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sql = getDb();
    const { data } = (await req.json()) as { data: object };
    await sql`
      UPDATE deals
      SET data = ${JSON.stringify(data)}, updated_at = now()
      WHERE id = ${params.id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (dbUnavailable(err)) {
      return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    }
    console.error("[PUT /api/deals/[id]]", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
