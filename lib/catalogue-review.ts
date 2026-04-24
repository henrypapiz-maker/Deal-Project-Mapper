// ============================================================
// DealMapper — Catalogue Review Engine
// 5-Layer signal-driven adaptation of the master checklist
// ============================================================
// Layer 1 — Enhanced Filtering   (include/exclude items)
// Layer 2 — Priority Calibration (elevate / reduce priorities)
// Layer 3 — Parent Profile Gaps  (GAAP delta, ERP delta, maturity)
// Layer 4 — Sector Overlay       (industry-specific elevations)
// Layer 5 — Timeline Adjustment  (phase offset ± days)
// ============================================================

import type { DealIntake, Priority, GenerationLogEntry, MustHaveAlert, ParameterSignal } from "./types";
import type { ParentProfile } from "./types";
import { MASTER_CHECKLIST } from "./checklist-master";
import {
  isMustHaveItem,
  getMustHaveReason,
  SECTOR_WORKSTREAM_AFFINITY,
  SECTOR_SECTION_AFFINITY,
} from "./catalogue-metadata";

// ── Result type ───────────────────────────────────────────────────────────────
export interface CatalogueReviewResult {
  naItemIds: Set<string>;
  priorityOverrides: Map<string, Priority>;
  phaseAdjustments: Map<string, number>;   // itemId → ± days
  generationLog: GenerationLogEntry[];
  mustHaveAlerts: MustHaveAlert[];
  parameterSignals: ParameterSignal[];
}

// ── Priority rank helpers ─────────────────────────────────────────────────────
const PRIORITY_RANK: Record<Priority, number> = {
  low: 0, medium: 1, high: 2, critical: 3,
};
const PRIORITY_BY_RANK = ["low", "medium", "high", "critical"] as Priority[];

function elevate(p: Priority, steps = 1): Priority {
  return PRIORITY_BY_RANK[Math.min(3, PRIORITY_RANK[p] + steps)];
}
function reduce(p: Priority, steps = 1): Priority {
  return PRIORITY_BY_RANK[Math.max(0, PRIORITY_RANK[p] - steps)];
}

// ── Layer 1: Enhanced Filtering ───────────────────────────────────────────────
function applyFilteringLayer(
  intake: DealIntake,
  naSet: Set<string>,
  log: GenerationLogEntry[],
): void {
  // 1a. TSA items → N/A when TSA not required
  if (intake.tsaRequired === "no") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (item.tsaRelevant) { naSet.add(item.itemId); affected.push(item.itemId); }
    }
    log.push({
      layer: "filtering", rule: "tsa_not_required",
      parameter: "tsaRequired=no",
      itemsAffected: affected,
      reasoning: `TSA not required for this deal — ${affected.length} TSA-scoped items marked N/A.`,
    });
  }

  // 1b. Cross-border items → N/A when domestic deal
  if (!intake.crossBorder) {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (item.crossBorderFlag && !naSet.has(item.itemId)) {
        naSet.add(item.itemId); affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "filtering", rule: "cross_border_not_applicable",
        parameter: "crossBorder=false",
        itemsAffected: affected,
        reasoning: `Domestic deal — ${affected.length} cross-border items marked N/A (no multi-jurisdiction requirements).`,
      });
    }
  }

  // 1c. Functional scope filtering
  const scopeSet = new Set(intake.functionalScope as string[]);
  if (!scopeSet.has("all")) {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      const fa = (item as { functionalArea?: string }).functionalArea ?? "all";
      if (fa !== "all" && !scopeSet.has(fa)) {
        naSet.add(item.itemId); affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "filtering", rule: "functional_scope_limit",
        parameter: `functionalScope=[${Array.from(scopeSet).join(",")}]`,
        itemsAffected: affected,
        reasoning: `Custom functional scope — ${affected.length} out-of-scope items marked N/A.`,
      });
    }
  }

  // 1d. Standalone model → exclude deep IT integration items
  if (intake.integrationModel === "standalone") {
    const IT_DEEP_INTEGRATION_SECTIONS = new Set([
      "ERP Migration", "System Cutover", "Application Rationalisation",
      "Data Migration", "Network Integration", "Identity Integration",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (
        item.workstream.startsWith("IT >") &&
        IT_DEEP_INTEGRATION_SECTIONS.has(item.section)
      ) {
        naSet.add(item.itemId); affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "filtering", rule: "standalone_it_exclusion",
        parameter: "integrationModel=standalone",
        itemsAffected: affected,
        reasoning: `Standalone integration model — ${affected.length} deep IT integration items excluded (systems remain separate).`,
      });
    }
  }

  // 1e. Asset purchase → exclude share-transfer and share-rollover items
  if (intake.dealStructure === "asset_purchase") {
    const STOCK_SECTIONS = new Set([
      "Share Rollover", "Stock Transfer", "Equity Transition",
      "Share Purchase Agreement", "Shareholder Register",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (STOCK_SECTIONS.has(item.section)) {
        naSet.add(item.itemId); affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "filtering", rule: "asset_purchase_stock_exclusion",
        parameter: "dealStructure=asset_purchase",
        itemsAffected: affected,
        reasoning: `Asset purchase — ${affected.length} equity/share-transfer items excluded (not applicable to asset deals).`,
      });
    }
  }

  // 1f. Hybrid model → only 50% of IT > Enterprise Systems active
  if (intake.integrationModel === "hybrid") {
    const ENT_ITEMS = MASTER_CHECKLIST.filter(
      (item) => item.workstream === "IT > Enterprise Systems" && !naSet.has(item.itemId)
    );
    // Exclude lower-priority half
    const toExclude = ENT_ITEMS.filter((i) => i.priority === "medium" || i.priority === "low");
    for (const item of toExclude) { naSet.add(item.itemId); }
    if (toExclude.length) {
      log.push({
        layer: "filtering", rule: "hybrid_partial_ent_exclusion",
        parameter: "integrationModel=hybrid",
        itemsAffected: toExclude.map((i) => i.itemId),
        reasoning: `Hybrid integration model — ${toExclude.length} lower-priority Enterprise Systems items excluded (partial integration planned).`,
      });
    }
  }
}

// ── Layer 2: Priority Calibration ─────────────────────────────────────────────
function applyPriorityLayer(
  intake: DealIntake,
  naSet: Set<string>,
  overrides: Map<string, Priority>,
  log: GenerationLogEntry[],
): void {
  const maturity = intake.buyerMaturity;
  const dealValue = intake.dealValueRange;
  const entities = intake.targetEntities ?? 1;

  // 2a. Carve-out + TSA → elevate TSA items to critical (BUG FIX: was FRC-00, now FIN-00)
  if (intake.dealStructure === "carve_out" && intake.tsaRequired !== "no") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.workstream === "TSA" && item.phase === "day_1") {
        overrides.set(item.itemId, "critical");
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "carve_out_tsa_elevation",
        parameter: "dealStructure=carve_out + tsaRequired≠no",
        itemsAffected: affected,
        reasoning: `Carve-out deals carry the highest TSA complexity. ${affected.length} Day 1 TSA items elevated to critical.`,
      });
    }
  }

  // 2b. Standalone model → downgrade remaining critical items to high
  if (intake.integrationModel === "standalone") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      const currentPriority = overrides.get(item.itemId) ?? item.priority;
      if (currentPriority === "critical") {
        overrides.set(item.itemId, "high");
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "standalone_critical_downgrade",
        parameter: "integrationModel=standalone",
        itemsAffected: affected,
        reasoning: `Standalone model — full integration not required. ${affected.length} critical items downgraded to high.`,
      });
    }
  }

  // 2c. First-time acquirer → elevate PMO/governance items
  if (maturity === "first") {
    const MATURITY_WORKSTREAMS = new Set(["Integration Management", "Governance & Compliance", "IT Strategy & Governance", "Controls"]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (MATURITY_WORKSTREAMS.has(item.workstream)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const elevated = elevate(current);
        if (elevated !== current) { overrides.set(item.itemId, elevated); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "first_time_acquirer_governance_elevation",
        parameter: "buyerMaturity=first",
        itemsAffected: affected,
        reasoning: `First-time acquirer — IMO governance and controls items elevated. ${affected.length} items upgraded (governance infrastructure is critical for inexperienced acquirers).`,
      });
    }
  }

  // 2d. Serial acquirer → reduce PMO overhead items
  if (maturity === "serial") {
    const SERIAL_REDUCE_WORKSTREAMS = new Set(["Integration Management"]);
    const SERIAL_REDUCE_SECTIONS = new Set(["IMO Setup", "Governance Charter", "Reporting Cadence"]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (
        SERIAL_REDUCE_WORKSTREAMS.has(item.workstream) &&
        SERIAL_REDUCE_SECTIONS.has(item.section)
      ) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const reduced = reduce(current);
        if (reduced !== current) { overrides.set(item.itemId, reduced); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "serial_acquirer_pmo_reduction",
        parameter: "buyerMaturity=serial",
        itemsAffected: affected,
        reasoning: `Serial acquirer — proven playbook in place. ${affected.length} standard IMO setup items reduced (infrastructure already established).`,
      });
    }
  }

  // 2e. Large deal value → elevate financial reporting items
  if (dealValue === ">$5B" || dealValue === "$1B–$5B") {
    const FIN_REPORT_WORKSTREAMS = new Set([
      "Financial Reporting & Consolidation", "Technical Accounting", "FP&A",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (FIN_REPORT_WORKSTREAMS.has(item.workstream)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const elevated = elevate(current);
        if (elevated !== current) { overrides.set(item.itemId, elevated); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "large_deal_financial_elevation",
        parameter: `dealValueRange=${dealValue}`,
        itemsAffected: affected,
        reasoning: `Large deal ($${dealValue}) — financial reporting complexity and scrutiny elevated. ${affected.length} FRC/Technical Accounting items upgraded.`,
      });
    }
  }

  // 2f. Many entities → elevate legal entity transition items
  if (entities > 10) {
    const ENTITY_SECTIONS = new Set(["Entity Transition", "Legal Entity", "Corporate Structure", "Subsidiary"]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (ENTITY_SECTIONS.has(item.section) || item.workstream === "Legal") {
        const current = overrides.get(item.itemId) ?? item.priority;
        const elevated = elevate(current);
        if (elevated !== current) { overrides.set(item.itemId, elevated); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "high_entity_count_legal_elevation",
        parameter: `targetEntities=${entities}`,
        itemsAffected: affected,
        reasoning: `${entities} legal entities — entity transition and legal workstream complexity elevated. ${affected.length} items upgraded.`,
      });
    }
  }

  // 2g. Hybrid model — IT items stay high (not critical), replace same-as-fully_integrated flaw
  if (intake.integrationModel === "hybrid") {
    const IT_WORKSTREAMS = new Set([
      "IT > Enterprise Systems", "IT > Infrastructure", "IT Strategy & Governance",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (IT_WORKSTREAMS.has(item.workstream)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        if (current === "critical") {
          overrides.set(item.itemId, "high");
          affected.push(item.itemId);
        }
      }
    }
    if (affected.length) {
      log.push({
        layer: "priority", rule: "hybrid_it_critical_cap",
        parameter: "integrationModel=hybrid",
        itemsAffected: affected,
        reasoning: `Hybrid integration — IT systems partially integrated. ${affected.length} IT critical items capped at high (full migration not required).`,
      });
    }
  }
}

// ── Layer 3: Parent Profile Gap Analysis ─────────────────────────────────────
function applyParentGapLayer(
  intake: DealIntake,
  parentProfile: ParentProfile | undefined,
  naSet: Set<string>,
  overrides: Map<string, Priority>,
  phaseAdj: Map<string, number>,
  log: GenerationLogEntry[],
): void {
  if (!parentProfile) return;

  // 3a. GAAP mismatch → elevate financial conversion workstream
  const parentGaap = parentProfile.parentGaap ?? "";
  const targetGaap = intake.targetGaap ?? "";
  if (parentGaap && targetGaap && parentGaap !== targetGaap && targetGaap !== "Unknown") {
    const GAAP_WORKSTREAMS = new Set([
      "Financial Reporting & Consolidation", "Technical Accounting",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (GAAP_WORKSTREAMS.has(item.workstream)) {
        overrides.set(item.itemId, "critical");
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "parent_gap", rule: "gaap_conversion_required",
        parameter: `parentGaap=${parentGaap} → targetGaap=${targetGaap}`,
        itemsAffected: affected,
        reasoning: `GAAP mismatch: acquirer uses ${parentGaap}, target uses ${targetGaap}. Full conversion workstream elevated to critical — ${affected.length} items affected.`,
      });
    }
  }

  // 3b. ERP mismatch → elevate ERP migration items
  const parentErp = parentProfile.parentErp ?? "";
  const targetErp = intake.targetErp ?? "";
  if (
    parentErp && targetErp &&
    parentErp !== targetErp &&
    targetErp !== "Unknown" && targetErp !== "Other"
  ) {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.workstream === "IT > Enterprise Systems") {
        const current = overrides.get(item.itemId) ?? item.priority;
        overrides.set(item.itemId, elevate(current));
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "parent_gap", rule: "erp_migration_required",
        parameter: `parentErp=${parentErp} → targetErp=${targetErp}`,
        itemsAffected: affected,
        reasoning: `ERP mismatch: acquirer on ${parentErp}, target on ${targetErp}. Full ERP migration required — ${affected.length} Enterprise Systems items elevated.`,
      });
    }
  }

  // 3c. Same ERP → reduce some IT-ENT items (alignment risk lower)
  if (
    parentErp && targetErp && parentErp === targetErp &&
    targetErp !== "Unknown" && targetErp !== "Other"
  ) {
    const SAME_ERP_REDUCE_SECTIONS = new Set(["ERP Selection", "ERP Vendor Evaluation", "ERP Business Case"]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (
        item.workstream === "IT > Enterprise Systems" &&
        SAME_ERP_REDUCE_SECTIONS.has(item.section)
      ) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const reduced = reduce(current);
        if (reduced !== current) { overrides.set(item.itemId, reduced); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "parent_gap", rule: "same_erp_selection_reduction",
        parameter: `parentErp=targetErp=${parentErp}`,
        itemsAffected: affected,
        reasoning: `Same ERP platform (${parentErp}) — ERP selection and evaluation items reduced. ${affected.length} items downgraded (platform decision already made).`,
      });
    }
  }

  // 3d. Cross-industry deal → elevate change management and HR
  const parentIndustry = parentProfile.parentIndustry ?? "";
  const targetIndustry = intake.industrySector ?? "";
  if (parentIndustry && targetIndustry && parentIndustry !== targetIndustry) {
    const CHANGE_WORKSTREAMS = new Set(["Communications", "Human Resources"]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (CHANGE_WORKSTREAMS.has(item.workstream)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const elevated = elevate(current);
        if (elevated !== current) { overrides.set(item.itemId, elevated); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "parent_gap", rule: "cross_industry_change_elevation",
        parameter: `parentIndustry=${parentIndustry} ≠ industrySector=${targetIndustry}`,
        itemsAffected: affected,
        reasoning: `Cross-industry acquisition (${parentIndustry} acquiring ${targetIndustry}). Cultural integration risk elevated — ${affected.length} Communications/HR items upgraded.`,
      });
    }
  }

  // 3e. Buyer maturity from parent profile augments deal-level maturity
  const profileMaturity = parentProfile.buyerMaturity ?? "";
  const dealMaturity = intake.buyerMaturity ?? "";
  if (profileMaturity === "first" && dealMaturity !== "first") {
    // First-time buyer despite deal-level override — apply first-time elevation
    const affected: string[] = [];
    const GOVN_WORKSTREAMS = new Set(["Integration Management", "Governance & Compliance"]);
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (GOVN_WORKSTREAMS.has(item.workstream)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const elevated = elevate(current);
        if (elevated !== current) { overrides.set(item.itemId, elevated); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "parent_gap", rule: "parent_profile_first_time_override",
        parameter: `parentProfile.buyerMaturity=first (deal-level=${dealMaturity})`,
        itemsAffected: affected,
        reasoning: `Parent profile indicates first-time acquirer — governance elevation applied from profile. ${affected.length} items upgraded.`,
      });
    }
  }
}

// ── Layer 4: Sector Overlay ───────────────────────────────────────────────────
function applySectorLayer(
  intake: DealIntake,
  naSet: Set<string>,
  overrides: Map<string, Priority>,
  log: GenerationLogEntry[],
): void {
  const sector = intake.industrySector ?? "";
  if (!sector) return;

  // 4a. Workstream affinity
  const affineWorkstreams = Object.entries(SECTOR_WORKSTREAM_AFFINITY)
    .filter(([, sectors]) => sectors.includes(sector))
    .map(([ws]) => ws);

  if (affineWorkstreams.length) {
    const wsSet = new Set(affineWorkstreams);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (wsSet.has(item.workstream)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        const elevated = elevate(current);
        if (elevated !== current) { overrides.set(item.itemId, elevated); affected.push(item.itemId); }
      }
    }
    if (affected.length) {
      log.push({
        layer: "sector", rule: "sector_workstream_elevation",
        parameter: `industrySector=${sector}`,
        itemsAffected: affected,
        reasoning: `${sector} sector — elevated workstreams: ${affineWorkstreams.join(", ")}. ${affected.length} items upgraded based on sector risk profile.`,
      });
    }
  }

  // 4b. Healthcare / Life Sciences — data privacy to critical
  if (sector === "Healthcare" || sector === "Life Sciences") {
    const DATA_PRIVACY_SECTIONS = new Set([
      "Data Privacy", "GDPR Compliance", "Data Governance", "Patient Data",
      "Clinical Data", "PHI / HIPAA",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (DATA_PRIVACY_SECTIONS.has(item.section)) {
        overrides.set(item.itemId, "critical");
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "sector", rule: "healthcare_data_privacy_critical",
        parameter: `industrySector=${sector}`,
        itemsAffected: affected,
        reasoning: `${sector} deals carry HIPAA/PHI data obligations. ${affected.length} data privacy items elevated to critical.`,
      });
    }
  }

  // 4c. Financial Services — controls and regulatory to critical
  if (sector === "Financial Services") {
    const FIN_SVC_SECTIONS = new Set([
      "Regulatory Filing", "Banking Licence", "AML Compliance",
      "FCA / SEC Registration", "Capital Requirements",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (
        (item.workstream === "Controls" || item.workstream === "Governance & Compliance") &&
        item.phase === "day_1"
      ) {
        overrides.set(item.itemId, "critical");
        affected.push(item.itemId);
      } else if (FIN_SVC_SECTIONS.has(item.section)) {
        overrides.set(item.itemId, "critical");
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "sector", rule: "financial_services_regulatory_critical",
        parameter: "industrySector=Financial Services",
        itemsAffected: affected,
        reasoning: `Financial Services — regulatory controls mandatory on Day 1. ${affected.length} compliance/regulatory items elevated to critical.`,
      });
    }
  }

  // 4d. Technology — IP and data asset items elevated
  if (sector === "Technology") {
    const TECH_SECTIONS = new Set([
      "IP & Patent", "Source Code", "Data Asset", "SaaS Transition",
      "Software Licence", "Open Source Compliance",
    ]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (TECH_SECTIONS.has(item.section)) {
        const current = overrides.get(item.itemId) ?? item.priority;
        overrides.set(item.itemId, elevate(current));
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "sector", rule: "technology_ip_elevation",
        parameter: "industrySector=Technology",
        itemsAffected: affected,
        reasoning: `Technology sector — IP and data assets are primary value drivers. ${affected.length} IP/source code items elevated.`,
      });
    }
  }

  // 4e. Energy & Utilities — ESG to critical
  if (sector === "Energy & Utilities" || sector === "Manufacturing") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.workstream === "ESG") {
        overrides.set(item.itemId, "critical");
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "sector", rule: "energy_esg_critical",
        parameter: `industrySector=${sector}`,
        itemsAffected: affected,
        reasoning: `${sector} sector — ESG disclosures and environmental permits are regulatory requirements. ${affected.length} ESG items elevated to critical.`,
      });
    }
  }
}

// ── Layer 5: Timeline Adjustment ─────────────────────────────────────────────
function applyTimelineLayer(
  intake: DealIntake,
  naSet: Set<string>,
  phaseAdj: Map<string, number>,
  log: GenerationLogEntry[],
): void {
  const maturity = intake.buyerMaturity;
  const dealValue = intake.dealValueRange;
  const jurisdictions = intake.jurisdictions ?? [];

  // 5a. Serial acquirer → compress Day 30 items by 7 days
  if (maturity === "serial") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.phase === "day_30") {
        phaseAdj.set(item.itemId, (phaseAdj.get(item.itemId) ?? 0) - 7);
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "timeline", rule: "serial_acquirer_day30_compression",
        parameter: "buyerMaturity=serial",
        itemsAffected: affected,
        reasoning: `Serial acquirer — proven IMO playbook enables 7-day compression of Day 30 milestones. ${affected.length} items adjusted.`,
      });
    }
  }

  // 5b. First-time acquirer → extend pre-close buffer by 14 days
  if (maturity === "first") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.phase === "pre_close") {
        phaseAdj.set(item.itemId, (phaseAdj.get(item.itemId) ?? 0) - 14); // earlier pre-close
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "timeline", rule: "first_time_acquirer_preclose_extension",
        parameter: "buyerMaturity=first",
        itemsAffected: affected,
        reasoning: `First-time acquirer — extended pre-close preparation recommended. ${affected.length} pre-close items moved 14 days earlier.`,
      });
    }
  }

  // 5c. 3+ jurisdictions → extend regulatory cross-border items
  if (jurisdictions.length >= 3) {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.crossBorderFlag && item.phase === "pre_close") {
        phaseAdj.set(item.itemId, (phaseAdj.get(item.itemId) ?? 0) - 14);
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "timeline", rule: "multi_jurisdiction_regulatory_extension",
        parameter: `jurisdictions.length=${jurisdictions.length}`,
        itemsAffected: affected,
        reasoning: `${jurisdictions.length} jurisdictions require concurrent regulatory clearances. ${affected.length} cross-border items moved 14 days earlier.`,
      });
    }
  }

  // 5d. Carve-out → extend TSA milestones by 30 days
  if (intake.dealStructure === "carve_out") {
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (item.tsaRelevant && (item.phase === "day_60" || item.phase === "day_90")) {
        phaseAdj.set(item.itemId, (phaseAdj.get(item.itemId) ?? 0) + 30);
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "timeline", rule: "carve_out_tsa_extension",
        parameter: "dealStructure=carve_out",
        itemsAffected: affected,
        reasoning: `Carve-out structure — TSA exit typically takes 30+ additional days vs. standard M&A. ${affected.length} TSA Day 60/90 items extended.`,
      });
    }
  }

  // 5e. Large deal value → extend financial reporting milestones
  if (dealValue === ">$5B" || dealValue === "$1B–$5B") {
    const FIN_REPORT_WS = new Set(["Financial Reporting & Consolidation", "Technical Accounting"]);
    const affected: string[] = [];
    for (const item of MASTER_CHECKLIST) {
      if (naSet.has(item.itemId)) continue;
      if (FIN_REPORT_WS.has(item.workstream) && item.phase === "day_30") {
        phaseAdj.set(item.itemId, (phaseAdj.get(item.itemId) ?? 0) + 14);
        affected.push(item.itemId);
      }
    }
    if (affected.length) {
      log.push({
        layer: "timeline", rule: "large_deal_financial_extension",
        parameter: `dealValueRange=${dealValue}`,
        itemsAffected: affected,
        reasoning: `Large deal ($${dealValue}) — financial close complexity requires extended Day 30 window. ${affected.length} FRC items moved 14 days later.`,
      });
    }
  }
}

// ── Build parameter signals summary ──────────────────────────────────────────
function buildParameterSignals(
  intake: DealIntake,
  parentProfile: ParentProfile | undefined,
): ParameterSignal[] {
  const signals: ParameterSignal[] = [];

  if (intake.tsaRequired === "no")
    signals.push({ parameter: "tsaRequired", value: "no", signal: "exclude", description: "77 TSA items excluded — TSA not required" });
  if (intake.tsaRequired === "yes")
    signals.push({ parameter: "tsaRequired", value: "yes", signal: "activate", description: "Full TSA workstream activated" });
  if (!intake.crossBorder)
    signals.push({ parameter: "crossBorder", value: "false", signal: "exclude", description: "65 cross-border items excluded — domestic deal" });
  if (intake.crossBorder && intake.jurisdictions.length >= 3)
    signals.push({ parameter: "jurisdictions", value: `${intake.jurisdictions.length} jurisdictions`, signal: "extend", description: "Pre-close items moved 14 days earlier for regulatory clearance" });
  if (intake.dealStructure === "carve_out")
    signals.push({ parameter: "dealStructure", value: "carve_out", signal: "elevate", description: "TSA Day 1 items → critical; TSA Day 60/90 milestones +30 days" });
  if (intake.dealStructure === "asset_purchase")
    signals.push({ parameter: "dealStructure", value: "asset_purchase", signal: "exclude", description: "Share/equity transfer items excluded" });
  if (intake.integrationModel === "standalone")
    signals.push({ parameter: "integrationModel", value: "standalone", signal: "reduce", description: "Critical items → high; deep IT integration items excluded" });
  if (intake.integrationModel === "hybrid")
    signals.push({ parameter: "integrationModel", value: "hybrid", signal: "reduce", description: "IT critical items capped at high; medium/low IT-ENT items excluded" });
  if (intake.buyerMaturity === "first")
    signals.push({ parameter: "buyerMaturity", value: "first", signal: "elevate", description: "Governance/IMO items elevated; pre-close items moved 14 days earlier" });
  if (intake.buyerMaturity === "serial")
    signals.push({ parameter: "buyerMaturity", value: "serial", signal: "compress", description: "Day 30 milestones compressed by 7 days; IMO setup items reduced" });
  if (intake.dealValueRange === ">$5B" || intake.dealValueRange === "$1B–$5B")
    signals.push({ parameter: "dealValueRange", value: intake.dealValueRange, signal: "elevate", description: "Financial reporting workstreams elevated; Day 30 FRC milestones +14 days" });
  if (intake.targetEntities > 10)
    signals.push({ parameter: "targetEntities", value: `${intake.targetEntities}`, signal: "elevate", description: "Legal entity transition items elevated" });
  if (intake.industrySector)
    signals.push({ parameter: "industrySector", value: intake.industrySector, signal: "activate", description: `Sector-specific items activated for ${intake.industrySector}` });

  // Parent profile signals
  if (parentProfile) {
    const parentGaap = parentProfile.parentGaap ?? "";
    const targetGaap = intake.targetGaap ?? "";
    if (parentGaap && targetGaap && parentGaap !== targetGaap && targetGaap !== "Unknown")
      signals.push({ parameter: "GAAP delta", value: `${parentGaap} → ${targetGaap}`, signal: "elevate", description: "FRC + Technical Accounting elevated to critical — GAAP conversion required" });

    const parentErp = parentProfile.parentErp ?? "";
    const targetErp = intake.targetErp ?? "";
    if (parentErp && targetErp && parentErp !== targetErp && targetErp !== "Unknown")
      signals.push({ parameter: "ERP delta", value: `${parentErp} → ${targetErp}`, signal: "elevate", description: "Enterprise Systems workstream elevated — full ERP migration required" });
    if (parentErp && targetErp && parentErp === targetErp)
      signals.push({ parameter: "ERP match", value: parentErp, signal: "reduce", description: "ERP selection/evaluation items reduced — same platform" });

    const parentIndustry = parentProfile.parentIndustry ?? "";
    if (parentIndustry && intake.industrySector && parentIndustry !== intake.industrySector)
      signals.push({ parameter: "industry delta", value: `${parentIndustry} → ${intake.industrySector}`, signal: "elevate", description: "Communications + HR elevated — cross-industry cultural risk" });
  }

  return signals;
}

// ── Build must-have alerts from active items ──────────────────────────────────
function buildMustHaveAlerts(
  naSet: Set<string>,
  overrides: Map<string, Priority>,
): MustHaveAlert[] {
  const alerts: MustHaveAlert[] = [];
  for (const item of MASTER_CHECKLIST) {
    if (naSet.has(item.itemId)) continue;
    const effectivePriority = overrides.get(item.itemId) ?? item.priority;
    if (isMustHaveItem(item.itemId, item.workstream, item.phase, effectivePriority)) {
      alerts.push({
        itemId: item.itemId,
        description: item.description,
        reason: getMustHaveReason(item.itemId, item.workstream, item.description),
      });
    }
  }
  return alerts;
}

// ── Main entry point ─────────────────────────────────────────────────────────
export function reviewCatalogue(
  intake: DealIntake,
  parentProfile?: ParentProfile,
): CatalogueReviewResult {
  const naItemIds = new Set<string>();
  const priorityOverrides = new Map<string, Priority>();
  const phaseAdjustments = new Map<string, number>();
  const generationLog: GenerationLogEntry[] = [];

  // Run layers in order
  applyFilteringLayer(intake, naItemIds, generationLog);
  applyPriorityLayer(intake, naItemIds, priorityOverrides, generationLog);
  applyParentGapLayer(intake, parentProfile, naItemIds, priorityOverrides, phaseAdjustments, generationLog);
  applySectorLayer(intake, naItemIds, priorityOverrides, generationLog);
  applyTimelineLayer(intake, naItemIds, phaseAdjustments, generationLog);

  const parameterSignals = buildParameterSignals(intake, parentProfile);
  const mustHaveAlerts = buildMustHaveAlerts(naItemIds, priorityOverrides);

  return {
    naItemIds,
    priorityOverrides,
    phaseAdjustments,
    generationLog,
    mustHaveAlerts,
    parameterSignals,
  };
}
