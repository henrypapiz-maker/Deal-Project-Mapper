// ============================================================
// DealMapper — Catalogue Review Engine: Eval Checkpoint Harness
// ============================================================
// Validates each of the 8 plan verification points and 5 workflow
// integrity guards against reviewCatalogue() and generateDeal().
//
// Run:   npx tsx scripts/eval-checkpoints.ts
// Or:    npm run validate
// ============================================================

import { reviewCatalogue } from "../lib/catalogue-review";
import { generateDeal } from "../lib/decision-tree";
import { MASTER_CHECKLIST } from "../lib/checklist-master";
import type { DealIntake, ParentProfile } from "../lib/types";

// ── Minimal valid base intake ─────────────────────────────────────────────────
const BASE: DealIntake = {
  dealName: "Eval Test Deal",
  dealStructure: "stock_purchase",
  integrationModel: "fully_integrated",
  closeDate: "2025-09-01",
  functionalScope: ["all"],
  crossBorder: false,
  jurisdictions: [],
  tsaRequired: "tbd",
  industrySector: "",
  dealValueRange: "$50M–$250M",
  targetEntities: 1,
  targetGaap: "US GAAP",
  targetErp: "SAP",
  buyerMaturity: "occasional",
};

// ── Test runner ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(
  name: string,
  condition: boolean,
  detail: string,
): void {
  if (condition) {
    console.log(`  ✓  ${name}`);
    passed++;
  } else {
    console.error(`  ✗  ${name}`);
    console.error(`     Detail: ${detail}`);
    failed++;
    failures.push(`${name} — ${detail}`);
  }
}

function section(title: string): void {
  console.log(`\n${"─".repeat(66)}`);
  console.log(`  ${title}`);
  console.log("─".repeat(66));
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN CHECKPOINTS (from verification section of the implementation plan)
// ─────────────────────────────────────────────────────────────────────────────

section("CHECKPOINT 1 — Carve-Out TSA Bug Fix (Layer 2: carve_out_tsa_elevation)");
{
  const intake: DealIntake = { ...BASE, dealStructure: "carve_out", tsaRequired: "yes" };
  const result = reviewCatalogue(intake);

  const tsaDay1Items = MASTER_CHECKLIST.filter(
    (i) => i.workstream === "TSA" && i.phase === "day_1" && !result.naItemIds.has(i.itemId)
  );

  assert(
    "TSA Day 1 items are NOT excluded when carve_out + tsaRequired=yes",
    tsaDay1Items.length > 0,
    `Expected TSA Day 1 items to be active; found ${tsaDay1Items.length}`,
  );

  const elevatedToC = tsaDay1Items.filter(
    (i) => result.priorityOverrides.get(i.itemId) === "critical"
  );
  assert(
    "TSA Day 1 items are elevated to critical",
    elevatedToC.length > 0,
    `${elevatedToC.length}/${tsaDay1Items.length} TSA Day 1 items at critical — expected > 0`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "carve_out_tsa_elevation");
  assert(
    "Generation log records carve_out_tsa_elevation rule",
    !!ruleLog,
    "Rule 'carve_out_tsa_elevation' not found in generationLog",
  );

  assert(
    "BUG FIX confirmed: old FRC-00 prefix check would have missed these items",
    tsaDay1Items.every((i) => !i.itemId.startsWith("FRC-00")),
    "Some TSA Day 1 items start with FRC-00 — bug may still be present",
  );
}

section("CHECKPOINT 2 — Standalone IT Exclusion (Layer 1: standalone_it_exclusion)");
{
  const IT_DEEP_SECTIONS = new Set([
    "ERP Migration", "System Cutover", "Application Rationalisation",
    "Data Migration", "Network Integration", "Identity Integration",
  ]);

  const intake: DealIntake = { ...BASE, integrationModel: "standalone" };
  const result = reviewCatalogue(intake);

  const deepItItems = MASTER_CHECKLIST.filter(
    (i) => i.workstream.startsWith("IT >") && IT_DEEP_SECTIONS.has(i.section)
  );

  const excludedDeepIt = deepItItems.filter((i) => result.naItemIds.has(i.itemId));
  assert(
    "Deep IT integration items are marked N/A for standalone model",
    deepItItems.length === 0 || excludedDeepIt.length > 0,
    `${excludedDeepIt.length}/${deepItItems.length} deep IT items excluded`,
  );

  const remainingCritical = MASTER_CHECKLIST.filter(
    (i) => !result.naItemIds.has(i.itemId) &&
      (result.priorityOverrides.get(i.itemId) ?? i.priority) === "critical"
  );
  assert(
    "No active items remain at critical priority for standalone model",
    remainingCritical.length === 0,
    `${remainingCritical.length} items still at critical (expected 0): ${remainingCritical.slice(0,3).map(i => i.itemId).join(", ")}`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "standalone_critical_downgrade");
  assert(
    "Generation log records standalone_critical_downgrade rule",
    !!ruleLog,
    "Rule 'standalone_critical_downgrade' not found in generationLog",
  );
}

section("CHECKPOINT 3 — GAAP Mismatch → FRC/TechAcct Elevation (Layer 3: gaap_conversion_required)");
{
  const parent: ParentProfile = {
    id: "test-parent-1",
    orgName: "AcquirerCo",
    orgType: "corporate",
    parentGaap: "IFRS",
    parentErp: "SAP",
    parentIndustry: "Technology",
  };
  const intake: DealIntake = { ...BASE, targetGaap: "US GAAP" };
  const result = reviewCatalogue(intake, parent);

  const frcItems = MASTER_CHECKLIST.filter(
    (i) => (i.workstream === "Financial Reporting & Consolidation" || i.workstream === "Technical Accounting")
      && !result.naItemIds.has(i.itemId)
  );

  const criticalFrc = frcItems.filter(
    (i) => result.priorityOverrides.get(i.itemId) === "critical"
  );
  assert(
    "FRC + Technical Accounting items elevated to critical on GAAP mismatch",
    criticalFrc.length > 0,
    `${criticalFrc.length}/${frcItems.length} FRC/TechAcct items at critical`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "gaap_conversion_required");
  assert(
    "Generation log records gaap_conversion_required rule",
    !!ruleLog,
    "Rule 'gaap_conversion_required' not found in generationLog",
  );

  assert(
    "GAAP delta signal appears in parameterSignals",
    result.parameterSignals.some((s) => s.parameter === "GAAP delta"),
    "No 'GAAP delta' in parameterSignals",
  );
}

section("CHECKPOINT 4 — Healthcare Data Privacy → Critical (Layer 4: healthcare_data_privacy_critical)");
{
  const DATA_PRIVACY_SECTIONS = new Set([
    "Data Privacy", "GDPR Compliance", "Data Governance", "Patient Data",
    "Clinical Data", "PHI / HIPAA",
  ]);

  const intake: DealIntake = { ...BASE, industrySector: "Healthcare" };
  const result = reviewCatalogue(intake);

  const dataPrivacyItems = MASTER_CHECKLIST.filter(
    (i) => DATA_PRIVACY_SECTIONS.has(i.section) && !result.naItemIds.has(i.itemId)
  );

  if (dataPrivacyItems.length === 0) {
    // No matching items in master — signal check is sufficient
    assert(
      "Healthcare data privacy signal present (no matching section items in master)",
      result.generationLog.some((e) => e.rule === "healthcare_data_privacy_critical"),
      "Rule 'healthcare_data_privacy_critical' not in log",
    );
  } else {
    const criticalDp = dataPrivacyItems.filter(
      (i) => result.priorityOverrides.get(i.itemId) === "critical"
    );
    assert(
      "Data privacy section items elevated to critical for Healthcare",
      criticalDp.length === dataPrivacyItems.length,
      `${criticalDp.length}/${dataPrivacyItems.length} data privacy items at critical`,
    );
  }

  const sectorSignal = result.parameterSignals.find((s) => s.parameter === "industrySector");
  assert(
    "Healthcare sector signal present in parameterSignals",
    !!sectorSignal && sectorSignal.value === "Healthcare",
    `Sector signal: ${JSON.stringify(sectorSignal)}`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "sector_workstream_elevation");
  assert(
    "Sector workstream elevation rule fired for Healthcare",
    !!ruleLog,
    "Rule 'sector_workstream_elevation' not found in generationLog",
  );
}

section("CHECKPOINT 5 — Serial Acquirer Day 30 Compression (Layer 5: −7 days)");
{
  const intake: DealIntake = { ...BASE, buyerMaturity: "serial" };
  const result = reviewCatalogue(intake);

  const day30Items = MASTER_CHECKLIST.filter(
    (i) => i.phase === "day_30" && !result.naItemIds.has(i.itemId)
  );

  assert(
    "Day 30 items exist in the active checklist",
    day30Items.length > 0,
    `No Day 30 items found`,
  );

  const compressedItems = day30Items.filter(
    (i) => result.phaseAdjustments.get(i.itemId) === -7
  );
  assert(
    "All active Day 30 items have −7 day phase adjustment",
    compressedItems.length === day30Items.length,
    `${compressedItems.length}/${day30Items.length} Day 30 items have −7 offset`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "serial_acquirer_day30_compression");
  assert(
    "Generation log records serial_acquirer_day30_compression rule",
    !!ruleLog,
    "Rule 'serial_acquirer_day30_compression' not found in generationLog",
  );

  const signal = result.parameterSignals.find((s) => s.parameter === "buyerMaturity" && s.value === "serial");
  assert(
    "Serial acquirer compress signal in parameterSignals",
    !!signal && signal.signal === "compress",
    `buyerMaturity=serial signal: ${JSON.stringify(signal)}`,
  );
}

section("CHECKPOINT 6 — TSA Items Excluded When Not Required (Layer 1: tsa_not_required)");
{
  const intake: DealIntake = { ...BASE, tsaRequired: "no" };
  const result = reviewCatalogue(intake);

  const tsaItems = MASTER_CHECKLIST.filter((i) => i.tsaRelevant);
  const excludedTsaItems = tsaItems.filter((i) => result.naItemIds.has(i.itemId));

  assert(
    "All TSA-relevant items are excluded when tsaRequired=no",
    excludedTsaItems.length === tsaItems.length,
    `${excludedTsaItems.length}/${tsaItems.length} TSA items excluded`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "tsa_not_required");
  assert(
    "Generation log records tsa_not_required rule",
    !!ruleLog,
    "Rule 'tsa_not_required' not found in generationLog",
  );

  assert(
    "Exclude signal present for tsaRequired=no",
    result.parameterSignals.some((s) => s.parameter === "tsaRequired" && s.signal === "exclude"),
    "No 'tsaRequired=no' exclude signal in parameterSignals",
  );
}

section("CHECKPOINT 7 — ERP Mismatch → IT-ENT Elevation (Layer 3: erp_migration_required)");
{
  const parent: ParentProfile = {
    id: "test-parent-2",
    orgName: "AcquirerCo",
    orgType: "corporate",
    parentGaap: "US GAAP",
    parentErp: "SAP",
    parentIndustry: "Technology",
  };
  const intake: DealIntake = { ...BASE, targetGaap: "US GAAP", targetErp: "Oracle" };
  const result = reviewCatalogue(intake, parent);

  const entItems = MASTER_CHECKLIST.filter(
    (i) => i.workstream === "IT > Enterprise Systems" && !result.naItemIds.has(i.itemId)
  );

  const elevatedEnt = entItems.filter((i) => {
    const override = result.priorityOverrides.get(i.itemId);
    if (!override) return false;
    const ranks: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
    return ranks[override] > ranks[i.priority];
  });

  assert(
    "IT > Enterprise Systems items elevated on ERP mismatch",
    entItems.length === 0 || elevatedEnt.length > 0,
    `${elevatedEnt.length}/${entItems.length} IT-ENT items elevated`,
  );

  const ruleLog = result.generationLog.find((e) => e.rule === "erp_migration_required");
  assert(
    "Generation log records erp_migration_required rule",
    !!ruleLog,
    "Rule 'erp_migration_required' not found in generationLog",
  );

  assert(
    "ERP delta signal present in parameterSignals",
    result.parameterSignals.some((s) => s.parameter === "ERP delta"),
    "No 'ERP delta' in parameterSignals",
  );
}

section("CHECKPOINT 8 — Must-Have Alerts Populated for Standard Intake");
{
  const intake: DealIntake = {
    ...BASE,
    tsaRequired: "yes",
    integrationModel: "fully_integrated",
    buyerMaturity: "first",
  };
  const result = reviewCatalogue(intake);

  assert(
    "mustHaveAlerts array is populated",
    result.mustHaveAlerts.length > 0,
    `mustHaveAlerts is empty — expected must-have items to be identified`,
  );

  assert(
    "Every must-have alert has an itemId and reason",
    result.mustHaveAlerts.every((a) => a.itemId && a.reason),
    "Some mustHaveAlerts are missing itemId or reason",
  );

  assert(
    "Must-have items are not in naItemIds (active, protected)",
    result.mustHaveAlerts.every((a) => !result.naItemIds.has(a.itemId)),
    "Some must-have alerts reference N/A items",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW INTEGRITY GUARDS
// ─────────────────────────────────────────────────────────────────────────────

section("WORKFLOW 1 — generateDeal produces a valid GeneratedDeal shape");
{
  const result = generateDeal(BASE);

  assert(
    "checklistItems is a non-empty array",
    Array.isArray(result.checklistItems) && result.checklistItems.length > 0,
    `checklistItems length: ${result.checklistItems?.length}`,
  );

  assert(
    "generationLog is an array (new field)",
    Array.isArray(result.generationLog),
    `generationLog type: ${typeof result.generationLog}`,
  );

  assert(
    "mustHaveAlerts is an array (new field)",
    Array.isArray(result.mustHaveAlerts),
    `mustHaveAlerts type: ${typeof result.mustHaveAlerts}`,
  );

  assert(
    "parameterSignals is an array (new field)",
    Array.isArray(result.parameterSignals),
    `parameterSignals type: ${typeof result.parameterSignals}`,
  );

  assert(
    "riskAlerts, milestones, people, changeLog arrays all present",
    Array.isArray(result.riskAlerts) &&
    Array.isArray(result.milestones) &&
    Array.isArray(result.people) &&
    Array.isArray(result.changeLog),
    "One or more required arrays missing from GeneratedDeal",
  );

  assert(
    "generatedAt is a valid ISO date string",
    typeof result.generatedAt === "string" && !isNaN(Date.parse(result.generatedAt)),
    `generatedAt: ${result.generatedAt}`,
  );
}

section("WORKFLOW 2 — N/A items have naJustification strings (not undefined)");
{
  const intake: DealIntake = { ...BASE, tsaRequired: "no", crossBorder: false };
  const result = generateDeal(intake);

  const naItems = result.checklistItems.filter((i) => i.status === "na");
  const naWithoutJustification = naItems.filter((i) => !i.naJustification);

  assert(
    "All N/A items have a naJustification string",
    naItems.length === 0 || naWithoutJustification.length === 0,
    `${naWithoutJustification.length}/${naItems.length} N/A items missing naJustification`,
  );

  assert(
    "naJustification is not a generic fallback for TSA items",
    naItems
      .filter((i) => i.tsaRelevant)
      .every((i) => i.naJustification?.toLowerCase().includes("tsa")),
    "TSA N/A items do not mention TSA in their justification",
  );
}

section("WORKFLOW 3 — Priority overrides applied correctly to ChecklistItems");
{
  const intake: DealIntake = { ...BASE, dealStructure: "carve_out", tsaRequired: "yes" };
  const reviewResult = reviewCatalogue(intake);
  const dealResult = generateDeal(intake);

  // For every item with a priority override, verify the ChecklistItem reflects it
  let mismatches = 0;
  for (const [itemId, overridePriority] of Array.from(reviewResult.priorityOverrides.entries())) {
    if (reviewResult.naItemIds.has(itemId)) continue;
    const checklistItem = dealResult.checklistItems.find((i) => i.itemId === itemId);
    if (checklistItem && checklistItem.priority !== overridePriority) {
      mismatches++;
    }
  }

  assert(
    "All priority overrides from reviewCatalogue are reflected in checklistItems",
    mismatches === 0,
    `${mismatches} items have mismatched priorities between review result and generated deal`,
  );
}

section("WORKFLOW 4 — Phase adjustments shift milestoneDate correctly");
{
  const intake: DealIntake = { ...BASE, buyerMaturity: "serial", closeDate: "2025-09-01" };
  const reviewResult = reviewCatalogue(intake);
  const dealResult = generateDeal(intake);

  // Serial acquirer: day_30 items should be at closeDate + 30 - 7 = +23 days
  const expectedOffset = 30 - 7; // 23 days from close
  const closeMs = new Date("2025-09-01").getTime();

  const day30Active = dealResult.checklistItems.filter(
    (i) => i.phase === "day_30" && i.status !== "na" && i.milestoneDate
  );

  const incorrectDates = day30Active.filter((i) => {
    const actualOffset = (new Date(i.milestoneDate!).getTime() - closeMs) / (1000 * 60 * 60 * 24);
    return Math.round(actualOffset) !== expectedOffset;
  });

  assert(
    `Day 30 items have milestoneDate at close + ${expectedOffset} days (serial -7 compression)`,
    incorrectDates.length === 0,
    `${incorrectDates.length}/${day30Active.length} Day 30 items have unexpected milestone dates`,
  );
}

section("WORKFLOW 5 — parentProfile passed through to GeneratedDeal and used in Layer 3");
{
  const parent: ParentProfile = {
    id: "test-parent-3",
    orgName: "Global HoldCo",
    orgType: "pe",
    parentGaap: "IFRS",
    parentErp: "Oracle",
    parentIndustry: "Financial Services",
  };

  const intake: DealIntake = { ...BASE, targetGaap: "US GAAP", targetErp: "SAP" };
  const result = generateDeal(intake, parent);

  assert(
    "parentProfile is stored on GeneratedDeal",
    result.parentProfile?.orgName === "Global HoldCo",
    `parentProfile.orgName: ${result.parentProfile?.orgName}`,
  );

  assert(
    "GAAP mismatch signal present (IFRS → US GAAP)",
    result.parameterSignals?.some((s) => s.parameter === "GAAP delta") ?? false,
    "No GAAP delta signal — Layer 3 not applied with parentProfile",
  );

  assert(
    "ERP mismatch signal present (Oracle → SAP)",
    result.parameterSignals?.some((s) => s.parameter === "ERP delta") ?? false,
    "No ERP delta signal — Layer 3 not applied with parentProfile",
  );

  const layer3Logged = result.generationLog?.some((e) => e.layer === "parent_gap");
  assert(
    "parent_gap layer entries appear in generationLog",
    !!layer3Logged,
    "No 'parent_gap' layer entries in generationLog",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(66)}`);
console.log(`  EVAL RESULTS`);
console.log(`${"═".repeat(66)}`);
console.log(`  ✓ Passed:  ${passed}`);
console.log(`  ✗ Failed:  ${failed}`);
console.log(`  Total:     ${passed + failed}`);

if (failures.length > 0) {
  console.log("\n  FAILURES:");
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  console.log(`\n${"═".repeat(66)}`);
  process.exit(1);
} else {
  console.log(`\n  All checkpoints passed. Engine is operating per plan intent.\n`);
  console.log(`${"═".repeat(66)}\n`);
  process.exit(0);
}
