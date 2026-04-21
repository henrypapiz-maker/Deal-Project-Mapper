import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getAllowedActionsForRole, invalidatePermissionCache, ALL_ACTION_TYPES, DEFAULTS } from "@/lib/agent-permissions";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const rows = await sql`SELECT role, action_type, allowed FROM agents.role_permissions ORDER BY role, action_type`;
    const matrix: Array<{ role: string; actionType: string; allowed: boolean }> = [];
    for (const [role, defaults] of Object.entries(DEFAULTS)) {
      for (const actionType of ALL_ACTION_TYPES) {
        const dbRow = rows.find((r: any) => r.role === role && r.action_type === actionType);
        matrix.push({
          role,
          actionType,
          allowed: dbRow ? dbRow.allowed : (defaults[actionType] ?? false),
        });
      }
    }
    return NextResponse.json({ permissions: matrix, actionTypes: [...ALL_ACTION_TYPES] });
  } catch (e) {
    console.error("permissions GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { role, actionType, allowed } = await req.json();
  if (!role || !actionType || allowed === undefined) {
    return NextResponse.json({ error: "role, actionType, allowed required" }, { status: 400 });
  }
  try {
    await sql`
      INSERT INTO agents.role_permissions (role, action_type, allowed)
      VALUES (${role}, ${actionType}, ${allowed})
      ON CONFLICT (role, action_type) DO UPDATE SET allowed = ${allowed}, updated_at = NOW()
    `;
    invalidatePermissionCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("permissions POST error:", e);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
