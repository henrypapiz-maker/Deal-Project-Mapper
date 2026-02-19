// ============================================================
// M&A Integration Engine — Core TypeScript Types
// ============================================================

export type DealStructure =
  | "stock_purchase"
  | "asset_purchase"
  | "merger_forward"
  | "merger_reverse"
  | "carve_out"
  | "f_reorg";

export type IntegrationModel = "fully_integrated" | "hybrid" | "standalone";

export type TsaRequired = "yes" | "no" | "tbd";

export type DealStatus = "pre_close" | "active" | "complete" | "archived";

export type Priority = "critical" | "high" | "medium" | "low";

export type ItemStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "complete"
  | "na";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export type RiskCategory =
  | "regulatory_delay"
  | "tax_structure_leakage"
  | "tsa_dependency"
  | "data_privacy_breach"
  | "cultural_integration"
  | "financial_reporting_gap"
  | "stranded_costs";

export type Phase = "pre_close" | "day_1" | "day_30" | "day_60" | "day_90" | "year_1";

export type Workstream =
  | "TSA Assessment & Exit"
  | "Consolidation & Reporting"
  | "Operational Accounting"
  | "Internal Controls & SOX"
  | "Income Tax & Compliance"
  | "Treasury & Banking"
  | "FP&A & Baselining"
  | "Cybersecurity & Data Privacy"
  | "ESG & Sustainability"
  | "Integration Budget & PMO"
  | "Facilities & Real Estate"
  | "HR & Workforce Integration";

// ============================================================
// Intake Form — Deal Profile (12-field, 3-tier)
// ============================================================
export interface DealIntake {
  // Tier 1 — Required (4 fields)
  dealName: string;
  dealStructure: DealStructure;
  integrationModel: IntegrationModel;
  closeDate: string; // ISO date string

  // Tier 2 — Context (5 fields)
  crossBorder: boolean;
  jurisdictions: string[]; // ["US", "EU-DE", "EU-NL", "UK", ...]
  tsaRequired: TsaRequired;
  industrySector: string;
  dealValueRange: string; // "<$50M" | "$50M–$250M" | "$250M–$500M" | "$500M–$1B" | "$1B–$5B" | ">$5B"
  targetEntities: number;

  // Tier 3 — Advanced (3 fields)
  targetGaap: string; // "US GAAP" | "IFRS" | "Local" | "Multiple"
  targetErp: string; // "SAP" | "Oracle" | "NetSuite" | "Other" | "Unknown"
  buyerMaturity: string; // "first" | "occasional" | "serial" | "pe"
}

// ============================================================
// Checklist Item
// ============================================================
export interface ChecklistItem {
  id: string; // UUID (generated at runtime)
  itemId: string; // FRC-0001 through FRC-0443
  workstream: Workstream;
  section: string;
  description: string;
  phase: Phase;
  milestoneDate?: string; // calculated from closeDate
  priority: Priority;
  status: ItemStatus;
  ownerId?: string;
  dependencies: string[]; // item_ids
  tsaRelevant: boolean;
  crossBorderFlag: boolean;
  riskIndicators: RiskCategory[];
  aiGuidance?: string;
  notes: string[];
  blockedReason?: string;
  naJustification?: string;
}

// ============================================================
// Risk Alert
// ============================================================
export interface RiskAlert {
  id: string;
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  mitigation: string;
  affectedWorkstreams: Workstream[];
  status: "open" | "acknowledged" | "mitigated" | "closed";
}

// ============================================================
// Generated Deal (result of decision tree)
// ============================================================
export interface GeneratedDeal {
  intake: DealIntake;
  checklistItems: ChecklistItem[];
  riskAlerts: RiskAlert[];
  workstreamSummary: WorkstreamSummary[];
  milestones: Milestone[];
  generatedAt: string;
}

export interface WorkstreamSummary {
  name: Workstream;
  totalItems: number;
  activeItems: number; // non-NA items
  phase: string; // when this workstream is most critical
  priority: Priority;
}

export interface Milestone {
  phase: Phase;
  label: string;
  date: string;
  daysFromClose: number;
}

// ============================================================
// AI Guidance Request/Response
// ============================================================
export interface GuidanceRequest {
  itemId: string;
  description: string;
  workstream: string;
  status: ItemStatus;
  blockedReason?: string;
  dealContext: Pick<
    DealIntake,
    | "dealStructure"
    | "integrationModel"
    | "crossBorder"
    | "jurisdictions"
    | "tsaRequired"
    | "industrySector"
    | "targetGaap"
  >;
}

export interface GuidanceResponse {
  guidance: string;
  keyQuestions: string[];
  relatedItems: string[];
}
