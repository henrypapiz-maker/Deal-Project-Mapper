import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";

function dbUnavailable(err: unknown) {
  const msg = (err as Error).message ?? "";
  return msg.includes("DATABASE_URL") || msg.includes("not configured");
}

// GET /api/deals — list recent deals (name + id + updated_at)
export async function GET() {
  try {
    const sql = getDb();
    await ensureSchema();
    const rows = await sql`
      SELECT id, name, updated_at FROM deals ORDER BY updated_at DESC LIMIT 20
    `;
    return NextResponse.json(rows);
  } catch (err) {
    if (dbUnavailable(err)) {
      return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    }
    console.error("[GET /api/deals]", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

// POST /api/deals — create new deal row, returns { id }
export async function POST(req: NextRequest) {
  try {
    const sql = getDb();
    await ensureSchema();
    const body = await req.json();
    const { name, data } = body as { name: string; data: object };
    const rows = await sql`
      INSERT INTO deals (name, data) VALUES (${name}, ${JSON.stringify(data)})
      RETURNING id, created_at
    `;
    return NextResponse.json(rows[0]);
  } catch (err) {
    if (dbUnavailable(err)) {
      return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
    }
    console.error("[POST /api/deals]", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}
