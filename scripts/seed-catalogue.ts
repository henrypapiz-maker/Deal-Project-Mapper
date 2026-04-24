/**
 * scripts/seed-catalogue.ts
 *
 * Deterministic upsert of the master catalogue into Neon DB.
 *
 * Merges:
 *   lib/checklist-master.ts   → 529 base items
 *   lib/catalogue-metadata.ts → must-have flags, sector affinity, node IDs
 *
 * Run:
 *   npm run seed             — full upsert + JSON snapshot
 *   npm run seed:dry         — JSON snapshot only, no DB writes
 *
 * The resulting master_catalogue table is the "main branch" foundation
 * for the Neon DB branching architecture (Phase 3).
 */

import { neon } from "@neondatabase/serverless";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { MASTER_CHECKLIST } from "../lib/checklist-master";
import {
  MUST_HAVE_ITEM_IDS,
  SECTOR_WORKSTREAM_AFFINITY,
  SECTOR_SECTION_AFFINITY,
  WORKSTREAM_CAPABILITY_NODES,
  WORKSTREAM_CANONICAL_CODES,
  WORKSTREAM_DISPLAY_ORDER,
} from "../lib/catalogue-metadata";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Config ─────────────────────────────────────────────────────────────────

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_M5Lgd3PWBoqe@ep-ancient-mountain-ai7vu90g-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require";

const IS_DRY_RUN = process.argv.includes("--dry-run");

// ── Maturity-sensitive workstreams ─────────────────────────────────────────
// Layer 2 priority calibration adjusts items in these workstreams based on
// buyer maturity (first-time acquirer → elevate; serial acquirer → reduce).
const MATURITY_SENSITIVE_WORKSTREAMS = new Set([
  "Integration Management",
  "IT Strategy & Governance",
  "Controls",
  "Governance & Compliance",
  "Go-To-Market",
  "Carve-Out / Separation",
]);

// ── Seed record type ────────────────────────────────────────────────────────
export interface SeedRecord {
  itemId: string;
  workstream: string;
  section: string;
  description: string;
  phase: string;
  priority: string;
  tsaRelevant: boolean;
  crossBorderFlag: boolean;
  riskIndicators: string[];
  functionalArea: string;
  dependencies: string[];
  // Metadata overlay
  nodeId: string;           // Item-level capability node (specific for must-haves)
  capabilityNode: string;   // Workstream-level node (always from WORKSTREAM_CAPABILITY_NODES)
  mustHave: boolean;
  mustHaveReason: string | null;
  sectorAffinity: string[]; // Union of workstream + section affinities
  maturitySensitive: boolean;
}

// ── Merge function ──────────────────────────────────────────────────────────
function buildSeedRecord(item: (typeof MASTER_CHECKLIST)[0]): SeedRecord {
  // Must-have metadata
  const mustHaveEntry = MUST_HAVE_ITEM_IDS[item.itemId];
  const mustHave      = !!mustHaveEntry;
  const mustHaveReason = mustHaveEntry?.reason ?? null;

  // Node IDs
  const capabilityNode = WORKSTREAM_CAPABILITY_NODES[item.workstream] ?? "GENERAL";
  const nodeId         = mustHaveEntry?.nodeId ?? capabilityNode;

  // Sector affinity — union of workstream-level and section-level affinities
  const wsAffinity  = SECTOR_WORKSTREAM_AFFINITY[item.workstream] ?? [];
  const secAffinity = SECTOR_SECTION_AFFINITY[item.section]       ?? [];
  const sectorAffinity = Array.from(new Set([...wsAffinity, ...secAffinity]));

  // Maturity sensitivity
  const maturitySensitive = MATURITY_SENSITIVE_WORKSTREAMS.has(item.workstream);

  return {
    itemId:           item.itemId,
    workstream:       item.workstream,
    section:          item.section,
    description:      item.description,
    phase:            item.phase,
    priority:         item.priority,
    tsaRelevant:      item.tsaRelevant,
    crossBorderFlag:  item.crossBorderFlag,
    riskIndicators:   item.riskIndicators as string[],
    functionalArea:   item.functionalArea,
    dependencies:     item.dependencies,
    nodeId,
    capabilityNode,
    mustHave,
    mustHaveReason,
    sectorAffinity,
    maturitySensitive,
  };
}

// ── Validation ──────────────────────────────────────────────────────────────
function validateRecords(records: SeedRecord[]): void {
  const errors: string[] = [];

  const ids = new Set<string>();
  for (const r of records) {
    if (!r.itemId)       errors.push(`Empty itemId at position ${records.indexOf(r)}`);
    if (!r.description?.trim()) errors.push(`Empty description: ${r.itemId}`);
    if (!r.workstream)   errors.push(`Empty workstream: ${r.itemId}`);
    if (!r.phase)        errors.push(`Empty phase: ${r.itemId}`);
    if (!r.priority)     errors.push(`Empty priority: ${r.itemId}`);
    if (ids.has(r.itemId)) errors.push(`Duplicate itemId: ${r.itemId}`);
    ids.add(r.itemId);
  }

  if (errors.length > 0) {
    console.error("\n❌ Validation errors:");
    errors.forEach(e => console.error(`   ${e}`));
    process.exit(1);
  }
}

// ── Statistics reporter ─────────────────────────────────────────────────────
function printStats(records: SeedRecord[]): void {
  const mustHaveCount       = records.filter(r => r.mustHave).length;
  const withSectorAffinity  = records.filter(r => r.sectorAffinity.length > 0).length;
  const maturitySensCount   = records.filter(r => r.maturitySensitive).length;
  const crossBorderCount    = records.filter(r => r.crossBorderFlag).length;
  const tsaCount            = records.filter(r => r.tsaRelevant).length;

  const wsCounts: Record<string, number> = {};
  records.forEach(r => { wsCounts[r.workstream] = (wsCounts[r.workstream] || 0) + 1; });

  const nodeCounts: Record<string, number> = {};
  records.forEach(r => { nodeCounts[r.capabilityNode] = (nodeCounts[r.capabilityNode] || 0) + 1; });

  console.log("\n📊  Catalogue Statistics");
  console.log("─".repeat(60));
  console.log(`  Total items:           ${records.length}`);
  console.log(`  Must-have items:       ${mustHaveCount}  (adversarial guards)`);
  console.log(`  With sector affinity:  ${withSectorAffinity}`);
  console.log(`  Maturity-sensitive:    ${maturitySensCount}`);
  console.log(`  TSA-relevant:          ${tsaCount}`);
  console.log(`  Cross-border flagged:  ${crossBorderCount}`);

  // Print in canonical Revenue → Ops → Back-office display order with codes
  const TRACK_LABELS: Record<string, string> = {
    "Go-To-Market":                        "Revenue Track",
    "Product & R&D":                       "Revenue Track",
    "Supply Chain & Ops":                  "Operational Track",
    "Capital Projects":                    "Operational Track",
    "Facilities":                          "Operational Track",
    "Integration Management":              "Operational Track",
    "Human Resources":                     "People & Legal",
    "Legal":                               "People & Legal",
    "Communications":                      "People & Legal",
    "Treasury":                            "Finance Track",
    "Operational Finance":                 "Finance Track",
    "FP&A":                                "Finance Track",
    "Financial Reporting & Consolidation": "Finance Track",
    "Technical Accounting":                "Finance Track",
    "Income Tax":                          "Finance Track",
    "TSA":                                 "Finance Track",
    "Controls":                            "Controls & Governance",
    "Governance & Compliance":             "Controls & Governance",
    "IT Strategy & Governance":            "IT Track",
    "IT > Enterprise Systems":             "IT Track",
    "IT > Infrastructure":                 "IT Track",
    "IT > Data & Analytics":               "IT Track",
    "IT > IT Vendor Management":           "IT Track",
    "IT > Client-Facing & Digital":        "IT Track",
    "ESG":                                 "Sustainability",
    "Carve-Out / Separation":              "Conditional",
  };

  console.log("\n📂  Workstream Breakdown  (Revenue → Operational → Finance → Controls/IT)");
  console.log("─".repeat(60));
  let lastTrack = "";
  for (const ws of WORKSTREAM_DISPLAY_ORDER) {
    const count = wsCounts[ws] ?? 0;
    const code  = WORKSTREAM_CANONICAL_CODES[ws] ?? "???";
    const track = TRACK_LABELS[ws] ?? "";
    if (track !== lastTrack) {
      console.log(`\n  ── ${track} ──`);
      lastTrack = track;
    }
    console.log(`  ${String(count).padStart(3)}  [${code.padEnd(3)}]  ${ws}`);
  }
  // Any workstreams not in display order (safety net)
  const unordered = Object.keys(wsCounts).filter(ws => !WORKSTREAM_DISPLAY_ORDER.includes(ws));
  if (unordered.length) {
    console.log(`\n  ── Unordered (add to WORKSTREAM_DISPLAY_ORDER) ──`);
    unordered.forEach(ws => console.log(`  ${String(wsCounts[ws]).padStart(3)}  [???]  ${ws}`));
  }

  console.log("\n🗂   Capability Node Coverage");
  console.log("─".repeat(60));
  Object.entries(nodeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([node, n]) => console.log(`  ${String(n).padStart(3)}  ${node}`));
}

// ── JSON snapshot ───────────────────────────────────────────────────────────
function writeSnapshot(records: SeedRecord[]): void {
  const dataDir  = resolve(__dirname, "../data");
  const jsonPath = resolve(dataDir, "master-catalogue.json");

  mkdirSync(dataDir, { recursive: true });

  // Build workstream counts in canonical display order
  const rawWsCounts: Record<string, number> = {};
  records.forEach(r => { rawWsCounts[r.workstream] = (rawWsCounts[r.workstream] || 0) + 1; });
  const orderedWorkstreams: Record<string, { code: string; count: number }> = {};
  for (const ws of WORKSTREAM_DISPLAY_ORDER) {
    orderedWorkstreams[ws] = {
      code:  WORKSTREAM_CANONICAL_CODES[ws] ?? "???",
      count: rawWsCounts[ws] ?? 0,
    };
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    totalItems:  records.length,
    statistics: {
      mustHaveCount:      records.filter(r => r.mustHave).length,
      withSectorAffinity: records.filter(r => r.sectorAffinity.length > 0).length,
      maturitySensitive:  records.filter(r => r.maturitySensitive).length,
      tsaRelevant:        records.filter(r => r.tsaRelevant).length,
      crossBorder:        records.filter(r => r.crossBorderFlag).length,
    },
    // Workstreams in canonical Revenue → Ops → Back-office order
    workstreams: orderedWorkstreams,
    items: records,
  };

  writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n✓  Snapshot written → data/master-catalogue.json  (${records.length} items)`);
}

// ── DB upsert ───────────────────────────────────────────────────────────────
async function seedDatabase(records: SeedRecord[]): Promise<void> {
  const sql = neon(DATABASE_URL);

  console.log(`\n🌱  Seeding master_catalogue (${records.length} items)…`);

  let upserted = 0;
  const BATCH = 50;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);

    for (const r of batch) {
      await sql`
        INSERT INTO master_catalogue (
          item_id, workstream, section, description, phase, priority,
          tsa_relevant, cross_border_flag, risk_indicators,
          functional_area, dependencies,
          node_id, capability_node,
          must_have, must_have_reason,
          sector_affinity, maturity_sensitive,
          updated_at
        ) VALUES (
          ${r.itemId},
          ${r.workstream},
          ${r.section},
          ${r.description},
          ${r.phase},
          ${r.priority},
          ${r.tsaRelevant},
          ${r.crossBorderFlag},
          ${JSON.stringify(r.riskIndicators)},
          ${r.functionalArea},
          ${JSON.stringify(r.dependencies)},
          ${r.nodeId},
          ${r.capabilityNode},
          ${r.mustHave},
          ${r.mustHaveReason},
          ${JSON.stringify(r.sectorAffinity)},
          ${r.maturitySensitive},
          NOW()
        )
        ON CONFLICT (item_id) DO UPDATE SET
          workstream         = EXCLUDED.workstream,
          section            = EXCLUDED.section,
          description        = EXCLUDED.description,
          phase              = EXCLUDED.phase,
          priority           = EXCLUDED.priority,
          tsa_relevant       = EXCLUDED.tsa_relevant,
          cross_border_flag  = EXCLUDED.cross_border_flag,
          risk_indicators    = EXCLUDED.risk_indicators,
          functional_area    = EXCLUDED.functional_area,
          dependencies       = EXCLUDED.dependencies,
          node_id            = EXCLUDED.node_id,
          capability_node    = EXCLUDED.capability_node,
          must_have          = EXCLUDED.must_have,
          must_have_reason   = EXCLUDED.must_have_reason,
          sector_affinity    = EXCLUDED.sector_affinity,
          maturity_sensitive = EXCLUDED.maturity_sensitive,
          updated_at         = EXCLUDED.updated_at,
          version            = master_catalogue.version + 1
      `;
      upserted++;
    }

    const done = Math.min(i + BATCH, records.length);
    process.stdout.write(`\r  ${done}/${records.length} items upserted…`);
  }

  process.stdout.write("\n");

  // Verify DB counts
  const [row] = await sql`SELECT COUNT(*) AS total, SUM(CASE WHEN must_have THEN 1 ELSE 0 END) AS must_haves FROM master_catalogue`;
  console.log(`\n🔍  DB Verification`);
  console.log(`  Rows in master_catalogue:  ${row.total}`);
  console.log(`  Must-have items in DB:     ${row.must_haves}`);

  if (Number(row.total) !== records.length) {
    console.error(`\n⚠️  Count mismatch — expected ${records.length}, found ${row.total}`);
    process.exit(1);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log(`  📦  DealMapper Catalogue Seed${IS_DRY_RUN ? "  [DRY RUN — no DB writes]" : ""}`);
  console.log("═".repeat(60));

  // Build merged records
  const records = MASTER_CHECKLIST.map(buildSeedRecord);

  // Validate
  console.log("\n🔎  Validating records…");
  validateRecords(records);
  console.log("  ✓  No validation errors");

  // Print statistics
  printStats(records);

  // Write JSON snapshot (always — even in dry-run)
  writeSnapshot(records);

  if (IS_DRY_RUN) {
    console.log("\n[DRY RUN] — skipping database upsert. Run 'npm run seed' to apply.\n");
    return;
  }

  // Seed DB
  await seedDatabase(records);

  console.log("\n✅  Catalogue seed complete!\n");
  console.log("Next steps:");
  console.log("  1. npm run validate      — confirm engine still reads correctly");
  console.log("  2. Generate a deal       — checklist will render from this baseline");
  console.log("  3. Phase 3               — Neon branching: main = this seeded state\n");
}

main().catch(e => {
  console.error("\n❌  Seed failed:", e);
  process.exit(1);
});
