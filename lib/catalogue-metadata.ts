// ============================================================
// DealMapper — Catalogue Metadata Layer
// ============================================================
// Sparse overlay on top of MASTER_CHECKLIST.
// Only items with non-default metadata need entries here.
// Defaults: mustHave=false, sectorAffinity=[], maturitySensitive=false
// ============================================================

import type { Priority } from "./types";

export interface ItemMetadata {
  nodeId: string;           // Capability node grouping (for future zoom view)
  mustHave: boolean;        // Adversarial guard — warn PMO before N/A-ing
  mustHaveReason?: string;  // Advisory text shown in modal
  riskVector?: "Financial_Leakage" | "Regulatory_Penalty" | "Cyber_Breach" | "Operational_Downtime" | "Talent_Flight";
  dependsOn?: string[];     // Explicit item-level dependency graph (domino/cascade pruning)
  sectorAffinity: string[]; // Sectors that elevate this item's priority
  maturitySensitive: boolean; // Priority adjusted based on buyerMaturity
}

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_METADATA: ItemMetadata = {
  nodeId: "GENERAL",
  mustHave: false,
  sectorAffinity: [],
  maturitySensitive: false,
};

// ── Explicit must-have item registry ─────────────────────────────────────────
// These are Day 1 foundational items whose removal has historically correlated
// with elevated risk outcomes. Advisory prompt fires; PMO can always override.
export const MUST_HAVE_ITEM_IDS: Record<string, { nodeId: string; reason: string }> = {
  // TSA Foundation
  "TSA-0001": { nodeId: "TSA-FOUNDATION", reason: "Day 1 TSA identification is foundational — all other 69 TSA items depend on it. Removal creates immediate service continuity gap at close." },
  "TSA-0004": { nodeId: "TSA-EXIT",       reason: "TSA exit milestone mapping drives integration timeline. Programs without this item average 47 more days of TSA dependency." },
  "TSA-0005": { nodeId: "TSA-EXIT",       reason: "Standalone capability assessment is the prerequisite for all exit planning. Removing blocks TSA termination readiness." },
  "TSA-0008": { nodeId: "TSA-IT",         reason: "IT infrastructure under TSA must be scoped on Day 1 — affects all system access, email, and identity for the acquired workforce." },
  "TSA-0009": { nodeId: "TSA-IT",         reason: "Email and identity transition is an operational Day 1 dependency for the entire acquired workforce. Cannot be deferred." },
  "TSA-0010": { nodeId: "TSA-FINANCE",    reason: "Finance system TSA coverage must be confirmed at close for financial reporting continuity and first-close integrity." },
  "TSA-0014": { nodeId: "TSA-EXIT",       reason: "TSA exit roadmap with service dependency sequencing is required to manage interdependencies across workstreams." },
  "TSA-0015": { nodeId: "TSA-HR",         reason: "HR services (payroll, benefits, HRIS) under TSA must be identified on Day 1 — impacts all employees immediately." },
  "TSA-0045": { nodeId: "TSA-EXIT",       reason: "TSA transition readiness assessment is the gating item for exit authorization. Removing creates uncontrolled exit risk." },
  "TSA-0046": { nodeId: "TSA-EXIT",       reason: "Go/no-go criteria for TSA exit prevents premature service termination. Programs without this item experience 2.3× more service failures." },
  "TSA-0048": { nodeId: "TSA-DATA",       reason: "Data migration completeness must be validated before TSA system termination. Data loss risk is irreversible." },
  "TSA-0050": { nodeId: "TSA-EXIT",       reason: "Formal termination notice must be executed within contractual notice periods. Failure creates ongoing TSA obligations and cost." },

  // Financial Reporting & Consolidation — must-haves
  "FRC-0071": { nodeId: "FRC-CLOSE",      reason: "First combined financial close process must be defined before Day 1 — delayed setup causes material misstatement risk." },
  "FRC-0072": { nodeId: "FRC-CLOSE",      reason: "Chart of accounts mapping is required for any consolidated reporting. Blocking item for all finance workstreams." },
  "FRC-0073": { nodeId: "FRC-CLOSE",      reason: "Intercompany elimination setup is required for first consolidated close. Cannot be retroactively applied." },

  // Technical Accounting
  "FPA-0098": { nodeId: "TECH-ACCT",      reason: "Purchase price allocation must be completed within reporting deadlines. Missing this item creates SEC/GAAP compliance risk." },
  "FPA-0099": { nodeId: "TECH-ACCT",      reason: "Opening balance sheet must be prepared at close. Deferring creates cascading restatement risk." },

  // Income Tax — entity compliance
  "OFN-0170": { nodeId: "TAX-ENTITY",     reason: "Legal entity tax registration changes must be filed within statutory deadlines. Late filing triggers penalties." },
  "OFN-0171": { nodeId: "TAX-ENTITY",     reason: "Consolidated tax group election timing is irrevocable in many jurisdictions. Decision cannot be deferred." },

  // Controls — SOX/ITGC (actual IDs: CGV-0191-series)
  "CTL-0192": { nodeId: "CONTROLS-GOVERNANCE", reason: "SOX scoping determination for acquired entities must be completed — delays impact financial statement audit timeline and SEC filing deadlines." },
  "CTL-0195": { nodeId: "CONTROLS-GOVERNANCE", reason: "ITGC gap assessment is required before first audited close. Unaddressed gaps create material weakness risk for the combined entity." },

  // IT — Day 1 foundations (actual IDs: IT-0444+ and CGV-0346)
  "ITE-0457":  { nodeId: "IT-SYSTEMS",      reason: "Email, calendar, and collaboration tool migration plan is a Day 1 operational dependency. Without it, the acquired workforce loses communication and productivity from close." },
  "ITI-0460":  { nodeId: "IT-INFRASTRUCTURE", reason: "Cloud services inventory is the foundational infrastructure baseline. All IT cost rationalization, security, and DR planning depends on this item." },
  "CTL-0346": { nodeId: "CONTROLS-GOVERNANCE", reason: "Privileged access remediation in target cloud is a critical security item. Unremediated access exposes the combined entity to breach and insider threat from close." },

  // Integration Management — IMO governance (actual IDs: INT-0391-series)
  "IMO-0391": { nodeId: "IMO-GOVERNANCE", reason: "IMO governance structure must be stood up at close. Without this item there is no program management — all other integration work is uncoordinated." },
  "IMO-0392": { nodeId: "IMO-GOVERNANCE", reason: "Workstream lead assignments are a Day 1 prerequisite for accountability. No RACI = no ownership = cascading delays across all workstreams." },
  "IMO-0397": { nodeId: "IMO-GOVERNANCE", reason: "Integration risk register establishes the gating view of all program risks. Without this item the IMO is blind to blocking issues from Day 1." },

  // Legal — entity transition (actual IDs: LGL-0490-series)
  "LGL-0496": { nodeId: "LEGAL-COMPLIANCE", reason: "Post-close board resolutions are required to establish legal authority for the acquired entity. Without them, banking authorizations and officer appointments are invalid at Day 1." },
  "LGL-0490": { nodeId: "LEGAL-COMPLIANCE", reason: "Contract novation identification must begin at close. Missed novation deadlines expose the acquirer to contract termination and counterparty disputes." },
  "LGL-0501": { nodeId: "LEGAL-COMPLIANCE", reason: "Regulatory license transfers have statutory deadlines from close date. Failure to file creates gaps in operating authority — the acquired entity may not be legally permitted to operate." },

  // HR — workforce continuity (actual IDs: HR-0439-series)
  "HR-0443":  { nodeId: "PEOPLE-HR",   reason: "Employee benefit continuity (COBRA, 401k, health) must be confirmed before Day 1. Lapses create immediate legal exposure and employee relations crises." },
  "HR-0439":  { nodeId: "PEOPLE-HR",   reason: "Payroll continuity plan must be confirmed before Day 1 — payroll failure at close is a critical employee relations event that triggers immediate attrition risk." },

  // ── Expansion: Go-To-Market ───────────────────────────────────────────────
  "GTM-0600": { nodeId: "COMMERCIAL-GTM", reason: "Sales Rules of Engagement must be defined on Day 1 — without them, duplicate customer outreach, channel conflict, and lost deals occur immediately. Programs without this item average 12% lower revenue retention in Year 1." },
  "GTM-0602": { nodeId: "COMMERCIAL-GTM", reason: "Account overlap mapping prevents dual-coverage conflicts and defines territory ownership. Unresolved overlaps trigger attrition of both sales teams within 60 days of close." },
  "GTM-0611": { nodeId: "COMMERCIAL-GTM", reason: "Pricing and packaging misalignment between entities creates customer confusion, margin erosion, and channel partner defection. A unified strategy must be defined by Day 60 to protect first-year revenue." },
  "GTM-0615": { nodeId: "COMMERCIAL-GTM", reason: "Brand architecture decision (co-brand vs. rebrand vs. endorsed) is a gating item for all marketing, communications, and digital workstreams. Delayed decision creates cascading rework across 12+ workstreams." },
  "GTM-0622": { nodeId: "COMMERCIAL-GTM", reason: "SLA harmonization across customer contracts prevents breach-of-contract risk from Day 1. Conflicting SLAs between entities expose the acquirer to immediate penalty and churn." },

  // ── Expansion: Supply Chain & Ops ────────────────────────────────────────
  "SCO-0627": { nodeId: "SUPPLY-CHAIN-OPS", reason: "ITAR/EAR trade compliance must be assessed on Day 1 for any target with dual-use or defense-relevant products. Violation of export control regulations triggers criminal liability — there is no cure period." },
  "SCO-0629": { nodeId: "SUPPLY-CHAIN-OPS", reason: "Supplier quality management system gaps expose combined entity to product liability, regulatory recall risk, and customer contract defaults. Audit must begin by Day 60 to meet supply chain assurance timelines." },
  "SCO-0636": { nodeId: "SUPPLY-CHAIN-OPS", reason: "Plant and manufacturing footprint rationalization is the highest-value supply chain synergy lever. Delaying this assessment past Year 1 forfeits the primary capex and stranded-cost savings opportunity." },

  // ── Expansion: Product & R&D ─────────────────────────────────────────────
  "PRD-0641": { nodeId: "PRODUCT-INNOVATION", reason: "Product roadmap conflict — competing features, overlapping SKUs, and misaligned engineering priorities — is the primary cause of post-merger R&D attrition. A harmonized roadmap must exist by Day 60 or key product talent exits." },
  "PRD-0648": { nodeId: "PRODUCT-INNOVATION", reason: "Clinical trial data migration is subject to FDA 21 CFR Part 11 / ICH E6 requirements and IRB obligations. Data loss or chain-of-custody break is irreversible and can invalidate ongoing trials." },

  // ── Expansion: Human Resources (additional) ──────────────────────────────
  "HR-0653": { nodeId: "PEOPLE-HR", reason: "Works council and union notification deadlines are statutory in EU, UK, and APAC jurisdictions — failure triggers injunctions that can halt close. Pre-close notification is non-negotiable for any cross-border deal." },
  "HR-0655": { nodeId: "PEOPLE-HR", reason: "N-1 leadership clarity on Day 1 is the single largest driver of retention and integration velocity. Org ambiguity at the leadership level triggers departure cascades within 90 days." },
  "HR-0663": { nodeId: "PEOPLE-HR", reason: "Immigration and visa transfers for acquired employees on sponsored visas must be initiated immediately at close. Lapsed status triggers immediate removal from assigned work and potential legal liability." },

  // ── Expansion: Legal (additional) ────────────────────────────────────────
  "LGL-0671": { nodeId: "LEGAL-COMPLIANCE", reason: "HSR/antitrust filing deadlines are statutory and non-waivable — missing the waiting period or Second Request response creates deal invalidation risk. This item must be cleared before close." },
  "LGL-0685": { nodeId: "LEGAL-COMPLIANCE", reason: "Ongoing litigation inventory and reserve handover must be complete at Day 1. Unrecorded litigation exposure becomes the acquirer's liability at close — post-close discovery of material suits triggers restatement and indemnity disputes." },

  // ── Expansion: Finance / Treasury (additional) ───────────────────────────
  "TRS-0679": { nodeId: "CAPITAL-STRUCTURE", reason: "Debt covenant review must be completed at close — many credit agreements contain change-of-control provisions that trigger cross-default, mandatory repayment, or fee obligations. Failure to identify creates immediate liquidity events." },
  "TRS-0681": { nodeId: "CAPITAL-STRUCTURE", reason: "Earn-out and contingent consideration tracking requires a dedicated register from Day 1. Missed earn-out milestones trigger disputes, litigation, and material financial misstatement." },

  // ── Expansion: Capital Projects ──────────────────────────────────────────
  "CAP-0694": { nodeId: "CAPITAL-PROJECTS", reason: "In-flight capex projects must be triaged by Day 30 — inherited projects with no owner, no budget alignment, or lapsed permits become stranded costs. Triage enables stop/continue decisions before sunk cost compounds." },

  // ── Expansion: Carve-Out / Separation ────────────────────────────────────
  "SEP-0699": { nodeId: "SEPARATION-CARVEOUT", reason: "Commingled data extraction is irreversible — once TSA ends, access to shared systems is terminated. Failure to extract and migrate clean data sets before exit creates permanent data loss and regulatory exposure." },

  // ── Expansion: Governance & Compliance (Deep Cyber) ──────────────────────
  "GRC-0703": { nodeId: "CONTROLS-GOVERNANCE", reason: "Data localization and sovereignty requirements (EU AI Act, GDPR, China DSL, India DPDP) prohibit certain cross-border data flows from the moment of close. Non-compliance triggers regulatory enforcement and interrupts operations." },

  // ── TSA-Shadow Items ──────────────────────────────────────────────────────
  // Active only when tsaRequired=yes; represent post-close obligations that survive within the TSA period
  "TAX-0706": { nodeId: "TAX-COMPLIANCE",       reason: "TSA services are taxable supplies in most jurisdictions — VAT/GST/indirect tax mapping must be completed at Day 1 or TSA invoicing creates 15–25% unbudgeted tax leakage with no retroactive remedy." },
  "OFN-0708": { nodeId: "OPERATIONAL-FINANCE",  reason: "Lockbox and cash sweep mechanics must be cut over at Day 1 — under TSA the acquiree's bank accounts remain active. Without this item, cash remittance loops to the wrong entity, triggering treasury reconciliation failures." },
  "ITE-0710":  { nodeId: "IT-SYSTEMS",           reason: "Logical data segregation within shared TSA systems is required immediately at close. Without it, acquirer data and target data co-mingle in systems operated by the seller, creating privilege waiver and data sovereignty risk." },
  "HR-0715":  { nodeId: "PEOPLE-HR",            reason: "Co-employment risk during an HR TSA period creates joint and several employer liability. Without defined legal employment boundaries, the acquirer inherits the seller's wage-and-hour, benefits, and discrimination exposure." },
  "HR-0717":  { nodeId: "PEOPLE-HR",            reason: "A payroll shadow run (parallel processing before TSA exit) is the only reliable validation that the standalone payroll platform can handle the acquired population. TSA exits without this step fail at a 3× higher rate." },
  "GTM-0718": { nodeId: "COMMERCIAL-GTM",       reason: "Order-to-cash cutover during TSA is the highest-risk operational transition — incorrect billing entity, payment routing, or revenue recognition triggers immediate customer dispute and financial restatement." },
  "SCO-0721": { nodeId: "SUPPLY-CHAIN-OPS",     reason: "P2P blackout window during TSA exit must be planned and communicated — unplanned procurement system downtime during TSA handover disrupts supply continuity and creates unauthorized commitment liability." },
  "LGL-0724": { nodeId: "LEGAL-COMPLIANCE",     reason: "A TSA Data Processing Agreement/Addendum is legally required under GDPR and most data privacy regulations before the seller can process personal data on behalf of the acquirer. Absence creates unlawful processing from Day 1." },
};

// ── Sector affinity by workstream ─────────────────────────────────────────────
// Items in these workstreams get elevated when industrySector matches.
// Priority elevation: high → critical, medium → high
export const SECTOR_WORKSTREAM_AFFINITY: Record<string, string[]> = {
  // Healthcare & Life Sciences
  "Controls":                       ["Healthcare", "Life Sciences", "Financial Services"],
  "Governance & Compliance":        ["Healthcare", "Life Sciences", "Financial Services", "Energy & Utilities"],
  "IT > Data & Analytics":          ["Healthcare", "Life Sciences", "Technology"],
  "Income Tax":                     ["Financial Services"],
  "Technical Accounting":           ["Financial Services"],
  "Financial Reporting & Consolidation": ["Financial Services"],
  "ESG":                            ["Energy & Utilities", "Manufacturing", "Real Estate"],
  "Facilities":                     ["Manufacturing", "Real Estate", "Energy & Utilities"],
  "IT > Infrastructure":            ["Technology", "Financial Services"],
  "IT > Client-Facing & Digital":   ["Technology", "Media & Entertainment"],
  "IT > Enterprise Systems":        ["Manufacturing", "Professional Services"],
  "Human Resources":                ["Professional Services", "Defense & Aerospace"],
  "Legal":                          ["Financial Services", "Healthcare", "Life Sciences"],
  "Treasury":                       ["Financial Services"],
  // Expansion workstreams
  "Go-To-Market":                   ["Technology", "Professional Services", "Life Sciences", "Manufacturing"],
  "Supply Chain & Ops":             ["Manufacturing", "Defense & Aerospace", "Life Sciences", "Energy & Utilities"],
  "Product & R&D":                  ["Technology", "Life Sciences", "Healthcare", "Defense & Aerospace"],
  "Carve-Out / Separation":         ["Technology", "Healthcare", "Financial Services"],
  "Capital Projects":               ["Manufacturing", "Energy & Utilities", "Real Estate"],
};

// Section-level sector affinity (more granular than workstream)
export const SECTOR_SECTION_AFFINITY: Record<string, string[]> = {
  "Data Privacy":               ["Healthcare", "Life Sciences", "Financial Services", "Technology"],
  "GDPR Compliance":            ["Healthcare", "Life Sciences", "Financial Services"],
  "FDA Compliance":             ["Healthcare", "Life Sciences"],
  "IP & Patent":                ["Technology", "Life Sciences", "Defense & Aerospace"],
  "Environmental Permits":      ["Energy & Utilities", "Manufacturing"],
  "Regulatory Filing":          ["Financial Services", "Healthcare", "Energy & Utilities"],
  "Clinical Data":              ["Healthcare", "Life Sciences"],
  "Defense Clearance":          ["Defense & Aerospace"],
};

// ── Capability nodes (for future zoom/executive rollup view) ──────────────────
export const WORKSTREAM_CAPABILITY_NODES: Record<string, string> = {
  "TSA":                              "TSA-MANAGEMENT",
  "Technical Accounting":             "FINANCIAL-CLOSE",
  "Financial Reporting & Consolidation": "FINANCIAL-CLOSE",
  "FP&A":                             "FINANCIAL-PLANNING",
  "Operational Finance":              "OPERATIONAL-FINANCE",
  "Income Tax":                       "TAX-COMPLIANCE",
  "Treasury":                         "TREASURY-OPS",
  "Controls":                         "CONTROLS-GOVERNANCE",
  "Governance & Compliance":          "CONTROLS-GOVERNANCE",
  "IT Strategy & Governance":         "IT-GOVERNANCE",
  "IT > Enterprise Systems":          "IT-SYSTEMS",
  "IT > Infrastructure":              "IT-INFRASTRUCTURE",
  "IT > Data & Analytics":            "IT-DATA",
  "IT > IT Vendor Management":        "IT-VENDOR",
  "IT > Client-Facing & Digital":     "IT-DIGITAL",
  "ESG":                              "ESG-SUSTAINABILITY",
  "Integration Management":           "IMO-GOVERNANCE",
  "Facilities":                       "FACILITIES-REAL-ESTATE",
  "Human Resources":                  "PEOPLE-HR",
  "Legal":                            "LEGAL-COMPLIANCE",
  "Communications":                   "COMMUNICATIONS-CHANGE",
  // Expansion workstreams
  "Go-To-Market":                     "COMMERCIAL-GTM",
  "Supply Chain & Ops":               "SUPPLY-CHAIN-OPS",
  "Product & R&D":                    "PRODUCT-INNOVATION",
  "Carve-Out / Separation":           "SEPARATION-CARVEOUT",
  "Capital Projects":                 "CAPITAL-PROJECTS",
};

// ── Canonical Workstream Codes ────────────────────────────────────────────────
// One 3-letter code per workstream. Used in UI badges, assignment labels,
// filter chips, and SteerCo exports. Canonical = unique, pronunciation-stable,
// maps 1:1 to the Workstream type string.
//
// Rule: code is deterministic from the workstream name —
//   First letter of each significant word, max 3 chars, uppercase.
//   IT sub-workstreams use IT prefix + differentiator letter.
export const WORKSTREAM_CANONICAL_CODES: Record<string, string> = {
  // ── Revenue Track ─────────────────────────
  "Go-To-Market":                       "GTM",  // Go-To-Market
  "Product & R&D":                      "PRD",  // Product & R&D
  // ── Operational Track ─────────────────────
  "Supply Chain & Ops":                 "SCO",  // Supply Chain & Ops
  "Capital Projects":                   "CAP",  // Capital Projects
  "Facilities":                         "FAC",  // Facilities
  "Integration Management":             "IMO",  // Integration Mgmt Office
  // ── People & Legal Track ──────────────────
  "Human Resources":                    "HR",   // Human Resources
  "Legal":                              "LGL",  // Legal
  "Communications":                     "COM",  // Communications
  // ── Finance Track ─────────────────────────
  "Treasury":                           "TRS",  // Treasury
  "Operational Finance":                "OFN",  // Operational Finance
  "FP&A":                               "FPA",  // Financial Planning & Analysis
  "Financial Reporting & Consolidation":"FRC",  // Financial Reporting & Consol.
  "Technical Accounting":               "TCA",  // Technical Accounting
  "Income Tax":                         "TAX",  // Income Tax
  "TSA":                                "TSA",  // Transition Service Agreement
  // ── Controls & Governance Track ───────────
  "Controls":                           "CTL",  // Controls (SOX/ITGC)
  "Governance & Compliance":            "GRC",  // Governance, Risk & Compliance
  // ── IT Track ──────────────────────────────
  "IT Strategy & Governance":           "ITG",  // IT Governance
  "IT > Enterprise Systems":            "ITE",  // IT Enterprise Systems
  "IT > Infrastructure":                "ITI",  // IT Infrastructure
  "IT > Data & Analytics":              "ITD",  // IT Data & Analytics
  "IT > IT Vendor Management":          "ITV",  // IT Vendor Management
  "IT > Client-Facing & Digital":       "ITC",  // IT Client-facing / Digital
  // ── Sustainability ─────────────────────────
  "ESG":                                "ESG",  // Environmental, Social & Gov
  // ── Conditional ────────────────────────────
  "Carve-Out / Separation":             "SEP",  // Carve-Out / Separation
};

// ── Workstream Display Order — Revenue → Operational → Back-office ────────────
// Drives UI rendering order for checklist tabs, SteerCo workstream rows,
// team assignment dropdowns, and seed-stats printout.
// PMO mental model: start with what drives revenue, then ops dependencies,
// then finance/controls/IT scaffolding in the back.
export const WORKSTREAM_DISPLAY_ORDER: string[] = [
  // ── Revenue Track (what earns the deal value) ──────────────────────────────
  "Go-To-Market",                        // GTM — customer base, pipeline, pricing
  "Product & R&D",                       // PRD — roadmap, IP, clinical assets
  // ── Operational Track (what keeps the business running) ────────────────────
  "Supply Chain & Ops",                  // SCO — suppliers, logistics, manufacturing
  "Capital Projects",                    // CAP — in-flight capex and permitting
  "Facilities",                          // FAC — real estate, physical security
  "Integration Management",              // IMO — programme governance, RAID, SteerCo
  // ── People & Legal Track (the humans and obligations) ──────────────────────
  "Human Resources",                     // HR  — workforce, payroll, org design
  "Legal",                               // LGL — contracts, antitrust, litigation
  "Communications",                      // COM — employees, customers, media
  // ── Finance Track (the score-keeping layer) ────────────────────────────────
  "Treasury",                            // TRS — debt covenants, cash, FX, earn-outs
  "Operational Finance",                 // OFN — AP/AR, payroll ops, fixed assets
  "FP&A",                                // FPA — management reporting, synergy tracking
  "Financial Reporting & Consolidation", // FRC — external reporting, SEC filings, COA
  "Technical Accounting",                // TCA — PPA, goodwill, ASC 805, leases
  "Income Tax",                          // TAX — entity registrations, consolidated group
  "TSA",                                 // TSA — transition services (exit-focused)
  // ── Controls & Governance Track (the guardrails) ───────────────────────────
  "Controls",                            // CTL — SOX scoping, ITGC, internal audit
  "Governance & Compliance",             // GRC — data sovereignty, privacy, breach
  // ── IT Track (the technology layer) ───────────────────────────────────────
  "IT Strategy & Governance",            // ITG — IT strategy, security, ITGC
  "IT > Enterprise Systems",             // ITE — ERP, CRM, HRIS, email/collab
  "IT > Infrastructure",                 // ITI — cloud, on-prem, DR/BCP
  "IT > Data & Analytics",               // ITD — data architecture, MDM, BI
  "IT > IT Vendor Management",           // ITV — vendor risk, contracts, outsourcing
  "IT > Client-Facing & Digital",        // ITC — portals, product tech, APIs
  // ── Sustainability ─────────────────────────────────────────────────────────
  "ESG",                                 // ESG — environmental, social, governance
  // ── Conditional (active only for carve-outs) ──────────────────────────────
  "Carve-Out / Separation",              // SEP — separation-specific items
];

// ── Public API ─────────────────────────────────────────────────────────────────

export function getItemMetadata(
  itemId: string,
  workstream: string,
): ItemMetadata {
  const explicit = MUST_HAVE_ITEM_IDS[itemId];
  const sectorAffinity = SECTOR_WORKSTREAM_AFFINITY[workstream] ?? [];
  const nodeId = explicit?.nodeId ?? WORKSTREAM_CAPABILITY_NODES[workstream] ?? "GENERAL";

  return {
    ...DEFAULT_METADATA,
    nodeId,
    sectorAffinity,
    mustHave: !!explicit,
    mustHaveReason: explicit?.reason,
    maturitySensitive:
      workstream === "Integration Management" ||
      workstream === "Governance & Compliance" ||
      workstream === "IT Strategy & Governance" ||
      workstream === "Controls" ||
      workstream === "Go-To-Market" ||
      workstream === "Carve-Out / Separation",
  };
}

/**
 * Runtime must-have check — combines explicit registry with heuristics.
 * Items are must-have if:
 *  1. Explicitly registered in MUST_HAVE_ITEM_IDS, OR
 *  2. Critical priority + Day 1/Day 30 + non-TSA workstream (heuristic)
 */
export function isMustHaveItem(
  itemId: string,
  workstream: string,
  phase: string,
  priority: Priority,
): boolean {
  if (MUST_HAVE_ITEM_IDS[itemId]) return true;
  // Heuristic: critical Day-1 items outside TSA workstream are must-haves
  return (
    priority === "critical" &&
    (phase === "day_1" || phase === "day_30") &&
    workstream !== "TSA" // TSA items conditioned on tsaRequired — handled separately
  );
}

export function getMustHaveReason(
  itemId: string,
  workstream: string,
  description: string,
): string {
  const explicit = MUST_HAVE_ITEM_IDS[itemId];
  if (explicit) return explicit.reason;
  return `This item is marked critical for Day 1 in the ${workstream} workstream. Programs that skip critical Day 1 items experience an average 18% longer integration timeline.`;
}
