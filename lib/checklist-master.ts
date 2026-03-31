import type { Workstream, Phase, Priority, RiskCategory, FunctionalArea } from "./types";

// ============================================================
// Master Checklist Template — FRC items (representative set)
// Finance taxonomy: FRC-0001 through FRC-0443
// IT taxonomy: FRC-0444+ (from IT_Integration_Taxonomy_v3)
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
  functionalArea: FunctionalArea;
  aiGuidanceTemplate?: string;
}

export const MASTER_CHECKLIST: MasterItem[] = [
  // ─── TSA Assessment & Exit (70 items, FRC-0001–0070) ─────────────────────
  { itemId: "FRC-0001", workstream: "TSA Assessment & Exit", section: "TSA Identification", description: "Identify all shared services requiring TSA coverage at close", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0002", workstream: "TSA Assessment & Exit", section: "TSA Identification", description: "Define SLA metrics for each TSA service category", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0003", workstream: "TSA Assessment & Exit", section: "TSA Pricing", description: "Establish TSA pricing model (cost-plus baseline)", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0004", workstream: "TSA Assessment & Exit", section: "TSA Exit Planning", description: "Map TSA exit milestones by service category", phase: "day_1", priority: "critical", dependencies: ["FRC-0001", "FRC-0002"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0005", workstream: "TSA Assessment & Exit", section: "TSA Exit Planning", description: "Assess standalone capability for each TSA service", phase: "day_30", priority: "critical", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency", "stranded_costs"], functionalArea: "all" },
  { itemId: "FRC-0006", workstream: "TSA Assessment & Exit", section: "TSA Governance", description: "Establish TSA governance committee and escalation path", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0007", workstream: "TSA Assessment & Exit", section: "TSA Governance", description: "Document TSA invoice reconciliation process", phase: "day_30", priority: "medium", dependencies: ["FRC-0003", "FRC-0006"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0008", workstream: "TSA Assessment & Exit", section: "IT TSA", description: "Identify all IT infrastructure under TSA scope", phase: "day_1", priority: "critical", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0009", workstream: "TSA Assessment & Exit", section: "IT TSA", description: "Define email and identity transition timeline under TSA", phase: "day_1", priority: "critical", dependencies: ["FRC-0008"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0010", workstream: "TSA Assessment & Exit", section: "Finance TSA", description: "Identify finance systems covered under TSA (ERP, payroll, reporting)", phase: "day_1", priority: "critical", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },
  { itemId: "FRC-0011", workstream: "TSA Assessment & Exit", section: "Finance TSA", description: "Establish interim financial reporting process under TSA", phase: "day_1", priority: "high", dependencies: ["FRC-0010"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0012", workstream: "TSA Assessment & Exit", section: "TSA Stranded Cost", description: "Identify stranded costs post-TSA exit by service", phase: "day_60", priority: "high", dependencies: ["FRC-0005"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["stranded_costs"], functionalArea: "all" },
  { itemId: "FRC-0013", workstream: "TSA Assessment & Exit", section: "Cross-Border TSA", description: "Identify cross-border TSA services and regulatory implications", phase: "day_1", priority: "high", dependencies: ["FRC-0001"], tsaRelevant: true, crossBorderFlag: true, riskIndicators: ["tsa_dependency", "regulatory_delay"], functionalArea: "all" },
  { itemId: "FRC-0014", workstream: "TSA Assessment & Exit", section: "TSA Exit Planning", description: "Build TSA exit roadmap with service dependency sequencing", phase: "day_30", priority: "critical", dependencies: ["FRC-0004", "FRC-0005"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "all" },

  // ─── Consolidation & Reporting (52 items, FRC-0071–0122) ─────────────────
  { itemId: "FRC-0071", workstream: "Consolidation & Reporting", section: "Chart of Accounts", description: "Map target COA to acquirer COA structure", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"], functionalArea: "finance" },
  { itemId: "FRC-0072", workstream: "Consolidation & Reporting", section: "Chart of Accounts", description: "Identify intercompany elimination entries", phase: "day_1", priority: "high", dependencies: ["FRC-0071"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"], functionalArea: "finance" },
  { itemId: "FRC-0073", workstream: "Consolidation & Reporting", section: "Chart of Accounts", description: "Configure consolidation journal entries", phase: "day_30", priority: "high", dependencies: ["FRC-0072"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0074", workstream: "Consolidation & Reporting", section: "GAAP Conversion", description: "Assess GAAP conversion requirements (if target GAAP differs)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"], functionalArea: "finance" },
  { itemId: "FRC-0075", workstream: "Consolidation & Reporting", section: "GAAP Conversion", description: "Document differences between target and acquirer accounting policies", phase: "day_30", priority: "high", dependencies: ["FRC-0074"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["financial_reporting_gap"], functionalArea: "finance" },
  { itemId: "FRC-0076", workstream: "Consolidation & Reporting", section: "First Close", description: "Prepare first post-close consolidated financial statements", phase: "day_30", priority: "critical", dependencies: ["FRC-0071", "FRC-0072", "FRC-0074"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0077", workstream: "Consolidation & Reporting", section: "Statutory Reporting", description: "Identify statutory reporting obligations for all entities", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"], functionalArea: "finance" },
  { itemId: "FRC-0078", workstream: "Consolidation & Reporting", section: "Statutory Reporting", description: "File change-of-control statutory notifications", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"], functionalArea: "finance" },
  { itemId: "FRC-0079", workstream: "Consolidation & Reporting", section: "Reporting Calendar", description: "Establish consolidated reporting calendar and close schedule", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0080", workstream: "Consolidation & Reporting", section: "Intercompany", description: "Establish intercompany billing and reconciliation process", phase: "day_30", priority: "high", dependencies: ["FRC-0072"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },

  // ─── Operational Accounting (68 items, FRC-0123–0190) ────────────────────
  { itemId: "FRC-0123", workstream: "Operational Accounting", section: "AP/AR Cutoff", description: "Validate AP cutoff procedures at close", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0124", workstream: "Operational Accounting", section: "AP/AR Cutoff", description: "Establish intercompany billing process", phase: "day_1", priority: "high", dependencies: ["FRC-0123"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0125", workstream: "Operational Accounting", section: "Banking", description: "Execute bank account cutover at close", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0126", workstream: "Operational Accounting", section: "Banking", description: "Update signatories on all target bank accounts", phase: "day_1", priority: "critical", dependencies: ["FRC-0125"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0127", workstream: "Operational Accounting", section: "Payroll", description: "Confirm payroll continuity for all employees on close date", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0128", workstream: "Operational Accounting", section: "Payroll", description: "Establish payroll accrual methodology post-close", phase: "day_30", priority: "high", dependencies: ["FRC-0127"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0129", workstream: "Operational Accounting", section: "Accounts Payable", description: "Review and approve all open purchase orders at close", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0130", workstream: "Operational Accounting", section: "Accounts Receivable", description: "Review open AR aging and agree collection process", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },

  // ─── Internal Controls & SOX (44 items, FRC-0191–0234) ───────────────────
  { itemId: "FRC-0191", workstream: "Internal Controls & SOX", section: "SOX Scoping", description: "Map target SOX controls to acquirer framework", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "operations" },
  { itemId: "FRC-0192", workstream: "Internal Controls & SOX", section: "SOX Scoping", description: "Determine SOX scope for acquired entities (in-scope vs. out)", phase: "day_30", priority: "critical", dependencies: ["FRC-0191"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "operations" },
  { itemId: "FRC-0193", workstream: "Internal Controls & SOX", section: "Control Testing", description: "Identify gaps in target control environment", phase: "day_60", priority: "high", dependencies: ["FRC-0192"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "operations" },
  { itemId: "FRC-0194", workstream: "Internal Controls & SOX", section: "Control Testing", description: "Develop remediation plan for identified control gaps", phase: "day_60", priority: "high", dependencies: ["FRC-0193"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "operations" },
  { itemId: "FRC-0195", workstream: "Internal Controls & SOX", section: "ITGC", description: "Assess IT General Controls for acquired systems", phase: "day_60", priority: "high", dependencies: ["FRC-0192"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "operations" },

  // ─── Income Tax & Compliance (38 items, FRC-0235–0272) ───────────────────
  { itemId: "FRC-0235", workstream: "Income Tax & Compliance", section: "Tax Structure", description: "Review deal structure for tax efficiency (§338, §336 elections)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["tax_structure_leakage"], functionalArea: "tax" },
  { itemId: "FRC-0236", workstream: "Income Tax & Compliance", section: "Tax Compliance", description: "File all required federal and state tax change-of-ownership notifications", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["regulatory_delay"], functionalArea: "tax" },
  { itemId: "FRC-0237", workstream: "Income Tax & Compliance", section: "Tax Compliance", description: "Confirm tax return filing obligations for stub period", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "tax" },
  { itemId: "FRC-0238", workstream: "Income Tax & Compliance", section: "Transfer Pricing", description: "Document intercompany transfer pricing policies", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["tax_structure_leakage", "regulatory_delay"], functionalArea: "tax" },
  { itemId: "FRC-0239", workstream: "Income Tax & Compliance", section: "Pillar Two", description: "Assess Pillar Two (Global Minimum Tax) exposure by jurisdiction", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["tax_structure_leakage"], functionalArea: "tax" },
  { itemId: "FRC-0240", workstream: "Income Tax & Compliance", section: "CFIUS/Regulatory", description: "File CFIUS voluntary notice if applicable", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"], functionalArea: "tax" },
  { itemId: "FRC-0241", workstream: "Income Tax & Compliance", section: "CFIUS/Regulatory", description: "File merger clearance notifications in all required jurisdictions", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"], functionalArea: "tax" },
  { itemId: "FRC-0242", workstream: "Income Tax & Compliance", section: "Tax Attributes", description: "Identify and value NOLs, credits and other tax attributes", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["tax_structure_leakage"], functionalArea: "tax" },

  // ─── Treasury & Banking (32 items, FRC-0273–0304) ────────────────────────
  { itemId: "FRC-0273", workstream: "Treasury & Banking", section: "Cash Management", description: "Establish cash pooling and sweeping arrangements", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "treasury" },
  { itemId: "FRC-0274", workstream: "Treasury & Banking", section: "Cash Management", description: "Review target debt instruments and covenant compliance", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "treasury" },
  { itemId: "FRC-0275", workstream: "Treasury & Banking", section: "Banking Relationships", description: "Notify all banks of ownership change and update KYC/AML documentation", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "treasury" },
  { itemId: "FRC-0276", workstream: "Treasury & Banking", section: "FX Risk", description: "Assess FX exposure across all transaction currencies", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["financial_reporting_gap"], functionalArea: "treasury" },
  { itemId: "FRC-0277", workstream: "Treasury & Banking", section: "Credit Facilities", description: "Review and update credit facility documentation post-close", phase: "day_30", priority: "high", dependencies: ["FRC-0274"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "treasury" },

  // ─── FP&A & Baselining (28 items, FRC-0305–0332) ─────────────────────────
  { itemId: "FRC-0305", workstream: "FP&A & Baselining", section: "Budget Integration", description: "Integrate target budget into acquirer planning cycle", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0306", workstream: "FP&A & Baselining", section: "Synergy Tracking", description: "Establish cost and revenue synergy baseline and tracking model", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0307", workstream: "FP&A & Baselining", section: "Synergy Tracking", description: "Assign synergy owners and reporting cadence", phase: "day_60", priority: "medium", dependencies: ["FRC-0306"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },
  { itemId: "FRC-0308", workstream: "FP&A & Baselining", section: "Forecast Integration", description: "Prepare first combined P&L and cash flow forecast", phase: "day_60", priority: "high", dependencies: ["FRC-0305"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "finance" },

  // ─── Cybersecurity & Data Privacy (36 items, FRC-0333–0368) ──────────────
  { itemId: "FRC-0333", workstream: "Cybersecurity & Data Privacy", section: "Data Privacy", description: "Assess GDPR/CCPA compliance for all personal data processing", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"], functionalArea: "cybersecurity" },
  { itemId: "FRC-0334", workstream: "Cybersecurity & Data Privacy", section: "Data Privacy", description: "Initiate Data Protection Impact Assessment (DPIA) for EU operations", phase: "day_1", priority: "critical", dependencies: ["FRC-0333"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"], functionalArea: "cybersecurity" },
  { itemId: "FRC-0335", workstream: "Cybersecurity & Data Privacy", section: "Data Privacy", description: "Update privacy notices and cookie policies for all websites", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["data_privacy_breach"], functionalArea: "cybersecurity" },
  { itemId: "FRC-0336", workstream: "Cybersecurity & Data Privacy", section: "Cyber Risk", description: "Conduct cybersecurity risk assessment of target environment", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["data_privacy_breach"], functionalArea: "cybersecurity" },
  { itemId: "FRC-0337", workstream: "Cybersecurity & Data Privacy", section: "Cyber Risk", description: "Review and update incident response plan for combined entity", phase: "day_60", priority: "high", dependencies: ["FRC-0336"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "cybersecurity" },
  { itemId: "FRC-0338", workstream: "Cybersecurity & Data Privacy", section: "AI Systems", description: "Identify AI systems in scope and assess EU AI Act compliance", phase: "day_30", priority: "high", dependencies: ["FRC-0333"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay", "data_privacy_breach"], functionalArea: "cybersecurity" },

  // ─── ESG & Sustainability (22 items, FRC-0369–0390) ──────────────────────
  { itemId: "FRC-0369", workstream: "ESG & Sustainability", section: "ESG Baseline", description: "Establish ESG baseline metrics for combined entity", phase: "day_90", priority: "medium", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "esg" },
  { itemId: "FRC-0370", workstream: "ESG & Sustainability", section: "ESG Reporting", description: "Assess CSRD/SEC climate disclosure obligations for combined entity", phase: "day_90", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["regulatory_delay"], functionalArea: "esg" },
  { itemId: "FRC-0371", workstream: "ESG & Sustainability", section: "Carbon Accounting", description: "Integrate target into acquirer carbon accounting framework", phase: "day_90", priority: "medium", dependencies: ["FRC-0369"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "esg" },

  // ─── Integration Budget & PMO (35 items, FRC-0391–0425) ──────────────────
  { itemId: "FRC-0391", workstream: "Integration Budget & PMO", section: "PMO Setup", description: "Stand up Integration Management Office (IMO) structure", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0392", workstream: "Integration Budget & PMO", section: "PMO Setup", description: "Assign workstream leads across all functional areas", phase: "day_1", priority: "critical", dependencies: ["FRC-0391"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0393", workstream: "Integration Budget & PMO", section: "Budget", description: "Finalize integration budget by workstream and phase", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0394", workstream: "Integration Budget & PMO", section: "Reporting Cadence", description: "Establish weekly SteerCo reporting rhythm and template", phase: "day_1", priority: "high", dependencies: ["FRC-0391"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0395", workstream: "Integration Budget & PMO", section: "Reporting Cadence", description: "Produce first integrated status report for executive leadership", phase: "day_30", priority: "high", dependencies: ["FRC-0394"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },
  { itemId: "FRC-0396", workstream: "Integration Budget & PMO", section: "Budget", description: "Track integration spend vs. budget monthly", phase: "day_30", priority: "medium", dependencies: ["FRC-0393"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "all" },

  // ─── Facilities & Real Estate (18 items, FRC-0426–0443) ──────────────────
  { itemId: "FRC-0426", workstream: "Facilities & Real Estate", section: "Lease Review", description: "Inventory all target real estate leases and assess consolidation opportunities", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["stranded_costs"], functionalArea: "facilities" },
  { itemId: "FRC-0427", workstream: "Facilities & Real Estate", section: "Lease Review", description: "Identify lease assignments requiring landlord consent", phase: "day_30", priority: "high", dependencies: ["FRC-0426"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "facilities" },
  { itemId: "FRC-0428", workstream: "Facilities & Real Estate", section: "Office Consolidation", description: "Assess co-location and office consolidation opportunities", phase: "day_60", priority: "medium", dependencies: ["FRC-0426"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["stranded_costs"], functionalArea: "facilities" },

  // ─── HR & Workforce Integration ──────────────────────────────────────────
  { itemId: "FRC-0443", workstream: "HR & Workforce Integration", section: "HR Day 1 Readiness", description: "Confirm employee benefit continuity at close (COBRA, 401k, health)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["cultural_integration"], functionalArea: "hr" },

  // ═══════════════════════════════════════════════════════════════════════════
  // IT INTEGRATION TAXONOMY v3 — 10 Domains as Workstreams
  // Source: IT_Integration_Taxonomy_v3_Complete.xlsx
  // FRC-0444+ (IT functional area)
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── 1. IT Governance & Strategy (L3 count: 17) ──────────────────────────
  { itemId: "FRC-0444", workstream: "IT Governance & Strategy", section: "IT Strategic Alignment", description: "Assess target IT strategic alignment with acquirer technology roadmap", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0445", workstream: "IT Governance & Strategy", section: "IT Strategic Alignment", description: "Map IT decision rights and governance structure for combined entity", phase: "day_1", priority: "high", dependencies: ["FRC-0444"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0446", workstream: "IT Governance & Strategy", section: "IT Governance Framework", description: "Harmonize IT governance frameworks (GRC platforms, risk management)", phase: "day_30", priority: "high", dependencies: ["FRC-0445"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0447", workstream: "IT Governance & Strategy", section: "IT Policy & Standards", description: "Consolidate IT policies, standards, and acceptable use policies", phase: "day_30", priority: "medium", dependencies: ["FRC-0446"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0448", workstream: "IT Governance & Strategy", section: "IT Governance Framework", description: "Establish combined IT risk register and reporting cadence", phase: "day_30", priority: "high", dependencies: ["FRC-0446"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },

  // ─── 2. IT Organization & Talent (L3 count: 15) ─────────────────────────
  { itemId: "FRC-0449", workstream: "IT Organization & Talent", section: "IT Org Structure & Leadership", description: "Assess target IT org structure and identify leadership alignment", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0450", workstream: "IT Organization & Talent", section: "IT Org Structure & Leadership", description: "Define Day 1 IT reporting structure and interim leadership roles", phase: "day_1", priority: "critical", dependencies: ["FRC-0449"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0451", workstream: "IT Organization & Talent", section: "IT Talent & Retention", description: "Identify critical IT talent and design retention incentive plan", phase: "day_30", priority: "high", dependencies: ["FRC-0449"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["cultural_integration"], functionalArea: "it" },
  { itemId: "FRC-0452", workstream: "IT Organization & Talent", section: "IT Staffing Model", description: "Assess contractor and vendor staffing dependencies in target IT", phase: "day_30", priority: "medium", dependencies: ["FRC-0449"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },

  // ─── 3. Enterprise Applications (L3 count: 40) ──────────────────────────
  { itemId: "FRC-0453", workstream: "Enterprise Applications", section: "Core Business Applications", description: "Inventory all ERP, CRM, and HRIS systems across target and acquirer", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0454", workstream: "Enterprise Applications", section: "Core Business Applications", description: "Develop ERP migration or consolidation strategy (target to acquirer platform)", phase: "day_30", priority: "critical", dependencies: ["FRC-0453"], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["it_integration_risk", "tsa_dependency"], functionalArea: "it" },
  { itemId: "FRC-0455", workstream: "Enterprise Applications", section: "Core Business Applications", description: "Map chart of accounts and master data between ERP systems", phase: "day_30", priority: "high", dependencies: ["FRC-0454"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0456", workstream: "Enterprise Applications", section: "Industry-Specific Platforms", description: "Assess industry-specific platform overlap (PSA, billing, payment processing)", phase: "day_30", priority: "high", dependencies: ["FRC-0453"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0457", workstream: "Enterprise Applications", section: "Collaboration & Productivity", description: "Plan email, calendar, and collaboration tool migration (M365/Google)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["tsa_dependency"], functionalArea: "it" },
  { itemId: "FRC-0458", workstream: "Enterprise Applications", section: "Collaboration & Productivity", description: "Consolidate document management systems and shared drives", phase: "day_60", priority: "medium", dependencies: ["FRC-0457"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0459", workstream: "Enterprise Applications", section: "Workflow & Automation", description: "Inventory RPA, iPaaS, and workflow automation tools for rationalization", phase: "day_60", priority: "medium", dependencies: ["FRC-0453"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },

  // ─── 4. Infrastructure & Cloud (L3 count: 28) ───────────────────────────
  { itemId: "FRC-0460", workstream: "Infrastructure & Cloud", section: "Cloud Services & Strategy", description: "Inventory all cloud services (IaaS, PaaS, SaaS) across both entities", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: true, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0461", workstream: "Infrastructure & Cloud", section: "Cloud Services & Strategy", description: "Develop cloud consolidation strategy and FinOps cost model", phase: "day_30", priority: "high", dependencies: ["FRC-0460"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0462", workstream: "Infrastructure & Cloud", section: "On-Premises Infrastructure", description: "Assess on-premises server, network, and data center consolidation opportunities", phase: "day_30", priority: "high", dependencies: ["FRC-0460"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["stranded_costs"], functionalArea: "it" },
  { itemId: "FRC-0463", workstream: "Infrastructure & Cloud", section: "IT Operations & ITSM", description: "Consolidate help desk and ITSM tool platforms", phase: "day_60", priority: "medium", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0464", workstream: "Infrastructure & Cloud", section: "DR & Business Continuity", description: "Integrate disaster recovery and business continuity plans for combined entity", phase: "day_30", priority: "high", dependencies: ["FRC-0460"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },

  // ─── 5. Data Management & Analytics (L3 count: 22) ──────────────────────
  { itemId: "FRC-0465", workstream: "Data Management & Analytics", section: "Data Architecture & Governance", description: "Assess data architecture and establish combined data governance framework", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0466", workstream: "Data Management & Analytics", section: "Data Architecture & Governance", description: "Plan master data management (MDM) consolidation across entities", phase: "day_60", priority: "high", dependencies: ["FRC-0465"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0467", workstream: "Data Management & Analytics", section: "Analytics & BI", description: "Rationalize BI and analytics platforms; plan unified reporting layer", phase: "day_60", priority: "medium", dependencies: ["FRC-0465"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0468", workstream: "Data Management & Analytics", section: "Data Lifecycle Management", description: "Establish data retention, archival, and destruction policies for combined entity", phase: "day_60", priority: "medium", dependencies: ["FRC-0465"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"], functionalArea: "it" },

  // ─── 6. Cybersecurity & Risk (L3 count: 31) ─────────────────────────────
  { itemId: "FRC-0469", workstream: "Cybersecurity & Risk", section: "Security Governance & Compliance", description: "Assess target security posture and compliance certifications (SOC 2, ISO 27001)", phase: "day_1", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["data_privacy_breach", "it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0470", workstream: "Cybersecurity & Risk", section: "Security Governance & Compliance", description: "Identify regulatory compliance gaps (PCI-DSS, HIPAA, licensing requirements)", phase: "day_30", priority: "high", dependencies: ["FRC-0469"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["regulatory_delay"], functionalArea: "it" },
  { itemId: "FRC-0471", workstream: "Cybersecurity & Risk", section: "Security Operations", description: "Integrate SOC operations and consolidate SIEM/monitoring platforms", phase: "day_60", priority: "high", dependencies: ["FRC-0469"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0472", workstream: "Cybersecurity & Risk", section: "Security Operations", description: "Consolidate IAM platforms and implement unified access provisioning", phase: "day_30", priority: "critical", dependencies: ["FRC-0469"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0473", workstream: "Cybersecurity & Risk", section: "Data Protection & Privacy", description: "Review data loss prevention (DLP) and encryption standards across entities", phase: "day_30", priority: "high", dependencies: ["FRC-0469"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"], functionalArea: "it" },

  // ─── 7. IT General Controls — ITGC (L3 count: 33) ──────────────────────
  { itemId: "FRC-0474", workstream: "IT General Controls (ITGC)", section: "Access Controls", description: "Assess user provisioning and deprovisioning processes across target systems", phase: "day_30", priority: "critical", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0475", workstream: "IT General Controls (ITGC)", section: "Access Controls", description: "Review segregation of duties (SoD) in financial systems and resolve conflicts", phase: "day_30", priority: "high", dependencies: ["FRC-0474"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0476", workstream: "IT General Controls (ITGC)", section: "Change Management", description: "Harmonize change management and release processes (CI/CD, CAB)", phase: "day_60", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0477", workstream: "IT General Controls (ITGC)", section: "IT Operations Controls", description: "Review batch processing, job scheduling, and backup/recovery controls", phase: "day_60", priority: "medium", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0478", workstream: "IT General Controls (ITGC)", section: "SDLC / Program Development", description: "Align software development lifecycle and QA testing standards", phase: "day_60", priority: "medium", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },

  // ─── 8. Vendor & Third-Party Mgmt (L3 count: 22) ───────────────────────
  { itemId: "FRC-0479", workstream: "Vendor & Third-Party Mgmt", section: "Vendor Governance & Risk", description: "Consolidate vendor inventories and assess third-party risk exposure", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0480", workstream: "Vendor & Third-Party Mgmt", section: "Vendor Governance & Risk", description: "Identify vendor concentration risks in critical IT services", phase: "day_30", priority: "high", dependencies: ["FRC-0479"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0481", workstream: "Vendor & Third-Party Mgmt", section: "Contract Management", description: "Review IT vendor contracts for change-of-control clauses and renegotiation opportunities", phase: "day_60", priority: "high", dependencies: ["FRC-0479"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0482", workstream: "Vendor & Third-Party Mgmt", section: "Outsourcing & Managed Services", description: "Assess MSP/MSSP and outsourcing contracts for consolidation or transition", phase: "day_60", priority: "medium", dependencies: ["FRC-0479"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["stranded_costs"], functionalArea: "it" },

  // ─── 9. Client-Facing Tech & Product (L3 count: 18) ────────────────────
  { itemId: "FRC-0483", workstream: "Client-Facing Tech & Product", section: "Digital Products & Platforms", description: "Inventory client-facing digital products, portals, and API ecosystem", phase: "day_1", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0484", workstream: "Client-Facing Tech & Product", section: "Product Engineering", description: "Assess product engineering capabilities and platform architecture alignment", phase: "day_30", priority: "high", dependencies: ["FRC-0483"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: ["it_integration_risk"], functionalArea: "it" },
  { itemId: "FRC-0485", workstream: "Client-Facing Tech & Product", section: "Client Data & Privacy", description: "Review client data handling, consent management, and privacy compliance", phase: "day_30", priority: "critical", dependencies: ["FRC-0483"], tsaRelevant: false, crossBorderFlag: true, riskIndicators: ["data_privacy_breach"], functionalArea: "it" },

  // ─── 10. IT Financial Mgmt & Synergies (L3 count: 23) ──────────────────
  { itemId: "FRC-0486", workstream: "IT Financial Mgmt & Synergies", section: "IT Spend & Budget Analysis", description: "Analyze combined IT spend as % of revenue and benchmark against industry", phase: "day_30", priority: "high", dependencies: [], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0487", workstream: "IT Financial Mgmt & Synergies", section: "License & Subscription Mgmt", description: "Audit all software licenses and SaaS subscriptions for consolidation savings", phase: "day_60", priority: "high", dependencies: ["FRC-0486"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0488", workstream: "IT Financial Mgmt & Synergies", section: "Synergy Identification", description: "Identify and quantify IT integration synergies (infrastructure, licensing, headcount)", phase: "day_60", priority: "critical", dependencies: ["FRC-0486", "FRC-0453"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
  { itemId: "FRC-0489", workstream: "IT Financial Mgmt & Synergies", section: "Integration Cost Estimation", description: "Estimate IT integration costs by workstream and build migration budget", phase: "day_60", priority: "high", dependencies: ["FRC-0488"], tsaRelevant: false, crossBorderFlag: false, riskIndicators: [], functionalArea: "it" },
];

// ============================================================
// Helper: filter master checklist to active items given deal intake
// Returns itemIds that should be marked N/A
// ============================================================
export function filterByDealContext(
  intake: {
    crossBorder: boolean;
    tsaRequired: string;
    dealStructure: string;
    functionalScope?: FunctionalArea[];
  }
): string[] {
  const naItems: string[] = [];

  if (!intake.crossBorder) {
    MASTER_CHECKLIST.forEach((item) => {
      if (item.crossBorderFlag) naItems.push(item.itemId);
    });
  }

  if (intake.tsaRequired === "no") {
    MASTER_CHECKLIST.forEach((item) => {
      if (item.tsaRelevant) naItems.push(item.itemId);
    });
  }

  // Functional scope filtering
  const scope = intake.functionalScope;
  if (scope && scope.length > 0 && !scope.includes("all")) {
    MASTER_CHECKLIST.forEach((item) => {
      if (item.functionalArea !== "all" && !scope.includes(item.functionalArea)) {
        naItems.push(item.itemId);
      }
    });
  }

  return naItems;
}

export const WORKSTREAM_PHASES: Record<string, string> = {
  // Finance & Operational
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
  // IT workstreams
  "IT Governance & Strategy": "Day 1",
  "IT Organization & Talent": "Day 30",
  "Enterprise Applications": "Day 1",
  "Infrastructure & Cloud": "Day 1",
  "Data Management & Analytics": "Day 30",
  "Cybersecurity & Risk": "Day 1",
  "IT General Controls (ITGC)": "Day 30",
  "Vendor & Third-Party Mgmt": "Day 60",
  "Client-Facing Tech & Product": "Day 30",
  "IT Financial Mgmt & Synergies": "Day 60",
};
