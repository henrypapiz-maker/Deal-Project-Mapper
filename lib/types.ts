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
  | "stranded_costs"
  | "it_integration_risk";

export type Phase = "pre_close" | "day_1" | "day_30" | "day_60" | "day_90" | "year_1";

// ── Workstream taxonomy (v4) ─────────────────────────────────
// Finance Track
// Controls & Governance Track
// IT Track  (parent + 5 sub-workstreams; prefix "IT > " denotes sub-workstream)
// Other Track
// Removed: "Cybersecurity & Data Privacy" → Controls / IT Strategy & Governance
//          "Cybersecurity & Risk"          → IT Strategy & Governance
//          "IT Organization & Talent"      → IT Strategy & Governance
//          "IT General Controls (ITGC)"    → IT Strategy & Governance
//          "IT Financial Mgmt & Synergies" → IT Strategy & Governance
export type Workstream =
  // Finance Track
  | "TSA"                              // was "TSA Assessment & Exit"
  | "Technical Accounting"             // NEW — split from Consolidation
  | "Financial Reporting & Consolidation" // was "Consolidation & Reporting"
  | "FP&A"                             // was "FP&A & Baselining"
  | "Operational Finance"              // was "Operational Accounting"
  | "Income Tax"                       // was "Income Tax & Compliance"
  | "Treasury"                         // was "Treasury & Banking"
  // Controls & Governance Track
  | "Controls"                         // was part of "Internal Controls & SOX"
  | "Governance & Compliance"          // NEW — split from Internal Controls
  // IT Track
  | "IT Strategy & Governance"         // consolidates IT Governance, IT Org, ITGC, IT Financial
  | "IT > Enterprise Systems"          // was "Enterprise Applications"
  | "IT > Infrastructure"              // was "Infrastructure & Cloud"
  | "IT > Data & Analytics"            // was "Data Management & Analytics"
  | "IT > IT Vendor Management"        // was "Vendor & Third-Party Mgmt"
  | "IT > Client-Facing & Digital"     // was "Client-Facing Tech & Product"
  // Other Track
  | "ESG"                              // was "ESG & Sustainability"
  | "Integration Management"           // was "Integration Budget & PMO"
  | "Facilities"                       // was "Facilities & Real Estate"
  | "Human Resources"                  // was "HR & Workforce Integration"
  | "Legal"                            // was "Legal & Contract Transition"
  | "Communications";                  // was "Communications & Change Management"

export type WorkstreamCode =
  // Finance Track
  | "FIN-TSA" | "FIN-TECH" | "FIN-CONS" | "FIN-FPA" | "FIN-OPS" | "FIN-TAX" | "FIN-TRE"
  // Controls & Governance Track
  | "CGV-CTL" | "CGV-GOV"
  // IT Track
  | "IT-STR" | "IT-ENT" | "IT-INF" | "IT-DAT" | "IT-VEN" | "IT-CLI"
  // Other Track
  | "ESG" | "INT" | "FAC" | "HR" | "LGL" | "COM";

export type WorkstreamTrack = "Finance" | "Controls & Governance" | "IT" | "Other";

export type FunctionalArea =
  | "finance"
  | "it"
  | "hr"
  | "legal"
  | "tax"
  | "treasury"
  | "cybersecurity"
  | "esg"
  | "facilities"
  | "operations"
  | "communications"
  | "all";

// ============================================================
// Intake Form — Deal Profile (12-field, 3-tier)
// ============================================================
export interface DealIntake {
  // Tier 1 — Required (4 fields)
  dealName: string;
  dealStructure: DealStructure;
  integrationModel: IntegrationModel;
  closeDate: string; // ISO date string

  // Tier 2 — Context (6 fields)
  functionalScope: FunctionalArea[];
  crossBorder: boolean;
  jurisdictions: string[]; // ["US", "EU-DE", "EU-NL", "UK", ...]
  tsaRequired: TsaRequired;
  industrySector: string;
  dealValueRange: string; // "<$50M" | "$50M–$250M" | "$250M–$500M" | "$500M–$1B" | "$1B–$5B" | ">$5B"
  targetEntities: number;

  // Tier 3 — Advanced (3 fields)
  targetGaap: string; // "US GAAP" | "IFRS" | "Local GAAP" | "Multiple" | "Unknown" | custom
  targetErp: string; // "SAP" | "Oracle" | "NetSuite" | "Other" | "Unknown" | custom name
  buyerMaturity: string; // "first" | "occasional" | "serial" | "pe"

  // Optional free-text context captured during intake
  dealStructureNotes?: string;     // Additional context about the deal structure
  integrationModelNotes?: string;  // Integration boundary / nuance description
  tsaNotes?: string;               // TSA scope, expected duration, functions covered

  // Additional general context bucket — open-ended topic + notes pairs
  additionalContext?: Array<{ topic: string; label: string; notes: string }>;
}

// ============================================================
// Checklist Item
// ============================================================
export type DependencyType =
  | "predecessor"           // Unable to be started until preceding task is completed
  | "internal_analysis"     // Internal Analysis to be performed
  | "external_sme"          // External Analysis to be performed by SME
  | "data_aggregation"      // Data Aggregation / Normalization to be performed
  | "validation_required"   // Validation required
  | "key_decision"          // Key Decision needed
  | "other";

export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  predecessor: "Predecessor (must complete first)",
  internal_analysis: "Internal Analysis Required",
  external_sme: "External SME Analysis Required",
  data_aggregation: "Data Aggregation / Normalization",
  validation_required: "Validation Required",
  key_decision: "Key Decision Needed",
  other: "Other",
};

export interface ClassifiedDependency {
  targetItemId: string;         // The item this depends on
  dependencyType: DependencyType;
  detail?: string;              // Free-form text describing specifics
  createdAt?: string;
  escalate?: boolean;           // Flag for SteerCo escalation
}

export interface ChecklistItem {
  id: string; // UUID (generated at runtime)
  itemId: string; // FRC-0001 through FRC-0489
  workstream: Workstream | (string & {});
  // workstreamCode: WorkstreamCode; // TODO: populate in checklist-master.ts
  // track: WorkstreamTrack;         // TODO: populate in checklist-master.ts
  section: string;
  description: string;
  phase: Phase;
  milestoneDate?: string; // calculated from closeDate
  priority: Priority;
  priorityOverride?: Priority;
  status: ItemStatus;
  ownerId?: string;
  dependencies: string[]; // item_ids
  customDependencies?: ClassifiedDependency[];  // Ad-hoc dependencies with type classification
  tsaRelevant: boolean;
  crossBorderFlag: boolean;
  riskIndicators: RiskCategory[];
  aiGuidance?: string;
  notes: Note[];
  attachments?: Attachment[];
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
  // New fields for risk management:
  linkedItemIds?: string[];     // Checklist items linked to this risk
  source?: "auto" | "manual" | "narrative";  // Where this risk came from
  notes?: string;               // Management commentary
  createdAt?: string;
}

// ============================================================
// Person (team roster for owner assignment)
// ============================================================
export interface Person {
  id: string;
  name: string;
  role?: string;
  email?: string;
  permissionLevel?: "admin" | "imo_lead" | "workstream_lead" | "viewer" | "external";
}

export interface Note {
  id: string;
  text: string;
  timestamp: string;
  author?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url?: string;
  addedAt: string;
  addedBy?: string;
}

export interface WorkstreamSnapshot {
  workstream: string;
  ragStatus: "red" | "amber" | "green";
  ragOverride?: "red" | "amber" | "green";
  completed: number;
  inProgress: number;
  blocked: number;
  pastDue: number;
  total: number;
  pctComplete: number;
  narrative?: string;
  highlightedItems?: string[];
  keyRisks?: string[];
  nextSteps?: string[];
}

export interface OwnerSnapshot {
  ownerId?: string;
  ownerName: string;
  completed: number;
  inProgress: number;
  blocked: number;
  total: number;
}

export interface ProgressSnapshot {
  id: string;
  periodEnd: string;
  createdAt: string;
  summary: {
    totalActive: number;
    completed: number;
    newlyInProgress: number;
    newlyBlocked: number;
    pastDue: number;
    unchanged: number;
  };
  workstreams: WorkstreamSnapshot[];
  owners: OwnerSnapshot[];
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: {
    phase: string;
    workstream: string;
    priority: string;
    status: string;
    owner: string;
  };
  createdAt: string;
  isPreset?: boolean;
}

// ============================================================
// Audit Trail
// ============================================================
export interface ChangeEvent {
  id: string;
  timestamp: string;
  itemId: string;
  field: string;
  oldValue: string;
  newValue: string;
  author?: string;
}

// ============================================================
// Generated Deal (result of decision tree)
// ============================================================
export interface GeneratedDeal {
  id?: string; // DB-assigned UUID (populated after first successful save)
  intake: DealIntake;
  checklistItems: ChecklistItem[];
  riskAlerts: RiskAlert[];
  workstreamSummary: WorkstreamSummary[];
  milestones: Milestone[];
  generatedAt: string;
  people: Person[];
  progressSnapshots: ProgressSnapshot[];
  savedFilters: SavedFilter[];
  changeLog: ChangeEvent[];
  ragOverrides?: Record<string, "red" | "amber" | "green">; // persistent RAG overrides keyed by workstream name
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
