import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// Run schema migration idempotently — adds new columns if they don't exist
async function runMigration() {
  try {
    await sql`
      ALTER TABLE agents.prompt_library
        ADD COLUMN IF NOT EXISTS role             TEXT,
        ADD COLUMN IF NOT EXISTS context_source   JSONB,
        ADD COLUMN IF NOT EXISTS output_format    TEXT,
        ADD COLUMN IF NOT EXISTS example_output   TEXT,
        ADD COLUMN IF NOT EXISTS reasoning_steps  JSONB
    `;
  } catch {
    // Silently skip — table may not exist in dev/offline environments
  }
}

let migrationRan = false;
async function ensureMigration() {
  if (!migrationRan) {
    await runMigration();
    migrationRan = true;
  }
}

function mapRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    text: row.text,
    category: row.category ?? null,
    isGlobal: row.is_global,
    createdAt: row.created_at,
    role: row.role ?? null,
    contextSource: row.context_source ?? null,
    outputFormat: row.output_format ?? null,
    exampleOutput: row.example_output ?? null,
    reasoningSteps: row.reasoning_steps ?? null,
  };
}

export async function GET(req: NextRequest) {
  await ensureMigration();
  const dealId = req.nextUrl.searchParams.get("dealId");
  try {
    const rows = dealId
      ? await sql`SELECT * FROM agents.prompt_library WHERE is_global = true OR deal_id = ${dealId} ORDER BY created_at DESC`
      : await sql`SELECT * FROM agents.prompt_library WHERE is_global = true ORDER BY created_at DESC`;
    return NextResponse.json({ prompts: rows.map(mapRow) });
  } catch (e) {
    console.error("prompts GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  await ensureMigration();
  const {
    name, text, category, isGlobal = false, dealId, createdBy,
    role, contextSource, outputFormat, exampleOutput, reasoningSteps,
  } = await req.json();
  if (!name || !text) return NextResponse.json({ error: "name and text required" }, { status: 400 });
  try {
    const [row] = await sql`
      INSERT INTO agents.prompt_library
        (name, text, category, is_global, deal_id, created_by,
         role, context_source, output_format, example_output, reasoning_steps)
      VALUES
        (${name}, ${text}, ${category ?? null}, ${isGlobal}, ${dealId ?? null}, ${createdBy ?? null},
         ${role ?? null}, ${contextSource ? JSON.stringify(contextSource) : null},
         ${outputFormat ?? null}, ${exampleOutput ?? null},
         ${reasoningSteps ? JSON.stringify(reasoningSteps) : null})
      RETURNING *
    `;
    return NextResponse.json({ prompt: mapRow(row) });
  } catch (e) {
    console.error("prompts POST error:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await ensureMigration();
  const {
    id, name, text, category,
    role, contextSource, outputFormat, exampleOutput, reasoningSteps,
  } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const [row] = await sql`
      UPDATE agents.prompt_library
      SET name             = COALESCE(${name ?? null}, name),
          text             = COALESCE(${text ?? null}, text),
          category         = COALESCE(${category ?? null}, category),
          role             = ${role !== undefined ? (role ?? null) : sql`role`},
          context_source   = ${contextSource !== undefined ? (contextSource ? JSON.stringify(contextSource) : null) : sql`context_source`},
          output_format    = ${outputFormat !== undefined ? (outputFormat ?? null) : sql`output_format`},
          example_output   = ${exampleOutput !== undefined ? (exampleOutput ?? null) : sql`example_output`},
          reasoning_steps  = ${reasoningSteps !== undefined ? (reasoningSteps ? JSON.stringify(reasoningSteps) : null) : sql`reasoning_steps`},
          updated_at       = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return NextResponse.json({ prompt: mapRow(row) });
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
