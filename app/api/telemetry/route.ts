import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/**
 * GET /api/telemetry?dealId=<uuid>&limit=<n>
 *   Returns api_telemetry rows for a deal (or global if no dealId).
 *
 * GET /api/telemetry/overrides?dealId=<uuid>
 *   Returns override_log rows for a deal.
 */
export async function GET(req: NextRequest) {
  const dealId = req.nextUrl.searchParams.get("dealId");
  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "100", 10);
  const limit = Math.min(limitParam, 500);
  const type = req.nextUrl.searchParams.get("type") ?? "api"; // 'api' | 'overrides'

  try {
    if (type === "overrides") {
      const rows = dealId
        ? await sql`SELECT * FROM override_log WHERE deal_id = ${dealId} ORDER BY created_at DESC LIMIT ${limit}`
        : await sql`SELECT * FROM override_log ORDER BY created_at DESC LIMIT ${limit}`;
      return NextResponse.json({ overrides: rows });
    }

    // Default: api_telemetry
    const rows = dealId
      ? await sql`SELECT * FROM api_telemetry WHERE deal_id = ${dealId} ORDER BY created_at DESC LIMIT ${limit}`
      : await sql`SELECT * FROM api_telemetry ORDER BY created_at DESC LIMIT ${limit}`;

    // Aggregate summary
    const totalCalls = rows.length;
    const totalInputTokens  = rows.reduce((s: number, r: any) => s + (r.input_tokens  ?? 0), 0);
    const totalOutputTokens = rows.reduce((s: number, r: any) => s + (r.output_tokens ?? 0), 0);
    const avgLatency = totalCalls
      ? Math.round(rows.reduce((s: number, r: any) => s + (r.latency_ms ?? 0), 0) / totalCalls)
      : 0;

    return NextResponse.json({
      telemetry: rows,
      summary: { totalCalls, totalInputTokens, totalOutputTokens, avgLatency },
    });
  } catch (e) {
    console.error("telemetry GET error:", e);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
}

/**
 * POST /api/telemetry — log a single API call event
 * Called fire-and-forget from server routes; no auth check needed (internal).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      dealId, callType, model, inputTokens, outputTokens,
      latencyMs, actionsTaken, docType, status, errorMsg,
    } = body;

    await sql`
      INSERT INTO api_telemetry (
        deal_id, call_type, model, input_tokens, output_tokens,
        latency_ms, actions_taken, doc_type, status, error_msg
      ) VALUES (
        ${dealId ?? null},
        ${callType ?? "assistant"},
        ${model ?? null},
        ${inputTokens ?? null},
        ${outputTokens ?? null},
        ${latencyMs ?? null},
        ${JSON.stringify(actionsTaken ?? [])},
        ${docType ?? null},
        ${status ?? "ok"},
        ${errorMsg ?? null}
      )
    `;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    console.error("telemetry POST error:", e);
    return NextResponse.json({ error: "log_failed" }, { status: 500 });
  }
}
