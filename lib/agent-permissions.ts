import { getMainSql } from "@/lib/db";

const DEFAULTS: Record<string, Record<string, boolean>> = {
  admin:            { navigate_tab: true,  filter_checklist: true,  update_item_status: true,  assign_owner: true,  bulk_assign_owner: true,  draft_report: true,  generate_snapshot: true,  synthesize_document: true,  save_document: true,  run_skill: true  },
  imo_lead:         { navigate_tab: true,  filter_checklist: true,  update_item_status: true,  assign_owner: true,  bulk_assign_owner: true,  draft_report: true,  generate_snapshot: true,  synthesize_document: true,  save_document: true,  run_skill: true  },
  workstream_lead:  { navigate_tab: true,  filter_checklist: true,  update_item_status: true,  assign_owner: true,  bulk_assign_owner: false, draft_report: true,  generate_snapshot: true,  synthesize_document: true,  save_document: true,  run_skill: false },
  viewer:           { navigate_tab: true,  filter_checklist: true,  update_item_status: false, assign_owner: false, bulk_assign_owner: false, draft_report: false, generate_snapshot: false, synthesize_document: false, save_document: false, run_skill: false },
  external:         { navigate_tab: false, filter_checklist: false, update_item_status: false, assign_owner: false, bulk_assign_owner: false, draft_report: false, generate_snapshot: false, synthesize_document: false, save_document: false, run_skill: false },
};

export const ALL_ACTION_TYPES = [
  "navigate_tab", "filter_checklist", "update_item_status", "assign_owner",
  "bulk_assign_owner", "draft_report", "generate_snapshot",
  "synthesize_document", "save_document", "run_skill",
] as const;

// Simple module-level cache (5-min TTL)
let cache: { data: Record<string, Set<string>>; expiry: number } | null = null;

export async function getAllowedActionsForRole(role: string): Promise<Set<string>> {
  const now = Date.now();
  if (cache && cache.expiry > now && cache.data[role]) {
    return cache.data[role];
  }

  const sql = getMainSql();
  const rows = await sql`SELECT role, action_type, allowed FROM agents.role_permissions`;

  const map: Record<string, Set<string>> = {};
  for (const [r, perms] of Object.entries(DEFAULTS)) {
    map[r] = new Set(Object.entries(perms).filter(([, v]) => v).map(([k]) => k));
  }
  for (const row of rows) {
    if (!map[row.role]) map[row.role] = new Set();
    if (row.allowed) map[row.role].add(row.action_type);
    else map[row.role].delete(row.action_type);
  }

  cache = { data: map, expiry: now + 5 * 60 * 1000 };
  return map[role] ?? new Set();
}

export function invalidatePermissionCache() {
  cache = null;
}

export { DEFAULTS };
