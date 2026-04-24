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

// ── Workstream taxonomy (v5) ─────────────────────────────────
// Display order: Revenue → Operational → People/Legal → Finance → Controls/IT → ESG → Separation
// Each workstream has a canonical 3-letter code (see WORKSTREAM_CANONICAL_CODES in catalogue-metadata.ts)
// IT sub-workstreams use "IT > " prefix; each maps to a canonical ITx code.
// Removed in v4: "Cybersecurity & Data Privacy" → Controls / IT Strategy & Governance
//                "IT Organization & Talent"      → IT Strategy & Governance
//                "IT General Controls (ITGC)"    → IT Strategy & Governance
export type Workstream =
  // ── Revenue Track (GTM · PRD) ────────────────────────────────────────────
  | "Go-To-Market"                     // GTM — Sales, Marketing, Customer Success
  | "Product & R&D"                    // PRD — Product roadmap, engineering, clinical
  // ── Operational Track (SCO · CAP · FAC · IMO) ───────────────────────────
  | "Supply Chain & Ops"               // SCO — Supply chain, procurement ops, mfg
  | "Capital Projects"                 // CAP — In-flight capex, permits, lender consent
  | "Facilities"                       // FAC — Real estate, leases, physical security
  | "Integration Management"           // IMO — Programme governance, RAID, SteerCo
  // ── People & Legal Track (HR · LGL · COM) ───────────────────────────────
  | "Human Resources"                  // HR  — Workforce, payroll, org design, mobility
  | "Legal"                            // LGL — Contracts, antitrust, litigation, IP
  | "Communications"                   // COM — Employee, customer, media, regulatory
  // ── Finance Track (TRS · OFN · FPA · FRC · TCA · TAX · TSA) ───────────
  | "Treasury"                         // TRS — Debt covenants, cash, FX, earn-outs
  | "Operational Finance"              // OFN — AP/AR, payroll ops, fixed assets, OpEx
  | "FP&A"                             // FPA — Management reporting, synergy tracking
  | "Financial Reporting & Consolidation" // FRC — COA, consolidation, SEC filings
  | "Technical Accounting"             // TCA — PPA, ASC 805, goodwill, leases (ASC 842)
  | "Income Tax"                       // TAX — Entity registration, consolidated group
  | "TSA"                              // TSA — Transition service agreement (exit-focused)
  // ── Controls & Governance Track (CTL · GRC) ─────────────────────────────
  | "Controls"                         // CTL — SOX scoping, ITGC, internal audit
  | "Governance & Compliance"          // GRC — Data sovereignty, privacy, breach protocol
  // ── IT Track (ITG · ITE · ITI · ITD · ITV · ITC) ────────────────────────
  | "IT Strategy & Governance"         // ITG — IT strategy, security governance, ITGC
  | "IT > Enterprise Systems"          // ITE — ERP, CRM, HRIS, email/collab migration
  | "IT > Infrastructure"              // ITI — Cloud, on-prem, DR/BCP
  | "IT > Data & Analytics"            // ITD — Data architecture, MDM, BI platforms
  | "IT > IT Vendor Management"        // ITV — Vendor risk, contracts, outsourcing
  | "IT > Client-Facing & Digital"     // ITC — Portals, product tech, APIs, digital
  // ── Sustainability (ESG) ─────────────────────────────────────────────────
  | "ESG"                              // ESG — Environmental, social, governance
  // ── Conditional Track (SEP — active when dealStructure = carve_out) ─────
  | "Carve-Out / Separation";          // SEP — Separation management, data extraction

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
  | "commercial"     // Go-To-Market, Sales, Marketing
  | "product"        // Product & R&D
  | "separation"     // Carve-Out / Separation
  | "all";

// ============================================================
// Parent Organizational Profile (immutable acquirer context)
// ============================================================
export type OrgType =
  | "corporate"         // Corporate strategic acquirer
  | "pe"                // Private equity / financial sponsor
  | "family_office"     // Family office
  | "sovereign_wealth"  // Sovereign wealth fund
  | "spac";             // SPAC

export type ImoStructure =
  | "centralized"   // Single IMO manages all workstreams
  | "decentralized" // Workstream leads self-manage
  | "embedded"      // IMO members sit inside business units
  | "external";     // Consulting-led IMO

export interface ParentProfile {
  id?: string;
  orgName: string;
  orgType: OrgType | string;
  parentIndustry?: string;
  hqJurisdiction?: string;
  parentGaap?: string;         // Acquirer's own GAAP standard
  parentErp?: string;          // Acquirer's own ERP
  fiscalYearEnd?: string;      // "Jan" | "Feb" | ... | "Dec"
  reportingCurrency?: string;  // "USD" | "EUR" | "GBP" | custom
  imoStructure?: ImoStructure | string;
  buyerMaturity?: string;      // "first" | "occasional" | "serial" | "pe"
  integrationPlaybook?: string; // Free-text methodology description
  imoLead?: string;            // Primary IMO lead name
  createdAt?: string;
  updatedAt?: string;
}

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

  // Parent organizational profile link
  parentProfileId?: string;
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
// ── Workstream-level context override (PMO-managed, persists across sessions) ─
export interface WorkstreamContextOverride {
  notes?: string;           // Free-text deal-specific context for this workstream
  priorityBump?: "elevate" | "reduce" | null; // Shift all items +1 / -1 tier
  reactivateNa?: boolean;   // Re-activate items N/A'd by the engine
  reactivatedAt?: string;   // Timestamp when bulk-reactivated
  notesUpdatedAt?: string;  // Timestamp of last notes edit
}

export interface GeneratedDeal {
  id?: string; // DB-assigned UUID (populated after first successful save)
  intake: DealIntake;
  parentProfile?: ParentProfile; // Linked acquirer profile (denormalized for offline use)
  generationLog?: GenerationLogEntry[];   // Audit trail from catalogue review engine
  mustHaveAlerts?: MustHaveAlert[];       // Items with adversarial guards
  parameterSignals?: ParameterSignal[];   // Signal summary for Generation Intelligence panel
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
  workstreamOverrides?: Record<string, WorkstreamContextOverride>; // PMO workstream-level context
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
// Catalogue Review Engine — Generation Intelligence Types
// ============================================================
export interface GenerationLogEntry {
  layer: "filtering" | "priority" | "parent_gap" | "sector" | "timeline";
  rule: string;           // e.g. "carve_out_tsa_elevation"
  parameter: string;      // e.g. "dealStructure=carve_out"
  itemsAffected: string[]; // itemIds
  reasoning: string;      // human-readable for methodology report
}

export interface MustHaveAlert {
  itemId: string;
  description: string;
  reason: string;         // advisory message shown to PMO when N/A-ing this item
}

export interface ParameterSignal {
  parameter: string;
  value: string;
  signal: "elevate" | "reduce" | "exclude" | "extend" | "compress" | "activate";
  description: string;
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
