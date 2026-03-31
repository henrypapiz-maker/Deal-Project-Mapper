// ============================================================
// Bowler Table Engine — Reporting periods, RAG computation,
// view configuration, and track/workstream mapping.
// ============================================================

// ============================================================
// Type Definitions
// ============================================================

export interface ReportingPeriod {
  id: string;
  dealId: string;
  periodLabel: string;
  periodType: "weekly" | "milestone" | "custom";
  periodStart: string;
  periodEnd: string;
  isCurrent: boolean;
  sequenceNum: number;
}

export interface BowlerCell {
  id: string;
  dealId: string;
  periodId: string;
  level: "program" | "track" | "workstream" | "item";
  rowKey: string | null;
  computedRag: "red" | "amber" | "green" | null;
  overrideRag: "red" | "amber" | "green" | null;
  overrideBy: string | null;
  metrics: Record<string, any>;
  narrative: string | null;
  keyRisks: string | null;
  nextSteps: string | null;
  highlightedItems: string[];
  attachments: any[];
  authorId: string | null;
}

export type ViewPreset =
  | "executive"
  | "imo_dashboard"
  | "workstream_detail"
  | "steerco_report"
  | "custom";

export interface ViewConfig {
  defaultLevel: "program" | "track" | "workstream" | "item";
  expandedTracks: string[];
  visiblePeriods: number;
  showNarrative: boolean;
  showMetrics: boolean;
  groupBy: "track" | "phase" | "priority" | "owner";
  sortBy: "alpha" | "rag_severity" | "pct_complete";
}

export const VIEW_PRESETS: Record<ViewPreset, ViewConfig> = {
  executive: {
    defaultLevel: "track",
    expandedTracks: [],
    visiblePeriods: 4,
    showNarrative: false,
    showMetrics: false,
    groupBy: "track",
    sortBy: "rag_severity",
  },
  imo_dashboard: {
    defaultLevel: "workstream",
    expandedTracks: ["Finance", "Controls & Governance", "IT", "Other"],
    visiblePeriods: 8,
    showNarrative: true,
    showMetrics: true,
    groupBy: "track",
    sortBy: "rag_severity",
  },
  workstream_detail: {
    defaultLevel: "item",
    expandedTracks: [],
    visiblePeriods: 4,
    showNarrative: true,
    showMetrics: true,
    groupBy: "track",
    sortBy: "alpha",
  },
  steerco_report: {
    defaultLevel: "workstream",
    expandedTracks: ["Finance", "Controls & Governance", "IT", "Other"],
    visiblePeriods: 1,
    showNarrative: true,
    showMetrics: true,
    groupBy: "track",
    sortBy: "rag_severity",
  },
  custom: {
    defaultLevel: "workstream",
    expandedTracks: [],
    visiblePeriods: 6,
    showNarrative: true,
    showMetrics: true,
    groupBy: "track",
    sortBy: "alpha",
  },
};

// ============================================================
// Period Generation
// ============================================================

/**
 * Generates milestone and weekly reporting periods starting from
 * a deal's close date.  The returned objects omit the `id` field
 * (assigned by the database on insert) but carry an empty string
 * for `dealId` so callers can fill it in before persisting.
 */
export function generatePeriods(
  closeDate: string,
  weeksAhead: number = 52
): Omit<ReportingPeriod, "id">[] {
  const close = new Date(closeDate);
  const periods: Omit<ReportingPeriod, "id">[] = [];
  let seq = 0;
  const today = new Date();

  // Milestone periods
  const milestones = [
    { label: "Day 1", offset: 0 },
    { label: "Day 30", offset: 30 },
    { label: "Day 60", offset: 60 },
    { label: "Day 90", offset: 90 },
    { label: "Year 1", offset: 365 },
  ];

  milestones.forEach((m) => {
    const start = new Date(close);
    start.setDate(start.getDate() + m.offset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    periods.push({
      dealId: "",
      periodLabel: m.label,
      periodType: "milestone",
      periodStart: start.toISOString().split("T")[0],
      periodEnd: end.toISOString().split("T")[0],
      isCurrent: today >= start && today <= end,
      sequenceNum: seq++,
    });
  });

  // Weekly periods
  const weekStart = new Date(close);
  const oneYearAfterClose = new Date(close.getTime() + 365 * 24 * 60 * 60 * 1000);

  for (let w = 1; w <= weeksAhead; w++) {
    const start = new Date(weekStart);
    start.setDate(start.getDate() + (w - 1) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    if (start > oneYearAfterClose) break;
    periods.push({
      dealId: "",
      periodLabel: `Week ${w}`,
      periodType: "weekly",
      periodStart: start.toISOString().split("T")[0],
      periodEnd: end.toISOString().split("T")[0],
      isCurrent: today >= start && today <= end,
      sequenceNum: seq++,
    });
  }

  return periods;
}

// ============================================================
// RAG Computation Helpers
// ============================================================

/**
 * Derives a workstream-level RAG status from raw item metrics.
 * Thresholds:
 *   - Red  : >10 % blocked  OR >20 % past-due
 *   - Amber: any blocked/past-due items, or <70 % complete
 *   - Green: ≥70 % complete with no blocked/past-due items
 */
export function computeWorkstreamRAG(metrics: {
  total: number;
  completed: number;
  blocked: number;
  pastDue: number;
}): "red" | "amber" | "green" {
  if (metrics.total === 0) return "green";

  const blockedPct = metrics.blocked / metrics.total;
  const pastDuePct = metrics.pastDue / metrics.total;

  if (blockedPct > 0.1 || pastDuePct > 0.2) return "red";
  if (metrics.blocked > 0 || metrics.pastDue > 0) return "amber";

  const completePct = metrics.completed / metrics.total;
  if (completePct >= 0.7) return "green";
  if (completePct >= 0.3) return "amber";
  return "red";
}

/**
 * Rolls up workstream RAG statuses to a track-level RAG.
 * Any red child is red; >30 % amber children escalate to red;
 * any amber child otherwise yields amber; all green yields green.
 */
export function computeTrackRAG(
  workstreamRags: ("red" | "amber" | "green")[]
): "red" | "amber" | "green" {
  if (workstreamRags.some((r) => r === "red")) return "red";
  if (
    workstreamRags.filter((r) => r === "amber").length >
    workstreamRags.length * 0.3
  )
    return "red";
  if (workstreamRags.some((r) => r === "amber")) return "amber";
  return "green";
}

/**
 * Rolls up track RAG statuses to program level.
 * Any red track is red; any amber track is amber; otherwise green.
 */
export function computeProgramRAG(
  trackRags: ("red" | "amber" | "green")[]
): "red" | "amber" | "green" {
  if (trackRags.some((r) => r === "red")) return "red";
  if (trackRags.some((r) => r === "amber")) return "amber";
  return "green";
}

// ============================================================
// Track Mapping
// ============================================================

/**
 * Maps every workstream name (matching the `Workstream` union in
 * types.ts) to its parent track.  The key for IT Vendor Management
 * uses the canonical name "IT > IT Vendor Management" consistent
 * with the Workstream type definition.
 */
export const WORKSTREAM_TRACK_MAP: Record<string, string> = {
  // Finance Track
  "TSA": "Finance",
  "Technical Accounting": "Finance",
  "Financial Reporting & Consolidation": "Finance",
  "FP&A": "Finance",
  "Operational Finance": "Finance",
  "Income Tax": "Finance",
  "Treasury": "Finance",
  // Controls & Governance Track
  "Controls": "Controls & Governance",
  "Governance & Compliance": "Controls & Governance",
  // IT Track
  "IT Strategy & Governance": "IT",
  "IT > Enterprise Systems": "IT",
  "IT > Infrastructure": "IT",
  "IT > Data & Analytics": "IT",
  "IT > IT Vendor Management": "IT",
  "IT > Client-Facing & Digital": "IT",
  // Other Track
  "ESG": "Other",
  "Integration Management": "Other",
  "Facilities": "Other",
  "Human Resources": "Other",
  "Legal": "Other",
  "Communications": "Other",
};

/** Canonical display order for the four tracks. */
export const TRACK_ORDER = ["Finance", "Controls & Governance", "IT", "Other"];

// ============================================================
// Effective RAG Helper
// ============================================================

/**
 * Returns the RAG status that should be displayed for a cell,
 * preferring a manual override over the computed value and
 * defaulting to "green" when neither is set.
 */
export function effectiveRag(
  cell: BowlerCell
): "red" | "amber" | "green" {
  return cell.overrideRag ?? cell.computedRag ?? "green";
}
