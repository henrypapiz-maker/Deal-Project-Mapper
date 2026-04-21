import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  try {
    const rows = dealId
      ? await sql`SELECT * FROM agents.prompt_library WHERE is_global = true OR deal_id = ${dealId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM agents.prompt_library WHERE is_global = true ORDER BY created_at DESC`;
    return NextResponse.json({ prompts: rows });
  } catch (e) {
    console.error("prompts GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { name, text, category, isGlobal = false, dealId, createdBy } = await req.json();
  if (!name || !text) return NextResponse.json({ error: "name and text required" }, { status: 400 });
  try {
    const [row] = await sql`
      INSERT INTO agents.prompt_library (name, text, category, is_global, deal_id, created_by)
      VALUES (${name}, ${text}, ${category ?? null}, ${isGlobal}, ${dealId ?? null}, ${createdBy ?? null})
      RETURNING *
    `;
    return NextResponse.json({ prompt: row });
  } catch (e) {
    console.error("prompts POST error:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { id, name, text, category } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const [row] = await sql`
      UPDATE agents.prompt_library
      SET name = COALESCE(${name ?? null}, name),
          text = COALESCE(${text ?? null}, text),
          category = COALESCE(${category ?? null}, category),
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ prompt: row });
  } catch (e) {
    console.error("prompts PATCH error:", e);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    await sql`DELETE FROM agents.prompt_library WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("prompts DELETE error:", e);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
