import type { DealIntake, ChecklistItem } from "@/lib/types";

// ─── Base intake: minimal domestic stock purchase ───────────────────────────
export const BASE_INTAKE: DealIntake = {
  dealName: "Acme Acquisition",
  dealStructure: "stock_purchase",
  integrationModel: "fully_integrated",
  closeDate: "2026-06-01",
  crossBorder: false,
  jurisdictions: [],
  tsaRequired: "no",
  industrySector: "Technology",
  dealValueRange: "$50M–$250M",
  targetEntities: 1,
  targetGaap: "US GAAP",
  targetErp: "NetSuite",
  buyerMaturity: "occasional",
};

// ─── Cross-border with 3 jurisdictions (triggers regulatory_delay) ──────────
export const CROSS_BORDER_3J_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  crossBorder: true,
  jurisdictions: ["US", "EU-DE", "EU-FR"],
};

// ─── Cross-border with EU jurisdiction (triggers data_privacy_breach) ───────
export const EU_CROSS_BORDER_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  crossBorder: true,
  jurisdictions: ["US", "EU-NL"],
};

// ─── TSA required (triggers tsa_dependency) ─────────────────────────────────
export const TSA_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  tsaRequired: "yes",
};

// ─── Carve-out (triggers stranded_costs; tsa_dependency if tsaRequired) ─────
export const CARVE_OUT_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  dealStructure: "carve_out",
  tsaRequired: "yes",
};

// ─── IFRS target (triggers financial_reporting_gap) ─────────────────────────
export const IFRS_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  targetGaap: "IFRS",
};

// ─── Large cross-border multi-entity (triggers financial_reporting_gap) ──────
export const MULTI_ENTITY_CROSS_BORDER_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  crossBorder: true,
  jurisdictions: ["US", "CA"],
  targetEntities: 8,
};

// ─── Cross-border with 2+ non-US (triggers cultural_integration) ────────────
export const MULTICULTURAL_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  crossBorder: true,
  jurisdictions: ["EU-DE", "JP", "SG"],
};

// ─── Standalone model (downgrade critical → high) ────────────────────────────
export const STANDALONE_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  integrationModel: "standalone",
};

// ─── High-value EU deal (triggers tax_structure_leakage + data_privacy) ──────
export const HIGH_VALUE_EU_INTAKE: DealIntake = {
  ...BASE_INTAKE,
  crossBorder: true,
  jurisdictions: ["EU-IE", "US"],
  dealValueRange: "$1B–$5B",
};

// ─── Helper: build a minimal checklist item ──────────────────────────────────
export function makeItem(
  overrides: Partial<ChecklistItem> = {}
): ChecklistItem {
  return {
    id: "test-id",
    itemId: "FRC-0001",
    workstream: "Consolidation & Reporting",
    section: "Test Section",
    description: "Test item",
    phase: "day_1",
    priority: "medium",
    status: "not_started",
    dependencies: [],
    tsaRelevant: false,
    crossBorderFlag: false,
    riskIndicators: [],
    notes: [],
    ...overrides,
  };
}
