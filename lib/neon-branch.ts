/**
 * lib/neon-branch.ts
 *
 * Neon Management API wrapper for per-deal branch lifecycle.
 *
 * Architecture
 * ────────────
 *   main branch  → master_catalogue (seeded baseline) + deals registry
 *   deal branch  → all deal-specific tables (checklist_items, risk_alerts, …)
 *
 * Every new deal gets its own Neon branch forked from main at creation time.
 * The branch inherits the master_catalogue snapshot and provides isolated
 * working storage for that deal's execution data.
 *
 * Env vars required (both must be set to enable branching):
 *   NEON_API_KEY     — Neon Management API key (console.neon.tech → Account → API keys)
 *   NEON_PROJECT_ID  — Project ID shown in the Neon console URL / Project settings
 *
 * When either var is absent the app falls back to writing everything on main
 * (backward-compatible mode).
 */

import { neon } from "@neondatabase/serverless";

const NEON_API_BASE = "https://console.neon.tech/api/v2";

function apiKey(): string {
  const k = process.env.NEON_API_KEY;
  if (!k) throw new Error("NEON_API_KEY env var is not set");
  return k;
}

function projectId(): string {
  const p = process.env.NEON_PROJECT_ID;
  if (!p) throw new Error("NEON_PROJECT_ID env var is not set");
  return p;
}

export interface BranchResult {
  branchId: string;   // Neon branch ID, e.g. "br_xxxxxxxxxx"
  branchUrl: string;  // Pooler connection string for this branch
}

/**
 * Create a Neon branch from the main branch for a deal.
 *
 * Branch name: `deal-{dealId}` (UUID as slug).
 * A read_write compute endpoint is provisioned automatically.
 *
 * The pooler connection string is derived from the main DATABASE_URL
 * credentials + new endpoint host; no separate credential lookup needed.
 */
export async function createDealBranch(dealId: string): Promise<BranchResult> {
  const res = await fetch(
    `${NEON_API_BASE}/projects/${projectId()}/branches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        branch: { name: `deal-${dealId}` },
        // suspend_timeout_seconds: keep compute warm for 1 hour after last connection.
        // Default is 5 min — too short for a typical working session.
        // Eliminates cold-start latency (1–3 s) for deals accessed the same day.
        endpoints: [{ type: "read_write", suspend_timeout_seconds: 3600 }],
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Neon branch creation failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const branchId: string = data.branch.id;
  const endpointHost: string = data.endpoints[0].host;

  // Convert direct endpoint host → pooler host
  // "ep-xyz.c-4.us-east-1.aws.neon.tech"
  //   → "ep-xyz-pooler.c-4.us-east-1.aws.neon.tech"
  const poolerHost = endpointHost.replace(/^([^.]+)/, "$1-pooler");

  // Re-use role credentials from DATABASE_URL (same role across all branches)
  const mainUrl = new URL(process.env.DATABASE_URL!);
  const branchUrl = `postgresql://${mainUrl.username}:${mainUrl.password}@${poolerHost}${mainUrl.pathname}?sslmode=require`;

  return { branchId, branchUrl };
}

/**
 * Delete a Neon branch (and its compute endpoint) by branch ID.
 * Silently succeeds if the branch no longer exists (404).
 */
export async function deleteDealBranch(branchId: string): Promise<void> {
  const res = await fetch(
    `${NEON_API_BASE}/projects/${projectId()}/branches/${branchId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Neon branch deletion failed (${res.status}): ${body}`);
  }
}

/**
 * Returns true when NEON_API_KEY and NEON_PROJECT_ID are both present.
 * When false, the app writes everything to main (backward-compatible).
 */
export function isBranchingEnabled(): boolean {
  return !!(process.env.NEON_API_KEY && process.env.NEON_PROJECT_ID);
}

/**
 * Pre-warm a branch connection with a lightweight query.
 *
 * Neon compute scales to zero when idle; the first query triggers a cold start
 * that may take 1–3 s. Call this proactively (e.g., when the deal portfolio
 * loads) to wake the compute before the user opens a specific deal.
 *
 * Safe to call fire-and-forget — errors are swallowed since warm-up failure
 * should never block the UX.
 */
export async function warmBranchConnection(branchUrl: string): Promise<void> {
  try {
    const sql = neon(branchUrl);
    await sql`SELECT 1`;
  } catch {
    // Non-fatal — compute will wake on the next real request
  }
}
