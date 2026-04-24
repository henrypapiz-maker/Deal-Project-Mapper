import { NextRequest, NextResponse } from "next/server";
import { getMainSql } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sql = getMainSql();
  const name = req.nextUrl.searchParams.get("name");
  try {
    if (name) {
      const [row] = await sql`SELECT * FROM agents.skills WHERE name = ${name}`;
      return row
        ? NextResponse.json({ skill: row })
        : NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const rows = await sql`SELECT * FROM agents.skills ORDER BY name ASC`;
    return NextResponse.json({ skills: rows });
  } catch (e) {
    console.error("skills GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sql = getMainSql();
  const { name, description, steps = [] } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const [row] = await sql`
      INSERT INTO agents.skills (name, description, steps)
      VALUES (${name}, ${description ?? null}, ${JSON.stringify(steps)})
      RETURNING *
    `;
    return NextResponse.json({ skill: row });
  } catch (e: any) {
    if (e.message?.includes("unique")) {
      return NextResponse.json({ error: "name_exists" }, { status: 409 });
    }
    console.error("skills POST error:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const sql = getMainSql();
  const { id, name, description, steps } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const [row] = await sql`
      UPDATE agents.skills
      SET name        = COALESCE(${name ?? null}, name),
          description = COALESCE(${description ?? null}, description),
          steps       = COALESCE(${steps ? JSON.stringify(steps) : null}::jsonb, steps),
          updated_at  = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ skill: row });
  } catch (e) {
    console.error("skills PATCH error:", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sql = getMainSql();
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await sql`DELETE FROM agents.skills WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("skills DELETE error:", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
