import type { GeneratedDeal } from "./types";

const PHASE_LABELS: Record<string, string> = {
  pre_close: "Pre-Close",
  day_1: "Day 1",
  day_30: "Day 1–30",
  day_60: "Day 30–60",
  day_90: "Day 60–90",
  year_1: "Year 1",
};

const STRUCTURE_LABELS: Record<string, string> = {
  stock_purchase: "Stock Purchase",
  asset_purchase: "Asset Purchase",
  merger_forward: "Forward Merger",
  merger_reverse: "Reverse Triangular Merger",
  carve_out: "Carve-Out",
  f_reorg: "F-Reorganization",
};

const MODEL_LABELS: Record<string, string> = {
  fully_integrated: "Fully Integrated",
  hybrid: "Hybrid",
  standalone: "Standalone",
};

// ── CSV helpers ──────────────────────────────────────────────────────────────

function cell(v: string | number | boolean): string {
  const s = String(v);
  // Wrap in quotes if it contains comma, quote, or newline
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(cols: (string | number | boolean)[]): string {
  return cols.map(cell).join(",");
}

function downloadCsv(filename: string, lines: string[]) {
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function slugify(name: string): string {
  return name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").toLowerCase();
}

// ── Exports ──────────────────────────────────────────────────────────────────

export function exportChecklist(deal: GeneratedDeal) {
  const active = deal.checklistItems.filter((i) => i.status !== "na");
  const lines = [
    row(["Item_ID", "Workstream", "Section", "Description", "Phase", "Priority", "Status", "Milestone_Date", "TSA_Relevant", "Cross_Border", "Risk_Indicators"]),
    ...active.map((i) =>
      row([
        i.itemId,
        i.workstream,
        i.section,
        i.description,
        PHASE_LABELS[i.phase] ?? i.phase,
        i.priority,
        i.status.replace(/_/g, " "),
        i.milestoneDate ?? "",
        i.tsaRelevant ? "Yes" : "No",
        i.crossBorderFlag ? "Yes" : "No",
        i.riskIndicators.join("; "),
      ])
    ),
  ];
  downloadCsv(`${slugify(deal.intake.dealName)}_checklist.csv`, lines);
}

export function exportRisks(deal: GeneratedDeal) {
  if (deal.riskAlerts.length === 0) {
    alert("No risks detected for this deal profile.");
    return;
  }
  const lines = [
    row(["Risk_ID", "Category", "Severity", "Status", "Description", "Mitigation", "Affected_Workstreams"]),
    ...deal.riskAlerts.map((r, idx) =>
      row([
        `RISK-${String(idx + 1).padStart(3, "0")}`,
        r.category.replace(/_/g, " "),
        r.severity,
        r.status,
        r.description,
        r.mitigation,
        r.affectedWorkstreams.join("; "),
      ])
    ),
  ];
  downloadCsv(`${slugify(deal.intake.dealName)}_risks.csv`, lines);
}

export function exportSummary(deal: GeneratedDeal) {
  const { intake, checklistItems, riskAlerts, milestones } = deal;
  const active = checklistItems.filter((i) => i.status !== "na");
  const complete = active.filter((i) => i.status === "complete").length;
  const blocked = active.filter((i) => i.status === "blocked").length;
  const inProgress = active.filter((i) => i.status === "in_progress").length;

  const lines = [
    // Deal intake
    row(["Section", "Field", "Value"]),
    row(["Deal Profile", "Deal Name", intake.dealName]),
    row(["Deal Profile", "Structure", STRUCTURE_LABELS[intake.dealStructure] ?? intake.dealStructure]),
    row(["Deal Profile", "Integration Model", MODEL_LABELS[intake.integrationModel] ?? intake.integrationModel]),
    row(["Deal Profile", "Close Date", intake.closeDate ?? "TBD"]),
    row(["Deal Profile", "Cross-Border", intake.crossBorder ? intake.jurisdictions.join("; ") : "Domestic"]),
    row(["Deal Profile", "TSA Required", intake.tsaRequired.toUpperCase()]),
    row(["Deal Profile", "Industry Sector", intake.industrySector ?? ""]),
    row(["Deal Profile", "Deal Value Range", intake.dealValueRange ?? ""]),
    row(["Deal Profile", "Target Entities", intake.targetEntities]),
    row(["Deal Profile", "Target GAAP", intake.targetGaap ?? ""]),
    row(["Deal Profile", "Target ERP", intake.targetErp ?? ""]),
    row(["Deal Profile", "Buyer Maturity", intake.buyerMaturity ?? ""]),
    row([]),
    // KPIs
    row(["KPIs", "Total Active Items", active.length]),
    row(["KPIs", "Completed", complete]),
    row(["KPIs", "In Progress", inProgress]),
    row(["KPIs", "Blocked", blocked]),
    row(["KPIs", "Not Started", active.length - complete - inProgress - blocked]),
    row(["KPIs", "% Complete", `${active.length ? Math.round((complete / active.length) * 100) : 0}%`]),
    row(["KPIs", "Open Risks", riskAlerts.filter((r) => r.status === "open").length]),
    row(["KPIs", "Critical Risks", riskAlerts.filter((r) => r.severity === "critical").length]),
    row([]),
    // Milestones
    row(["Milestones", "Phase", "Date"]),
    ...milestones.map((m) => row(["Milestones", m.label, m.date])),
    row([]),
    // Generated
    row(["Meta", "Generated At", new Date(deal.generatedAt).toLocaleString()]),
  ];
  downloadCsv(`${slugify(deal.intake.dealName)}_summary.csv`, lines);
}
