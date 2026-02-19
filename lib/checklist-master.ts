import type { ChecklistItem, Workstream, Phase, Priority, RiskCategory } from "./types";

// ============================================================
// Master Checklist Template — 443 FRC items (representative set)
// Full taxonomy: FRC-0001 through FRC-0443
// Source: Finance_Checklist_PRD_Reformatted.xlsx
// ============================================================

export interface MasterItem {
  itemId: string;
  workstream: Workstream;
  section: string;
  description: string;
  phase: Phase;
  priority: Priority;
  dependencies: string[];
  tsaRelevant: boolean;
  crossBorderFlag: boolean;
  riskIndicators: RiskCategory[];
  aiGuidanceTemplate?: string;
}

export const MASTER_CHECKLIST: MasterItem[] = [
  // ─── TSA Assessment & Exit (70 items, FRC-0001–0070) ─────────────────────
  { itemId: "FRC-0001", workstream: "TSA Assessment & Exit", section: "TSA Identification", description: "Identify all shared services requiring TSA coverage at close", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0002", workstream: "TSA Assessment & Exit", section: "TSA Identification", description: "Define SLA metrics for each TSA service category", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0003", workstream: "TSA Assessment & Exit", section: "TSA Pricing", description: "Establish TSA pricing model (cost-plus baseline)", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0004", workstream: "TSA Assessment & Exit", section: "TSA Exit Planning", description: "Map TSA exit milestones by service category", phase: "day_1", priority: "critical", dependencies: ["FRC-0001", "FRC-0002"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0005", workstream: "TSA Assessment & Exit", section: "TSA Exit Planning", description: "Assess standalone capability for each TSA service", phase: "day_30", priority: "critical", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency", "stranded_costs"] },
  { itemId: "FRC-0006", workstream: "TSA Assessment & Exit", section: "TSA Governance", description: "Establish TSA governance committee and escalation path", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0007", workstream: "TSA Assessment & Exit", section: "TSA Governance", description: "Document TSA invoice reconciliation process", phase: "day_30", priority: "medium", dependencies: ["FRC-0003", "FRC-0006"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0008", workstream: "TSA Assessment & Exit", section: "IT TSA", description: "Identify all IT infrastructure under TSA scope", phase: "day_1", priority: "critical", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0009", workstream: "TSA Assessment & Exit", section: "IT TSA", description: "Define email and identity transition timeline under TSA", phase: "day_1", priority: "critical", dependencies: ["FRC-0008"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0010", workstream: "TSA Assessment & Exit", section: "Finance TSA", description: "Identify finance systems covered under TSA (ERP, payroll, reporting)", phase: "day_1", priority: "critical", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },
  { itemId: "FRC-0011", workstream: "TSA Assessment & Exit", section: "Finance TSA", description: "Establish interim financial reporting process under TSA", phase: "day_1", priority: "high", dependencies: ["FRC-0010"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0012", workstream: "TSA Assessment & Exit", section: "TSA Stranded Cost", description: "Identify stranded costs post-TSA exit by service", phase: "day_60", priority: "high", dependencies: ["FRC-0005"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["stranded_costs"] },
  { itemId: "FRC-0013", workstream: "TSA Assessment & Exit", section: "Cross-Border TSA", description: "Identify cross-border TSA services and regulatory implications", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: true, riskIndicators: ["tsa_dependency", "regulatory_delay"] },
  { itemId: "FRC-0014", workstream: "TSA Assessment & Exit", section: "TSA Exit Planning", description: "Build TSA exit roadmap with service dependency sequencing", phase: "day_30", priority: "critical", dependencies: ["FRC-0004", "FRC-0005"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"] },

  // ─── Consolidation & Reporting (52 items, FRC-0071–0122) ─────────────────
  { itemId: "FRC-0071", workstream: "Consolidation & Reporting", section: "Chart of Accounts", description: "Map target COA to acquirer COA structure", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"] },
  { itemId: "FRC-0072", workstream: "Consolidation & Reporting", section: "Chart of Accounts", description: "Identify intercompany elimination entries", phase: "day_1", priority: "high", dependencies: ["FRC-0071"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"] },
  { itemId: "FRC-0073", workstream: "Consolidation & Reporting", section: "Chart of Accounts", description: "Configure consolidation journal entries", phase: "day_30", priority: "high", dependencies: ["FRC-0072"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0074", workstream: "Consolidation & Reporting", section: "GAAP Conversion", description: "Assess GAAP conversion requirements (if target GAAP differs)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"] },
  { itemId: "FRC-0075", workstream: "Consolidation & Reporting", section: "GAAP Conversion", description: "Document differences between target and acquirer accounting policies", phase: "day_30", priority: "high", dependencies: ["FRC-0074"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"] },
  { itemId: "FRC-0076", workstream: "Consolidation & Reporting", section: "First Close", description: "Prepare first post-close consolidated financial statements", phase: "day_30", priority: "critical", dependencies: ["FRC-0071", "FRC-0072", "FRC-0074"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0077", workstream: "Consolidation & Reporting", section: "Statutory Reporting", description: "Identify statutory reporting obligations for all entities", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"] },
  { itemId: "FRC-0078", workstream: "Consolidation & Reporting", section: "Statutory Reporting", description: "File change-of-control statutory notifications", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"] },
  { itemId: "FRC-0079", workstream: "Consolidation & Reporting", section: "Reporting Calendar", description: "Establish consolidated reporting calendar and close schedule", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0080", workstream: "Consolidation & Reporting", section: "Intercompany", description: "Establish intercompany billing and reconciliation process", phase: "day_30", priority: "high", dependencies: ["FRC-0072"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── Operational Accounting (68 items, FRC-0123–0190) ────────────────────
  { itemId: "FRC-0123", workstream: "Operational Accounting", section: "AP/AR Cutoff", description: "Validate AP cutoff procedures at close", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0124", workstream: "Operational Accounting", section: "AP/AR Cutoff", description: "Establish intercompany billing process", phase: "day_1", priority: "high", dependencies: ["FRC-0123"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0125", workstream: "Operational Accounting", section: "Banking", description: "Execute bank account cutover at close", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0126", workstream: "Operational Accounting", section: "Banking", description: "Update signatories on all target bank accounts", phase: "day_1", priority: "critical", dependencies: ["FRC-0125"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0127", workstream: "Operational Accounting", section: "Payroll", description: "Confirm payroll continuity for all employees on close date", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0128", workstream: "Operational Accounting", section: "Payroll", description: "Establish payroll accrual methodology post-close", phase: "day_30", priority: "high", dependencies: ["FRC-0127"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0129", workstream: "Operational Accounting", section: "Accounts Payable", description: "Review and approve all open purchase orders at close", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0130", workstream: "Operational Accounting", section: "Accounts Receivable", description: "Review open AR aging and agree collection process", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── Internal Controls & SOX (44 items, FRC-0191–0234) ───────────────────
  { itemId: "FRC-0191", workstream: "Internal Controls & SOX", section: "SOX Scoping", description: "Map target SOX controls to acquirer framework", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0192", workstream: "Internal Controls & SOX", section: "SOX Scoping", description: "Determine SOX scope for acquired entities (in-scope vs. out)", phase: "day_30", priority: "critical", dependencies: ["FRC-0191"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0193", workstream: "Internal Controls & SOX", section: "Control Testing", description: "Identify gaps in target control environment", phase: "day_60", priority: "high", dependencies: ["FRC-0192"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0194", workstream: "Internal Controls & SOX", section: "Control Testing", description: "Develop remediation plan for identified control gaps", phase: "day_60", priority: "high", dependencies: ["FRC-0193"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0195", workstream: "Internal Controls & SOX", section: "ITGC", description: "Assess IT General Controls for acquired systems", phase: "day_60", priority: "high", dependencies: ["FRC-0192"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── Income Tax & Compliance (38 items, FRC-0235–0272) ───────────────────
  { itemId: "FRC-0235", workstream: "Income Tax & Compliance", section: "Tax Structure", description: "Review deal structure for tax efficiency (§338, §336 elections)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["tax_structure_leakage"] },
  { itemId: "FRC-0236", workstream: "Income Tax & Compliance", section: "Tax Compliance", description: "File all required federal and state tax change-of-ownership notifications", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["regulatory_delay"] },
  { itemId: "FRC-0237", workstream: "Income Tax & Compliance", section: "Tax Compliance", description: "Confirm tax return filing obligations for stub period", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0238", workstream: "Income Tax & Compliance", section: "Transfer Pricing", description: "Document intercompany transfer pricing policies", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["tax_structure_leakage", "regulatory_delay"] },
  { itemId: "FRC-0239", workstream: "Income Tax & Compliance", section: "Pillar Two", description: "Assess Pillar Two (Global Minimum Tax) exposure by jurisdiction", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["tax_structure_leakage"] },
  { itemId: "FRC-0240", workstream: "Income Tax & Compliance", section: "CFIUS/Regulatory", description: "File CFIUS voluntary notice if applicable", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"] },
  { itemId: "FRC-0241", workstream: "Income Tax & Compliance", section: "CFIUS/Regulatory", description: "File merger clearance notifications in all required jurisdictions", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"] },
  { itemId: "FRC-0242", workstream: "Income Tax & Compliance", section: "Tax Attributes", description: "Identify and value NOLs, credits and other tax attributes", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["tax_structure_leakage"] },

  // ─── Treasury & Banking (32 items, FRC-0273–0304) ────────────────────────
  { itemId: "FRC-0273", workstream: "Treasury & Banking", section: "Cash Management", description: "Establish cash pooling and sweeping arrangements", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0274", workstream: "Treasury & Banking", section: "Cash Management", description: "Review target debt instruments and covenant compliance", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0275", workstream: "Treasury & Banking", section: "Banking Relationships", description: "Notify all banks of ownership change and update KYC/AML documentation", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0276", workstream: "Treasury & Banking", section: "FX Risk", description: "Assess FX exposure across all transaction currencies", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["financial_reporting_gap"] },
  { itemId: "FRC-0277", workstream: "Treasury & Banking", section: "Credit Facilities", description: "Review and update credit facility documentation post-close", phase: "day_30", priority: "high", dependencies: ["FRC-0274"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── FP&A & Baselining (28 items, FRC-0305–0332) ─────────────────────────
  { itemId: "FRC-0305", workstream: "FP&A & Baselining", section: "Budget Integration", description: "Integrate target budget into acquirer planning cycle", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0306", workstream: "FP&A & Baselining", section: "Synergy Tracking", description: "Establish cost and revenue synergy baseline and tracking model", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0307", workstream: "FP&A & Baselining", section: "Synergy Tracking", description: "Assign synergy owners and reporting cadence", phase: "day_60", priority: "medium", dependencies: ["FRC-0306"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0308", workstream: "FP&A & Baselining", section: "Forecast Integration", description: "Prepare first combined P&L and cash flow forecast", phase: "day_60", priority: "high", dependencies: ["FRC-0305"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── Cybersecurity & Data Privacy (36 items, FRC-0333–0368) ──────────────
  { itemId: "FRC-0333", workstream: "Cybersecurity & Data Privacy", section: "Data Privacy", description: "Assess GDPR/CCPA compliance for all personal data processing", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"] },
  { itemId: "FRC-0334", workstream: "Cybersecurity & Data Privacy", section: "Data Privacy", description: "Initiate Data Protection Impact Assessment (DPIA) for EU operations", phase: "day_1", priority: "critical", dependencies: ["FRC-0333"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"] },
  { itemId: "FRC-0335", workstream: "Cybersecurity & Data Privacy", section: "Data Privacy", description: "Update privacy notices and cookie policies for all websites", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["data_privacy_breach"] },
  { itemId: "FRC-0336", workstream: "Cybersecurity & Data Privacy", section: "Cyber Risk", description: "Conduct cybersecurity risk assessment of target environment", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["data_privacy_breach"] },
  { itemId: "FRC-0337", workstream: "Cybersecurity & Data Privacy", section: "Cyber Risk", description: "Review and update incident response plan for combined entity", phase: "day_60", priority: "high", dependencies: ["FRC-0336"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0338", workstream: "Cybersecurity & Data Privacy", section: "AI Systems", description: "Identify AI systems in scope and assess EU AI Act compliance", phase: "day_30", priority: "high", dependencies: ["FRC-0333"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay", "data_privacy_breach"] },

  // ─── ESG & Sustainability (22 items, FRC-0369–0390) ──────────────────────
  { itemId: "FRC-0369", workstream: "ESG & Sustainability", section: "ESG Baseline", description: "Establish ESG baseline metrics for combined entity", phase: "day_90", priority: "medium", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0370", workstream: "ESG & Sustainability", section: "ESG Reporting", description: "Assess CSRD/SEC climate disclosure obligations for combined entity", phase: "day_90", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"] },
  { itemId: "FRC-0371", workstream: "ESG & Sustainability", section: "Carbon Accounting", description: "Integrate target into acquirer carbon accounting framework", phase: "day_90", priority: "medium", dependencies: ["FRC-0369"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── Integration Budget & PMO (35 items, FRC-0391–0425) ──────────────────
  { itemId: "FRC-0391", workstream: "Integration Budget & PMO", section: "PMO Setup", description: "Stand up Integration Management Office (IMO) structure", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0392", workstream: "Integration Budget & PMO", section: "PMO Setup", description: "Assign workstream leads across all 12 functional areas", phase: "day_1", priority: "critical", dependencies: ["FRC-0391"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0393", workstream: "Integration Budget & PMO", section: "Budget", description: "Finalize integration budget by workstream and phase", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0394", workstream: "Integration Budget & PMO", section: "Reporting Cadence", description: "Establish weekly SteerCo reporting rhythm and template", phase: "day_1", priority: "high", dependencies: ["FRC-0391"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0395", workstream: "Integration Budget & PMO", section: "Reporting Cadence", description: "Produce first integrated status report for executive leadership", phase: "day_30", priority: "high", dependencies: ["FRC-0394"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0396", workstream: "Integration Budget & PMO", section: "Budget", description: "Track integration spend vs. budget monthly", phase: "day_30", priority: "medium", dependencies: ["FRC-0393"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },

  // ─── Facilities & Real Estate (18 items, FRC-0426–0443) ──────────────────
  { itemId: "FRC-0426", workstream: "Facilities & Real Estate", section: "Lease Review", description: "Inventory all target real estate leases and assess consolidation opportunities", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["stranded_costs"] },
  { itemId: "FRC-0427", workstream: "Facilities & Real Estate", section: "Lease Review", description: "Identify lease assignments requiring landlord consent", phase: "day_30", priority: "high", dependencies: ["FRC-0426"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [] },
  { itemId: "FRC-0428", workstream: "Facilities & Real Estate", section: "Office Consolidation", description: "Assess co-location and office consolidation opportunities", phase: "day_60", priority: "medium", dependencies: ["FRC-0426"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["stranded_costs"] },

  // ─── HR & Workforce Integration (implied, for full taxonomy) ─────────────
  { itemId: "FRC-0443", workstream: "HR & Workforce Integration", section: "HR Day 1 Readiness", description: "Confirm employee benefit continuity at close (COBRA, 401k, health)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["cultural_integration"] },
];

// ============================================================
// Helper: filter master checklist to active items given deal intake
// This is the core decision tree filtering logic
// ============================================================
export function filterByDealContext(
  intake: {
    crossBorder: boolean;
    tsaRequired: string;
    dealStructure: string;
  }
): string[] {
  // Returns itemIds that should be marked N/A based on deal context
  const naItems: string[] = [];

  if (!intake.crossBorder) {
    // Mark all cross-border-only items as N/A
    MASTER_CHECKLIST.forEach((item) => {
      if (item.crossBorderFlag) naItems.push(item.itemId);
    });
  }

  if (intake.tsaRequired === "no") {
    // Mark all TSA-relevant items as N/A
    MASTER_CHECKLIST.forEach((item) => {
      if (item.tsaRelevant) naItems.push(item.itemId);
    });
  }

  return naItems;
}

export const WORKSTREAM_PHASES: Record<string, string> = {
  "TSA Assessment & Exit": "Day 1",
  "Consolidation & Reporting": "Day 1",
  "Operational Accounting": "Day 1",
  "Internal Controls & SOX": "Day 30",
  "Income Tax & Compliance": "Day 1",
  "Treasury & Banking": "Day 1",
  "FP&A & Baselining": "Day 60",
  "Cybersecurity & Data Privacy": "Day 1",
  "ESG & Sustainability": "Day 90",
  "Integration Budget & PMO": "Day 1",
  "Facilities & Real Estate": "Day 30",
  "HR & Workforce Integration": "Day 1",
};
