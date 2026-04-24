/**
 * scripts/validate-catalogue.ts
 *
 * Permanent catalogue linter — enforces data integrity rules on
 * lib/checklist-master.ts and lib/catalogue-metadata.ts.
 *
 * Rules:
 *   1. No duplicate item IDs
 *   2. Item ID prefix matches WORKSTREAM_CANONICAL_CODES[workstream]
 *   3. No orphaned dependencies (every dep ID exists in the item set)
 *   4. No orphaned metadata (every MUST_HAVE_ITEM_IDS key exists in checklist)
 *   5. Must-have completeness (every entry has a non-empty reason)
 *
 * Add to package.json:  "validate:catalogue": "tsx scripts/validate-catalogue.ts"
 * Run after any edit to checklist-master.ts or catalogue-metadata.ts.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  MUST_HAVE_ITEM_IDS,
  WORKSTREAM_CANONICAL_CODES,
} from "../lib/catalogue-metadata";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECKLIST_PATH = path.resolve(__dirname, "../lib/checklist-master.ts");

interface ParsedItem {
  itemId: string;
  workstream: string;
  dependencies: string[];
  lineNumber: number;
}

// ── Parse checklist-master.ts as text ────────────────────────────────────────
function parseChecklist(): ParsedItem[] {
  const text  = fs.readFileSync(CHECKLIST_PATH, "utf-8");
  const lines = text.split("\n");
  const items: ParsedItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const idMatch  = line.match(/itemId:\s*"([A-Z]+-\d{4})"/);
    const wsMatch  = line.match(/workstream:\s*"([^"]+)"/);
    if (!idMatch || !wsMatch) continue;

    // Extract dependencies array from the same line
    // Format: dependencies: ["FRC-0001", "FRC-0002"]  or  dependencies: []
    const depsMatch = line.match(/dependencies:\s*\[([^\]]*)\]/);
    const dependencies: string[] = [];
    if (depsMatch && depsMatch[1].trim()) {
      const depStrings = depsMatch[1].match(/"([A-Z]+-\d{4})"/g) ?? [];
      dependencies.push(...depStrings.map(s => s.replace(/"/g, "")));
    }

    items.push({
      itemId:      idMatch[1],
      workstream:  wsMatch[1],
      dependencies,
      lineNumber:  i + 1,
    });
  }

  return items;
}

// ── Run all rules ─────────────────────────────────────────────────────────────
function runLinter(): void {
  console.log("\n" + "═".repeat(60));
  console.log("  DealMapper — Catalogue Linter");
  console.log("═".repeat(60));

  const items   = parseChecklist();
  const idSet   = new Set(items.map(i => i.itemId));
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log(`\n🔎  Parsed ${items.length} items from lib/checklist-master.ts`);

  // Rule 1: No duplicate item IDs
  const seen = new Map<string, number>();
  for (const { itemId, lineNumber } of items) {
    if (seen.has(itemId)) {
      errors.push(`[Rule 1] Duplicate itemId "${itemId}" at line ${lineNumber} (first at line ${seen.get(itemId)})`);
    } else {
      seen.set(itemId, lineNumber);
    }
  }

  // Rule 2: Canonical prefix
  for (const { itemId, workstream, lineNumber } of items) {
    const expectedPrefix = WORKSTREAM_CANONICAL_CODES[workstream];
    if (!expectedPrefix) {
      warnings.push(`[Rule 2] Unknown workstream "${workstream}" for item ${itemId} (line ${lineNumber}) — add to WORKSTREAM_CANONICAL_CODES`);
      continue;
    }
    const actualPrefix = itemId.split("-")[0];
    if (actualPrefix !== expectedPrefix) {
      errors.push(`[Rule 2] ${itemId} (line ${lineNumber}): prefix should be "${expectedPrefix}-" for workstream "${workstream}", got "${actualPrefix}-"`);
    }
  }

  // Rule 3: No orphaned dependencies
  for (const { itemId, dependencies, lineNumber } of items) {
    for (const depId of dependencies) {
      if (!idSet.has(depId)) {
        errors.push(`[Rule 3] ${itemId} (line ${lineNumber}) depends on "${depId}" which does not exist`);
      }
    }
  }

  // Rule 4: No orphaned metadata keys
  for (const metaId of Object.keys(MUST_HAVE_ITEM_IDS)) {
    if (!idSet.has(metaId)) {
      errors.push(`[Rule 4] MUST_HAVE_ITEM_IDS key "${metaId}" does not exist in checklist-master.ts`);
    }
  }

  // Rule 5: Must-have completeness
  for (const [metaId, entry] of Object.entries(MUST_HAVE_ITEM_IDS)) {
    if (!entry.reason || entry.reason.trim().length === 0) {
      errors.push(`[Rule 5] MUST_HAVE_ITEM_IDS["${metaId}"] has an empty reason — adversarial modal will show no context`);
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  const mustHaveCount = Object.keys(MUST_HAVE_ITEM_IDS).length;

  // Quick canonical prefix coverage stats
  const prefixCounts: Record<string, number> = {};
  for (const { itemId } of items) {
    const p = itemId.split("-")[0];
    prefixCounts[p] = (prefixCounts[p] || 0) + 1;
  }

  console.log("\n📊  Prefix Coverage");
  console.log("─".repeat(40));
  for (const [prefix, count] of Object.entries(prefixCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${prefix}-`);
  }

  console.log(`\n  Total items:     ${items.length}`);
  console.log(`  Must-have items: ${mustHaveCount}`);
  console.log(`  Unique prefixes: ${Object.keys(prefixCounts).length}`);

  if (warnings.length) {
    console.log("\n⚠️   Warnings:");
    warnings.forEach(w => console.warn(`   ${w}`));
  }

  if (errors.length) {
    console.error(`\n🚨  ${errors.length} error${errors.length !== 1 ? "s" : ""} found:`);
    errors.forEach(e => console.error(`   ❌  ${e}`));
    console.error("\nFix lib/checklist-master.ts or lib/catalogue-metadata.ts before seeding.\n");
    process.exit(1);
  }

  console.log("\n✅  Catalogue is clean. Ready for database seeding.\n");
}

runLinter();
