// ============================================================
// M&A Integration Engine — Core Report Context Engine
// ============================================================

import type { DealIntake, GeneratedDeal } from "./types";
import { generateSnapshot, getCurrentPeriodEnd } from "./progress";
import { WORKSTREAM_TRACK_MAP, TRACK_ORDER } from "./bowler";

// ============================================================
// Types
// ============================================================

export type SectionKey =
  | "overallStatus"
  | "keyIssues"
  | "keyDelays"
  | "keyFindings"
  | "materialImpacts"
  | "materialDependencies"
  | "materialOperationalImpacts"
  | "keyDecisionsEscalations"
  | "financialImpacts"
  | "overallBudget";

export type DealSizeClass = "small" | "mid" | "large" | "mega";

export interface MaterialityProfile {
  sizeClass: DealSizeClass;
  complexityScore: number;
  complexityLabel: string;
  isCarveOut: boolean;
  isCrossBorder: boolean;
  hasTSA: boolean;
  riskConcentration: Array<{ category: string; count: number }>;
  toneGuidance: string;
}

export interface ReportContext {
  dealProfile: {
    dealName: string;
    structureLabel: string;
    modelLabel: string;
    closeDate: string;
    crossBorder: boolean;
    jurisdictions: string[];
    tsaRequired: string;
    sector: string;
    dealValue: string;
    targetEntities: number;
    targetGaap: string;
  };
  materiality: MaterialityProfile;
  snapshotStats: {
    totalActive: number;
    completed: number;
    blocked: number;
    pastDue: number;
    pctComplete: number;
  };
  workstreamBreakdown: Array<{
    name: string;
    effectiveRag: string;
    completed: number;
    inProgress: number;
    blocked: number;
    pastDue: number;
    total: number;
    pctComplete: number;
    narrative?: string;
  }>;
  blockedItems: Array<{
    itemId: string;
    description: string;
    workstream: string;
    blockedReason?: string;
  }>;
  overdueItems: Array<{
    itemId: string;
    description: string;
    workstream: string;
    milestoneDate: string;
  }>;
  riskRegister: Array<{
    category: string;
    severity: string;
    description: string;
    status: string;
  }>;
  teamRoster: Array<{ name: string; role?: string }>;
  ownerWorkload: Array<{
    ownerName: string;
    completed: number;
    inProgress: number;
    blocked: number;
    total: number;
  }>;
  existingNarratives: Record<string, string>;
  itemNotes: Array<{
    itemId: string;
    workstream: string;
    noteText: string;
  }>;
}

export interface ProspectiveInsight {
  type: "velocity" | "risk_trajectory" | "critical_path" | "synergy_risk" | "capacity";
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
}

export interface BainDimension {
  name: string;
  score: number; // 0-10
  evidence: string;
  recommendation?: string;
}

export interface HealthCheckResult {
  totalScore: number; // 0-100
  dimensions: BainDimension[];
}

export interface PlaybookAssessment {
  practice: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface PressureTestResult {
  completenessScore: number;
  consistencyIssues: Array<{ section: string; issue: string }>;
  coverageMap: Array<{ workstream: string; mentioned: boolean }>;
  toneAssessment: string;
  recommendations: string[];
  missingCriticalItems: Array<{ itemId: string; description: string; reason: string }>;
  prospectiveInsights: ProspectiveInsight[];
  mckinseyPlaybook: PlaybookAssessment[];
  bainHealthCheck: HealthCheckResult;
}

// ============================================================
// Section Labels
// ============================================================

export const SECTION_LABELS: Record<SectionKey, string> = {
  overallStatus: "Overall Integration Status",
  keyIssues: "Key Issues",
  keyDelays: "Key Delays",
  keyFindings: "Key Findings",
  materialImpacts: "Material Impacts",
  materialDependencies: "Material Dependencies",
  materialOperationalImpacts: "Material Operational Impacts",
  keyDecisionsEscalations: "Key Decisions & Escalations",
  financialImpacts: "Financial Impacts",
  overallBudget: "Overall Budget",
};

// ============================================================
// Helpers
// ============================================================

function parseDealValueToMillions(dealValueRange: string): number {
  const s = dealValueRange.trim();
  // Handle ">$5B" or ">$5b"
  if (/>\s*\$5[Bb]/i.test(s)) return 6000;
  // Handle "$1B–$5B" style ranges — take midpoint
  const rangeMatch = s.match(/\$?([\d.]+)\s*[Bb]?\s*[–\-]\s*\$?([\d.]+)\s*([MBmb]?)/i);
  if (rangeMatch) {
    const lo = parseFloat(rangeMatch[1]);
    const hi = parseFloat(rangeMatch[2]);
    const unit = rangeMatch[3].toUpperCase();
    const mid = (lo + hi) / 2;
    if (unit === "B") return mid * 1000;
    if (unit === "M") return mid;
    // Infer unit from magnitude
    return mid >= 1 ? mid * 1000 : mid;
  }
  // Handle "<$50M"
  const ltMatch = s.match(/<\s*\$?([\d.]+)\s*([MBmb]?)/i);
  if (ltMatch) {
    const val = parseFloat(ltMatch[1]);
    const unit = ltMatch[2].toUpperCase();
    return unit === "B" ? val * 1000 : val;
  }
  // Handle plain "$500M" or "$2B"
  const plainMatch = s.match(/\$?([\d.]+)\s*([MBmb])/i);
  if (plainMatch) {
    const val = parseFloat(plainMatch[1]);
    const unit = plainMatch[2].toUpperCase();
    return unit === "B" ? val * 1000 : val;
  }
  return 0;
}

function classifyDealSize(dealValueRange: string): DealSizeClass {
  const millions = parseDealValueToMillions(dealValueRange);
  if (millions >= 5000) return "mega";
  if (millions >= 2000) return "large";
  if (millions >= 500) return "mid";
  return "small";
}

function normalizeComplexity(raw: number): number {
  // Typical range: 1 (1 entity, 1 jurisdiction, domestic) up to ~200+
  // Clamp to 1-10
  if (raw <= 1) return 1;
  if (raw >= 100) return 10;
  return Math.round(1 + (raw - 1) / (100 - 1) * 9);
}

function complexityLabel(score: number): string {
  if (score >= 9) return "Very High";
  if (score >= 7) return "High";
  if (score >= 5) return "Moderate-High";
  if (score >= 3) return "Moderate";
  return "Low";
}

function structureLabel(dealStructure: string): string {
  const labels: Record<string, string> = {
    stock_purchase: "Stock Purchase",
    asset_purchase: "Asset Purchase",
    merger_forward: "Forward Merger",
    merger_reverse: "Reverse Merger",
    carve_out: "Carve-Out",
    f_reorg: "F-Reorganization",
  };
  return labels[dealStructure] ?? dealStructure;
}

function modelLabel(integrationModel: string): string {
  const labels: Record<string, string> = {
    fully_integrated: "Fully Integrated",
    hybrid: "Hybrid",
    standalone: "Standalone",
  };
  return labels[integrationModel] ?? integrationModel;
}

// ============================================================
// computeMateriality
// ============================================================

export function computeMateriality(intake: DealIntake): MaterialityProfile {
  const sizeClass = classifyDealSize(intake.dealValueRange);

  const rawComplexity =
    (intake.jurisdictions?.length ?? 1) *
    (intake.targetEntities ?? 1) *
    (intake.crossBorder ? 2 : 1);
  const complexityScore = normalizeComplexity(rawComplexity);

  const toneGuidanceMap: Record<DealSizeClass, string> = {
    mega: "board-formal",
    large: "executive-concise",
    mid: "balanced",
    small: "operational-direct",
  };

  return {
    sizeClass,
    complexityScore,
    complexityLabel: complexityLabel(complexityScore),
    isCarveOut: intake.dealStructure === "carve_out",
    isCrossBorder: intake.crossBorder,
    hasTSA: intake.tsaRequired === "yes" || intake.tsaRequired === "tbd",
    riskConcentration: [],   // populated downstream by assembleReportContext
    toneGuidance: toneGuidanceMap[sizeClass],
  };
}

// ============================================================
// assembleReportContext
// ============================================================

export function assembleReportContext(
  deal: GeneratedDeal,
  scNarrative: Record<string, string>
): ReportContext {
  const intake = deal.intake;

  // -- Deal profile
  const dealProfile: ReportContext["dealProfile"] = {
    dealName: intake.dealName,
    structureLabel: structureLabel(intake.dealStructure),
    modelLabel: modelLabel(intake.integrationModel),
    closeDate: intake.closeDate,
    crossBorder: intake.crossBorder,
    jurisdictions: intake.jurisdictions ?? [],
    tsaRequired: intake.tsaRequired,
    sector: intake.industrySector,
    dealValue: intake.dealValueRange,
    targetEntities: intake.targetEntities,
    targetGaap: intake.targetGaap,
  };

  // -- Materiality
  const materiality = computeMateriality(intake);

  // -- Latest snapshot (or freshly generated)
  const today = new Date().toISOString().split("T")[0];
  let snapshot =
    deal.progressSnapshots.length > 0
      ? deal.progressSnapshots[deal.progressSnapshots.length - 1]
      : generateSnapshot(deal, getCurrentPeriodEnd(), deal.ragOverrides);

  const { totalActive, completed, newlyBlocked: blocked, pastDue } = snapshot.summary;
  const pctComplete = totalActive > 0 ? Math.round((completed / totalActive) * 100) : 0;

  const snapshotStats: ReportContext["snapshotStats"] = {
    totalActive,
    completed,
    blocked,
    pastDue,
    pctComplete,
  };

  // -- Workstream breakdown
  const workstreamBreakdown: ReportContext["workstreamBreakdown"] = snapshot.workstreams.map((ws) => {
    const ragOverride = deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride;
    return {
      name: ws.workstream,
      effectiveRag: ragOverride ?? ws.ragStatus,
      completed: ws.completed,
      inProgress: ws.inProgress,
      blocked: ws.blocked,
      pastDue: ws.pastDue,
      total: ws.total,
      pctComplete: ws.pctComplete,
      narrative: ws.narrative,
    };
  });

  // Sort workstreams by TRACK_ORDER then alphabetically within track
  workstreamBreakdown.sort((a, b) => {
    const trackA = WORKSTREAM_TRACK_MAP[a.name] ?? "Other";
    const trackB = WORKSTREAM_TRACK_MAP[b.name] ?? "Other";
    const trackIdxA = TRACK_ORDER.indexOf(trackA);
    const trackIdxB = TRACK_ORDER.indexOf(trackB);
    if (trackIdxA !== trackIdxB) return trackIdxA - trackIdxB;
    return a.name.localeCompare(b.name);
  });

  // -- Blocked items
  const blockedItems: ReportContext["blockedItems"] = deal.checklistItems
    .filter((item) => item.status === "blocked")
    .map((item) => ({
      itemId: item.itemId,
      description: item.description,
      workstream: item.workstream,
      blockedReason: item.blockedReason,
    }));

  // -- Overdue items
  const overdueItems: ReportContext["overdueItems"] = deal.checklistItems
    .filter(
      (item) =>
        item.milestoneDate &&
        item.milestoneDate < today &&
        item.status !== "complete" &&
        item.status !== "na"
    )
    .map((item) => ({
      itemId: item.itemId,
      description: item.description,
      workstream: item.workstream,
      milestoneDate: item.milestoneDate!,
    }));

  // -- Risk register (open risks only)
  const riskRegister: ReportContext["riskRegister"] = deal.riskAlerts
    .filter((r) => r.status === "open" || r.status === "acknowledged")
    .map((r) => ({
      category: r.category,
      severity: r.severity,
      description: r.description,
      status: r.status,
    }));

  // -- Risk concentration for materiality
  const riskByCategory = new Map<string, number>();
  riskRegister.forEach((r) => {
    riskByCategory.set(r.category, (riskByCategory.get(r.category) ?? 0) + 1);
  });
  materiality.riskConcentration = Array.from(riskByCategory.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // -- Team roster
  const teamRoster: ReportContext["teamRoster"] = deal.people.map((p) => ({
    name: p.name,
    role: p.role,
  }));

  // -- Owner workload from snapshot
  const ownerWorkload: ReportContext["ownerWorkload"] = snapshot.owners.map((o) => ({
    ownerName: o.ownerName,
    completed: o.completed,
    inProgress: o.inProgress,
    blocked: o.blocked,
    total: o.total,
  }));

  // -- Existing narratives (from SteerCo narrative param + snapshot narratives)
  const existingNarratives: Record<string, string> = { ...scNarrative };
  snapshot.workstreams.forEach((ws) => {
    if (ws.narrative) {
      existingNarratives[ws.workstream] = existingNarratives[ws.workstream] ?? ws.narrative;
    }
  });

  // -- Item notes (first 50 items that have at least one note)
  const itemNotes: ReportContext["itemNotes"] = [];
  for (const item of deal.checklistItems) {
    if (itemNotes.length >= 50) break;
    if (item.notes && item.notes.length > 0) {
      const latestNote = item.notes[item.notes.length - 1];
      itemNotes.push({
        itemId: item.itemId,
        workstream: item.workstream,
        noteText: latestNote.text,
      });
    }
  }

  return {
    dealProfile,
    materiality,
    snapshotStats,
    workstreamBreakdown,
    blockedItems,
    overdueItems,
    riskRegister,
    teamRoster,
    ownerWorkload,
    existingNarratives,
    itemNotes,
  };
}

// ============================================================
// computeProspectiveGuidance
// ============================================================

export function computeProspectiveGuidance(deal: GeneratedDeal): ProspectiveInsight[] {
  const insights: ProspectiveInsight[] = [];
  const snapshots = deal.progressSnapshots;

  // -- Velocity analysis (requires 2+ snapshots)
  if (snapshots.length >= 2) {
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const periods = snapshots.length - 1;
    const completedDelta = last.summary.completed - first.summary.completed;
    const velocityPerPeriod = periods > 0 ? completedDelta / periods : 0;
    const remaining = last.summary.totalActive - last.summary.completed;

    if (velocityPerPeriod > 0) {
      const periodsToCompletion = remaining / velocityPerPeriod;
      // Estimate close date offset (assume weekly periods)
      const weeksToCompletion = periodsToCompletion;
      const severity: ProspectiveInsight["severity"] =
        weeksToCompletion > 52 ? "critical" : weeksToCompletion > 13 ? "warning" : "info";

      insights.push({
        type: "velocity",
        severity,
        title: "Completion Velocity Projection",
        detail:
          `At current pace of ${velocityPerPeriod.toFixed(1)} items/period, ` +
          `${remaining} remaining items project completion in ~${Math.round(weeksToCompletion)} weeks. ` +
          `${weeksToCompletion > 13 ? "Acceleration recommended to meet Day 90 / Year 1 targets." : "On track for Year 1 close-out."}`,
      });
    } else if (velocityPerPeriod === 0 && remaining > 0) {
      insights.push({
        type: "velocity",
        severity: "critical",
        title: "Zero Completion Velocity",
        detail: `No items have been completed across the last ${periods} reporting period(s). Immediate remediation required.`,
      });
    }

    // -- Blocked item trend
    const blockedTrend = snapshots.map((s) => s.summary.newlyBlocked);
    const recentBlocked = blockedTrend.slice(-3);
    const avgRecentBlocked =
      recentBlocked.reduce((a, b) => a + b, 0) / recentBlocked.length;
    const earlyBlocked = blockedTrend.slice(0, Math.max(1, blockedTrend.length - 3));
    const avgEarlyBlocked =
      earlyBlocked.reduce((a, b) => a + b, 0) / earlyBlocked.length;

    if (avgRecentBlocked > avgEarlyBlocked * 1.5 && avgRecentBlocked > 1) {
      insights.push({
        type: "risk_trajectory",
        severity: "warning",
        title: "Rising Blocked Item Trend",
        detail:
          `Blocked items have averaged ${avgRecentBlocked.toFixed(1)} in recent periods vs ` +
          `${avgEarlyBlocked.toFixed(1)} earlier — a ${Math.round(((avgRecentBlocked - avgEarlyBlocked) / Math.max(avgEarlyBlocked, 1)) * 100)}% increase. ` +
          `Review root causes to prevent cascade delays.`,
      });
    }
  }

  // -- Critical path: blocked items with most dependencies
  const blockedItems = deal.checklistItems.filter((i) => i.status === "blocked");
  if (blockedItems.length > 0) {
    // Count how many items depend on each blocked item
    const dependencyCounts = new Map<string, number>();
    deal.checklistItems.forEach((item) => {
      (item.dependencies ?? []).forEach((depId) => {
        dependencyCounts.set(depId, (dependencyCounts.get(depId) ?? 0) + 1);
      });
    });

    const criticalBlocked = blockedItems
      .map((item) => ({
        item,
        dependants: dependencyCounts.get(item.itemId) ?? 0,
      }))
      .filter((x) => x.dependants > 0)
      .sort((a, b) => b.dependants - a.dependants)
      .slice(0, 3);

    if (criticalBlocked.length > 0) {
      const topItem = criticalBlocked[0];
      insights.push({
        type: "critical_path",
        severity: topItem.dependants >= 5 ? "critical" : "warning",
        title: "Critical Path Blockage Detected",
        detail:
          `${criticalBlocked.length} blocked item(s) sit on the critical path. ` +
          `"${topItem.item.description}" (${topItem.item.itemId}) blocks ${topItem.dependants} downstream task(s). ` +
          `${topItem.item.blockedReason ? `Reason: ${topItem.item.blockedReason}.` : ""}`,
      });
    }
  }

  // -- Synergy risk: check for financial/TSA blocked items
  const synergyRisk = deal.checklistItems.filter(
    (i) =>
      i.status === "blocked" &&
      (i.workstream === "TSA" ||
        i.workstream === "FP&A" ||
        i.workstream === "Financial Reporting & Consolidation" ||
        i.riskIndicators?.includes("tax_structure_leakage") ||
        i.riskIndicators?.includes("stranded_costs"))
  );
  if (synergyRisk.length >= 2) {
    insights.push({
      type: "synergy_risk",
      severity: "warning",
      title: "Synergy Realisation at Risk",
      detail:
        `${synergyRisk.length} blocked item(s) in Finance / TSA workstreams may delay synergy capture. ` +
        `Expedite resolution to protect financial case.`,
    });
  }

  // -- Capacity: anyone with >60 items
  const snapshot =
    deal.progressSnapshots.length > 0
      ? deal.progressSnapshots[deal.progressSnapshots.length - 1]
      : generateSnapshot(deal, getCurrentPeriodEnd(), deal.ragOverrides);

  const overloaded = snapshot.owners.filter((o) => o.total > 60 && o.ownerName !== "Unassigned");
  overloaded.forEach((owner) => {
    insights.push({
      type: "capacity",
      severity: owner.total > 100 ? "critical" : "warning",
      title: `Team Capacity Risk — ${owner.ownerName}`,
      detail:
        `${owner.ownerName} is assigned ${owner.total} items ` +
        `(${owner.blocked} blocked, ${owner.inProgress} in progress). ` +
        `Consider redistributing workload to reduce delivery risk.`,
    });
  });

  return insights;
}

// ============================================================
// assessBainHealthCheck
// ============================================================

export function assessBainHealthCheck(context: ReportContext): HealthCheckResult {
  const narrativeValues = Object.values(context.existingNarratives).join(" ").toLowerCase();
  const dimensions: BainDimension[] = [];

  // 1. Vision & Strategy
  const overallNarrative = context.existingNarratives["overallStatus"] ?? "";
  const visionScore = overallNarrative.length > 300
    ? 9
    : overallNarrative.length > 200
    ? 7
    : overallNarrative.length > 100
    ? 5
    : overallNarrative.length > 0
    ? 3
    : 1;
  dimensions.push({
    name: "Vision & Strategy",
    score: visionScore,
    evidence:
      overallNarrative.length > 0
        ? `Overall status narrative present (${overallNarrative.length} chars).`
        : "No overall status narrative populated.",
    recommendation:
      visionScore < 6
        ? "Draft a clear integration vision statement articulating target end-state and strategic rationale."
        : undefined,
  });

  // 2. Operating Model
  const hasOpModel =
    /operating model|org(anization)? design|operating structure|governance model/i.test(
      narrativeValues
    );
  const opModelScore = hasOpModel ? 8 : 3;
  dimensions.push({
    name: "Operating Model",
    score: opModelScore,
    evidence: hasOpModel
      ? "Operating model references found in narratives."
      : "No operating model language detected in narratives.",
    recommendation: !hasOpModel
      ? "Articulate the target operating model and decision rights in the integration narrative."
      : undefined,
  });

  // 3. Org Design
  const workstreamCount = context.workstreamBreakdown.length;
  const teamSize = context.teamRoster.length;
  const orgRatio = workstreamCount > 0 ? teamSize / workstreamCount : 0;
  const orgScore = orgRatio >= 1.5 ? 9 : orgRatio >= 1 ? 7 : orgRatio >= 0.5 ? 5 : 2;
  dimensions.push({
    name: "Org Design",
    score: orgScore,
    evidence: `${teamSize} team member(s) covering ${workstreamCount} workstream(s) (ratio: ${orgRatio.toFixed(1)}).`,
    recommendation:
      orgScore < 6
        ? "Ensure sufficient staffing across all active workstreams to avoid single points of failure."
        : undefined,
  });

  // 4. Talent
  const hrWs = context.workstreamBreakdown.find((w) => w.name === "Human Resources");
  const talentScore = hrWs
    ? hrWs.pctComplete >= 70
      ? 9
      : hrWs.pctComplete >= 40
      ? 6
      : hrWs.effectiveRag === "red"
      ? 2
      : 4
    : 3;
  dimensions.push({
    name: "Talent",
    score: talentScore,
    evidence: hrWs
      ? `HR workstream is ${hrWs.pctComplete}% complete, RAG: ${hrWs.effectiveRag}.`
      : "HR workstream not found in active checklist.",
    recommendation:
      talentScore < 5
        ? "Accelerate HR integration tasks, especially retention, role mapping, and benefit harmonisation."
        : undefined,
  });

  // 5. Culture
  const commsWs = context.workstreamBreakdown.find((w) => w.name === "Communications");
  const cultureScore = commsWs
    ? commsWs.pctComplete >= 60
      ? 8
      : commsWs.effectiveRag === "red"
      ? 2
      : 5
    : 3;
  dimensions.push({
    name: "Culture",
    score: cultureScore,
    evidence: commsWs
      ? `Communications workstream is ${commsWs.pctComplete}% complete, RAG: ${commsWs.effectiveRag}.`
      : "Communications workstream not active — culture integration may be untracked.",
    recommendation:
      cultureScore < 5
        ? "Develop a formal culture integration and change management plan."
        : undefined,
  });

  // 6. Technology
  const itWs = context.workstreamBreakdown.filter(
    (w) => WORKSTREAM_TRACK_MAP[w.name] === "IT"
  );
  const itReds = itWs.filter((w) => w.effectiveRag === "red").length;
  const itAmbers = itWs.filter((w) => w.effectiveRag === "amber").length;
  const techScore =
    itWs.length === 0
      ? 5
      : itReds > 0
      ? Math.max(1, 4 - itReds)
      : itAmbers > 0
      ? 6
      : 9;
  dimensions.push({
    name: "Technology",
    score: techScore,
    evidence:
      itWs.length > 0
        ? `${itWs.length} IT workstream(s): ${itReds} red, ${itAmbers} amber, ${itWs.length - itReds - itAmbers} green.`
        : "No IT workstreams active.",
    recommendation:
      techScore < 6
        ? "Prioritise resolution of IT red-status workstreams to prevent Day 1 readiness risk."
        : undefined,
  });

  // 7. Synergy
  const financialNarrative =
    (context.existingNarratives["financialImpacts"] ?? "") +
    (context.existingNarratives["overallBudget"] ?? "");
  const hasSynergy = /synergy|savings|cost reduction|revenue enhancement/i.test(
    financialNarrative
  );
  const synergyScore = hasSynergy ? 8 : 3;
  dimensions.push({
    name: "Synergy",
    score: synergyScore,
    evidence: hasSynergy
      ? "Synergy/savings language found in financial narratives."
      : "No synergy tracking language in financial narratives.",
    recommendation: !hasSynergy
      ? "Quantify and track synergy realisation milestones explicitly in the financial impacts section."
      : undefined,
  });

  // 8. Customer
  const customerItems = context.workstreamBreakdown.filter(
    (w) =>
      /customer|client|commercial|sales/i.test(w.name) ||
      w.name === "IT > Client-Facing & Digital"
  );
  const customerInProgress = customerItems.reduce((a, b) => a + b.inProgress, 0);
  const customerScore = customerItems.length > 0
    ? customerInProgress > 0
      ? 7
      : 4
    : 5;
  dimensions.push({
    name: "Customer",
    score: customerScore,
    evidence:
      customerItems.length > 0
        ? `${customerItems.length} customer-related workstream(s) identified; ${customerInProgress} items in progress.`
        : "No explicit customer-facing workstreams identified.",
    recommendation:
      customerScore < 6
        ? "Ensure customer retention and experience continuity is tracked as an explicit integration workstream."
        : undefined,
  });

  // 9. Regulatory
  const regulatoryBlocked = context.blockedItems.filter((b) =>
    /regulat|compliance|legal|permit|licen/i.test(b.blockedReason ?? b.description)
  );
  const regulatoryRisks = context.riskRegister.filter(
    (r) => r.category === "regulatory_delay"
  );
  const regScore =
    regulatoryBlocked.length >= 3 || regulatoryRisks.length >= 3
      ? 2
      : regulatoryBlocked.length >= 1 || regulatoryRisks.length >= 1
      ? 5
      : 8;
  dimensions.push({
    name: "Regulatory",
    score: regScore,
    evidence:
      `${regulatoryBlocked.length} regulatory-blocked item(s); ` +
      `${regulatoryRisks.length} open regulatory risk(s).`,
    recommendation:
      regScore < 6
        ? "Engage external counsel and regulatory advisors to clear blocking compliance items."
        : undefined,
  });

  // 10. Communication
  const narrativesPopulated = Object.values(context.existingNarratives).filter(
    (v) => v && v.trim().length > 50
  ).length;
  const totalSections = Object.keys(SECTION_LABELS).length;
  const commsFill = narrativesPopulated / totalSections;
  const commsScore = commsWs
    ? commsWs.effectiveRag === "green" && commsFill >= 0.5
      ? 9
      : commsFill >= 0.3
      ? 6
      : 4
    : commsFill >= 0.3
    ? 5
    : 2;
  dimensions.push({
    name: "Communication",
    score: commsScore,
    evidence:
      `${narrativesPopulated}/${totalSections} report sections populated. ` +
      (commsWs
        ? `Communications workstream RAG: ${commsWs.effectiveRag}.`
        : "Communications workstream not active."),
    recommendation:
      commsScore < 6
        ? "Populate all report narrative sections and ensure a structured stakeholder communications cadence is in place."
        : undefined,
  });

  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) * 10 / dimensions.length
  );

  return { totalScore, dimensions };
}

// ============================================================
// assessMcKinseyPlaybook
// ============================================================

export function assessMcKinseyPlaybook(context: ReportContext): PlaybookAssessment[] {
  const narrativeValues = Object.values(context.existingNarratives).join(" ").toLowerCase();
  const allText = narrativeValues;

  const assessments: PlaybookAssessment[] = [];

  // 1. Operating Model Speed
  const hasOperatingModel = /operating model|org(anization)? design|day.1 ready|d-1 ready/i.test(allText);
  const hasBlockedCritical = context.blockedItems.filter(
    (b) => context.workstreamBreakdown.find((w) => w.name === b.workstream && w.effectiveRag === "red")
  ).length > 3;
  assessments.push({
    practice: "Operating Model Speed",
    status: hasOperatingModel && !hasBlockedCritical ? "pass" : hasOperatingModel ? "warn" : "fail",
    detail: hasOperatingModel
      ? hasBlockedCritical
        ? "Operating model documented but execution speed is hampered by multiple red-status workstreams."
        : "Operating model language present and execution appears on track."
      : "No evidence of operating model design or Day 1 readiness planning in narratives.",
  });

  // 2. Culture & Talent
  const hrWs = context.workstreamBreakdown.find((w) => w.name === "Human Resources");
  const commsWs = context.workstreamBreakdown.find((w) => w.name === "Communications");
  const hasCultureLanguage = /culture|talent|retent|engagement|change management/i.test(allText);
  const cultureStatus =
    hrWs?.effectiveRag !== "red" && commsWs?.effectiveRag !== "red" && hasCultureLanguage
      ? "pass"
      : hrWs?.effectiveRag === "red" || commsWs?.effectiveRag === "red"
      ? "fail"
      : "warn";
  assessments.push({
    practice: "Culture & Talent",
    status: cultureStatus,
    detail:
      `HR: ${hrWs ? `${hrWs.pctComplete}% complete, ${hrWs.effectiveRag}` : "not active"}. ` +
      `Comms: ${commsWs ? `${commsWs.pctComplete}% complete, ${commsWs.effectiveRag}` : "not active"}. ` +
      (hasCultureLanguage ? "Culture/talent language present in narratives." : "No culture/talent language detected."),
  });

  // 3. Leadership Speed
  const decisionNarrative = context.existingNarratives["keyDecisionsEscalations"] ?? "";
  const hasDecisions = decisionNarrative.trim().length > 80;
  const escalationItems = context.blockedItems.filter(
    (b) => /escalat|decision|approv|execut|board/i.test(b.blockedReason ?? b.description)
  );
  const leadershipStatus = hasDecisions && escalationItems.length <= 2
    ? "pass"
    : escalationItems.length > 5
    ? "fail"
    : "warn";
  assessments.push({
    practice: "Leadership Speed",
    status: leadershipStatus,
    detail:
      `${escalationItems.length} item(s) blocked pending leadership decisions. ` +
      (hasDecisions
        ? "Decisions & Escalations narrative is populated."
        : "Decisions & Escalations section is empty — unresolved decisions may be untracked."),
  });

  // 4. Synergy Discipline
  const financialNarrative =
    (context.existingNarratives["financialImpacts"] ?? "") +
    (context.existingNarratives["overallBudget"] ?? "");
  const hasSynergyTracking = /synergy|savings|cost reduction|revenue enhancement|\$[\d]/i.test(
    financialNarrative
  );
  const fpaTsaRed = context.workstreamBreakdown.filter(
    (w) =>
      (w.name === "FP&A" || w.name === "TSA" || w.name === "Financial Reporting & Consolidation") &&
      w.effectiveRag === "red"
  ).length;
  const synergyStatus = hasSynergyTracking && fpaTsaRed === 0 ? "pass" : fpaTsaRed > 0 ? "fail" : "warn";
  assessments.push({
    practice: "Synergy Discipline",
    status: synergyStatus,
    detail:
      (hasSynergyTracking
        ? "Synergy tracking language present in financial narratives."
        : "No quantified synergy targets found in financial narratives.") +
      (fpaTsaRed > 0 ? ` ${fpaTsaRed} Finance/TSA workstream(s) are red-status.` : ""),
  });

  // 5. AI Integration
  const hasAiLanguage = /ai |artificial intelligence|machine learning|automation|digital|analytics/i.test(
    allText
  );
  const itDataWs = context.workstreamBreakdown.find((w) => w.name === "IT > Data & Analytics");
  const aiStatus = hasAiLanguage && itDataWs && itDataWs.effectiveRag !== "red"
    ? "pass"
    : hasAiLanguage || (itDataWs && itDataWs.effectiveRag !== "red")
    ? "warn"
    : "fail";
  assessments.push({
    practice: "AI Integration",
    status: aiStatus,
    detail:
      (hasAiLanguage ? "AI/digital language present in integration narratives." : "No AI/digital transformation language detected.") +
      (itDataWs
        ? ` IT > Data & Analytics: ${itDataWs.pctComplete}% complete, ${itDataWs.effectiveRag}.`
        : " IT > Data & Analytics workstream not active."),
  });

  return assessments;
}

// ============================================================
// formatContextForPrompt
// ============================================================

export function formatContextForPrompt(context: ReportContext): string {
  const lines: string[] = [];

  // Deal profile summary
  const p = context.dealProfile;
  lines.push(
    `DEAL: ${p.dealName} | ${p.structureLabel} | ${p.modelLabel} | Close: ${p.closeDate}`,
    `PROFILE: ${p.sector} | ${p.dealValue} | Entities: ${p.targetEntities} | GAAP: ${p.targetGaap} | ` +
      `${p.crossBorder ? `Cross-border (${p.jurisdictions.join(", ")})` : "Domestic"} | TSA: ${p.tsaRequired}`,
    `TONE: ${context.materiality.toneGuidance} | Complexity: ${context.materiality.complexityLabel} (${context.materiality.complexityScore}/10) | Size: ${context.materiality.sizeClass}`,
    ""
  );

  // Stats summary
  const s = context.snapshotStats;
  lines.push(
    `PROGRAM STATS: ${s.totalActive} active items | ${s.completed} complete (${s.pctComplete}%) | ${s.blocked} blocked | ${s.pastDue} past-due`,
    ""
  );

  // Workstream table
  lines.push("WORKSTREAM STATUS (name | rag | %done | blocked | pastDue | total):");
  context.workstreamBreakdown.forEach((ws) => {
    lines.push(
      `  ${ws.name.padEnd(38)} | ${ws.effectiveRag.toUpperCase().padEnd(6)} | ${String(ws.pctComplete).padStart(3)}% | bl:${ws.blocked} | od:${ws.pastDue} | tot:${ws.total}`
    );
  });
  lines.push("");

  // Blocked items
  if (context.blockedItems.length > 0) {
    lines.push("BLOCKED ITEMS:");
    context.blockedItems.forEach((b) => {
      lines.push(
        `  [${b.itemId}] ${b.workstream}: ${b.description}` +
          (b.blockedReason ? ` — REASON: ${b.blockedReason}` : "")
      );
    });
    lines.push("");
  }

  // Overdue items (top 10)
  if (context.overdueItems.length > 0) {
    lines.push("OVERDUE ITEMS (top 10):");
    context.overdueItems.slice(0, 10).forEach((o) => {
      lines.push(`  [${o.itemId}] ${o.workstream}: ${o.description} — due ${o.milestoneDate}`);
    });
    if (context.overdueItems.length > 10) {
      lines.push(`  ...and ${context.overdueItems.length - 10} more`);
    }
    lines.push("");
  }

  // Open risks
  if (context.riskRegister.length > 0) {
    lines.push("OPEN RISKS:");
    context.riskRegister.forEach((r) => {
      lines.push(`  [${r.severity.toUpperCase()}] ${r.category}: ${r.description} (${r.status})`);
    });
    lines.push("");
  }

  // Existing narrative excerpts
  const narrativeEntries = Object.entries(context.existingNarratives).filter(
    ([, v]) => v && v.trim().length > 0
  );
  if (narrativeEntries.length > 0) {
    lines.push("EXISTING NARRATIVES (excerpts):");
    narrativeEntries.forEach(([key, val]) => {
      const label = SECTION_LABELS[key as SectionKey] ?? key;
      const excerpt = val.trim().slice(0, 150);
      lines.push(`  ${label}: ${excerpt}${val.trim().length > 150 ? "..." : ""}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

// ============================================================
// buildSectionPrompt
// ============================================================

export function buildSectionPrompt(section: SectionKey, context: ReportContext): string {
  const tone = context.materiality.toneGuidance;
  const dealName = context.dealProfile.dealName;
  const label = SECTION_LABELS[section];
  const baseContext = formatContextForPrompt(context);

  const toneInstructions: Record<string, string> = {
    "board-formal":
      "Write in formal board-level language. Use precise, measured sentences. Avoid informal expressions. Suitable for C-suite and board directors.",
    "executive-concise":
      "Write in crisp executive prose. Prioritise clarity and brevity. Each sentence should carry actionable insight.",
    balanced:
      "Write in clear, professional language. Balance detail with readability. Suitable for senior management and IMO leadership.",
    "operational-direct":
      "Write in direct, action-oriented language. Be specific and practical. Suitable for working teams and functional leads.",
  };

  const toneInstruction = toneInstructions[tone] ?? toneInstructions["balanced"];

  // Section-specific data and instructions
  let sectionSpecific = "";

  switch (section) {
    case "overallStatus":
      sectionSpecific = `
SECTION FOCUS: The opening paragraph the Board reads first. Must establish overall health, velocity, and the 2-3 things that matter most this period.
DATA TO DRAW ON:
- Program stats: ${context.snapshotStats.pctComplete}% complete (${context.snapshotStats.completed} of ${context.snapshotStats.totalActive} items), ${context.snapshotStats.blocked} blocked, ${context.snapshotStats.pastDue} past-due
- Workstream RAG distribution: ${context.workstreamBreakdown.filter((w) => w.effectiveRag === "red").length} red, ${context.workstreamBreakdown.filter((w) => w.effectiveRag === "amber").length} amber, ${context.workstreamBreakdown.filter((w) => w.effectiveRag === "green").length} green
- Deal characteristics: ${context.dealProfile.structureLabel}, ${context.dealProfile.modelLabel}, ${context.dealProfile.crossBorder ? `cross-border (${context.dealProfile.jurisdictions.join(", ")})` : "domestic"}
- Critical risks: ${context.riskRegister.filter((r) => r.severity === "critical").length} critical, ${context.riskRegister.filter((r) => r.severity === "high").length} high
- Team: ${context.teamRoster.length} assigned members
FORMATTING: Write 2-3 paragraphs (NOT numbered items for this section only):
Paragraph 1: One-sentence verdict with RAG rating, completion %, and headline theme (e.g., "The integration is rated AMBER at ${context.snapshotStats.pctComplete}% completion, driven by [2-3 key factors]").
Paragraph 2: Key progress highlights and what's working well. Be specific — name workstreams and owners.
Paragraph 3: Forward outlook — what to watch in the next period, upcoming milestones, and trajectory assessment.`;
      break;

    case "keyIssues":
      sectionSpecific = `
SECTION FOCUS: Surface the 3-5 most critical issues that could derail the integration or require SteerCo intervention.
DATA TO DRAW ON:
BLOCKED ITEMS (${context.blockedItems.length} total):
${context.blockedItems.slice(0, 10).map((b) => `- [${b.itemId}] ${b.workstream}: ${b.description}${b.blockedReason ? ` — BLOCKED: ${b.blockedReason}` : ""}`).join("\n")}
RED WORKSTREAMS:
${context.workstreamBreakdown.filter((w) => w.effectiveRag === "red").map((w) => `- ${w.name}: ${w.blocked} blocked, ${w.pastDue} past-due, ${w.pctComplete}% complete`).join("\n")}
AMBER WORKSTREAMS:
${context.workstreamBreakdown.filter((w) => w.effectiveRag === "amber").map((w) => `- ${w.name}: ${w.blocked} blocked, ${w.pctComplete}% complete`).join("\n")}
CRITICAL RISKS:
${context.riskRegister.filter((r) => r.severity === "critical" || r.severity === "high").map((r) => `- ${r.category} (${r.severity}): ${r.description}`).join("\n")}
FORMATTING: Each issue MUST include: (1) What is the issue (specific, quantified), (2) Why it matters (downstream impact, dollar exposure), (3) What needs to happen (action, owner, deadline).
Example format:
"1. ERP vendor license transfer delay — compresses parallel-run window by 3 weeks
   The legacy license transfer from [vendor] requires counterparty signature that has been pending since [date]. Without resolution, the Day 90 ERP cutover date is at risk, affecting [N] downstream items across IT and Finance workstreams.
   → Recommended: Approve interim cloud bridge workaround ($380K) to protect the cutover date. Decision owner: CIO. Deadline: [date]."
CRITICAL RULES:
- Each issue MUST be on its own — never combine two issues into one item
- Each issue MUST have a prescriptive resolution (what to do, who, by when)
- If a blocked item lacks context on WHY it's blocked, state "Root cause: to be determined by [owner] — escalation recommended"
- Only include items that are material to the board. A simple scope change is NOT board-level. Filter ruthlessly.
- If an item doesn't have enough data to explain WHY, flag it: "⚠ Insufficient detail — IMO to investigate and report back by [date]"
PRODUCE 3-6 items following this exact pattern.`;
      break;

    case "keyDelays":
      sectionSpecific = `
SECTION FOCUS: Each delay is a SEPARATE numbered item with root cause, schedule impact, and recovery plan. Format like a risk register — NOT prose paragraphs.
DATA TO DRAW ON:
OVERDUE ITEMS (${context.overdueItems.length} total):
${context.overdueItems.slice(0, 8).map((o) => `- [${o.itemId}] ${o.workstream}: ${o.description} (due ${o.milestoneDate})`).join("\n")}
BLOCKED ITEMS CAUSING DELAY:
${context.blockedItems.slice(0, 8).map((b) => `- [${b.itemId}] ${b.workstream}: ${b.description} — ${b.blockedReason || "reason not specified"}`).join("\n")}
AMBER/RED WORKSTREAMS: ${context.workstreamBreakdown.filter((w) => w.effectiveRag !== "green").map((w) => `${w.name} (${w.effectiveRag}, ${w.pctComplete}%)`).join(", ")}
FORMATTING: Each delay as a separate card:
"1. [Delay headline] — [X weeks/days impact]
   ROOT CAUSE: [Specific explanation]
   SCHEDULE IMPACT: [What milestones are affected, quantify the slip]
   RECOVERY PLAN: [Action, owner, revised target date]
   STATUS: [Red/Amber — is recovery on track?]"
DO NOT combine multiple delays into one paragraph. Each delay gets its own numbered item with full context.`;
      break;

    case "keyFindings":
      sectionSpecific = `
SECTION FOCUS: Material discoveries that change the integration picture. Each finding should be something the board didn't know before. Separate positive findings from concerns.
DATA TO DRAW ON:
- Item notes (intelligence from the field): ${context.itemNotes.slice(0, 12).map((n) => `[${n.itemId}] ${n.workstream}: ${n.noteText.slice(0, 120)}`).join("; ")}
- Completed items revealing new information
- Risk register discoveries: ${context.riskRegister.filter((r) => r.status === "open").map((r) => `${r.category}: ${r.description.slice(0, 80)}`).join("; ")}
FORMATTING: Separate into two groups:
"POSITIVE FINDINGS:"
"1. [Finding headline]
   [What was discovered, quantified impact, implication for integration plan]"

"CONCERNS / SURPRISES:"
"1. [Finding headline]
   [What was discovered, why it matters, what action is needed]"

Each finding MUST explain the SO WHAT — why does the board care about this specific finding? What changes as a result?`;
      break;

    case "materialImpacts":
      sectionSpecific = `
SECTION FOCUS: Describe the most significant impacts of the integration on the combined business.
DATA TO DRAW ON:
- Open risks: ${context.riskRegister.map((r) => `${r.category} (${r.severity})`).join(", ")}
- Blocked items by workstream
- Carve-out: ${context.materiality.isCarveOut}, Cross-border: ${context.materiality.isCrossBorder}, TSA: ${context.materiality.hasTSA}
INCLUDE: Operational, financial, and organisational impacts; quantify where possible.`;
      break;

    case "materialDependencies":
      sectionSpecific = `
SECTION FOCUS: Map the critical interdependencies as GATE relationships. Each dependency must follow the pattern: "[Source] GATES [Target] — [Impact if unresolved]".
DATA TO DRAW ON:
- TSA required: ${context.dealProfile.tsaRequired}
- Cross-border jurisdictions: ${context.dealProfile.jurisdictions.join(", ")}
- Blocked items (potential gates): ${context.blockedItems.slice(0, 8).map((b) => `[${b.itemId}] ${b.workstream}: ${b.description} — ${b.blockedReason || "reason not specified"}`).join("; ")}
- Red/amber workstreams: ${context.workstreamBreakdown.filter((w) => w.effectiveRag !== "green").map((w) => `${w.name} (${w.effectiveRag})`).join(", ")}
- Risk-linked dependencies: ${context.riskRegister.filter((r) => /depend|gate|block|prerequisite/i.test(r.description)).map((r) => r.description.slice(0, 100)).join("; ")}
FORMATTING: Each dependency MUST be structured as:
"1. [Regulatory/System/Resource] gates [Downstream item/workstream] — [quantified impact]
   [Context: What is the dependency, why it exists, current status]. [Downstream cascade: How many items/workstreams are affected if unresolved]. [Timeline: When must this be resolved to avoid delay, and what is the fallback plan].
   → Resolution owner: [Name/Role]. Target date: [Date]. Escalation trigger: [Condition]."
PRODUCE 4-6 dependency items. Prioritize those with the widest downstream impact. Use specific item IDs and workstream names from the data.`;
      break;

    case "materialOperationalImpacts":
      sectionSpecific = `
SECTION FOCUS: Describe operational disruption risks and Day 1 readiness.
DATA TO DRAW ON:
- IT workstream RAG: ${context.workstreamBreakdown.filter((w) => WORKSTREAM_TRACK_MAP[w.name] === "IT").map((w) => `${w.name}:${w.effectiveRag}`).join(", ")}
- Facilities workstream: ${context.workstreamBreakdown.find((w) => w.name === "Facilities") ? JSON.stringify(context.workstreamBreakdown.find((w) => w.name === "Facilities")) : "not active"}
- Operational Finance RAG: ${context.workstreamBreakdown.find((w) => w.name === "Operational Finance")?.effectiveRag ?? "N/A"}
INCLUDE: Systems continuity, facilities, workforce readiness, and customer-facing operations.`;
      break;

    case "keyDecisionsEscalations":
      sectionSpecific = `
SECTION FOCUS: Decisions that ONLY the SteerCo can make. Each decision must be a clear yes/no or choose-A-vs-B ask.
DATA TO DRAW ON:
- Blocked items requiring executive decisions: ${context.blockedItems.filter((b) => /decision|escalat|approv|authoriz/i.test((b.blockedReason ?? "") + b.description)).map((b) => `[${b.itemId}] ${b.workstream}: ${b.description} — ${b.blockedReason || ""}`).join("; ")}
- Critical/high risks requiring executive action: ${context.riskRegister.filter((r) => r.severity === "critical" || r.severity === "high").map((r) => `${r.category}: ${r.description}`).join("; ")}
- Red workstreams needing intervention: ${context.workstreamBreakdown.filter((w) => w.effectiveRag === "red").map((w) => `${w.name}: ${w.blocked} blocked, ${w.pctComplete}% complete`).join("; ")}
- Team workload imbalances: ${context.ownerWorkload.filter((o) => o.blocked > 0).map((o) => `${o.ownerName}: ${o.blocked} blocked of ${o.total}`).join("; ")}
FORMATTING: Each decision MUST follow this exact pattern:
"D-[N] · [Clear decision statement] — [$ impact or timeline impact]
   CONTEXT: [Why this decision is needed now. What happened. What's at stake.]
   CONSEQUENCE OF INACTION: [What happens if SteerCo does NOT decide by the deadline.]
   RECOMMENDED ACTION: [Specific recommendation with rationale.]
   OWNER: [Decision maker]. DEADLINE: [Date]."
Example:
"D-1 · Approve IT interim cloud bridge — $380K one-time cost
   CONTEXT: The ERP vendor license transfer requires counterparty approval that has been delayed 3 weeks. Without a workaround, the Day 90 ERP go-live date slips to Q2, affecting 12 downstream Finance items.
   CONSEQUENCE OF INACTION: ERP cutover delay cascades into Year 1 consolidation timeline. Estimated additional cost of $1.2M for extended parallel operations.
   RECOMMENDED ACTION: Approve the $380K cloud bridge to decouple from vendor timeline. ROI is positive even in worst case.
   OWNER: PE Sponsor + CIO. DEADLINE: This week."
CRITICAL: Each decision MUST include BOTH a PREFERRED recommendation AND a SECONDARY alternative:
"PREFERRED: [Primary recommendation with rationale]"
"ALTERNATIVE: [Secondary option if preferred is rejected, with trade-offs]"
This gives the board options rather than a binary yes/no.
PRODUCE 2-5 decision items. Only include items that genuinely require SteerCo authority — do not include operational decisions the IMO can make.`;
      break;

    case "financialImpacts":
      sectionSpecific = `
SECTION FOCUS: Board-level financial impact quantification. Every item must have a dollar amount or say "to be quantified."
DATA TO DRAW ON:
- Financial risks: ${context.riskRegister.filter((r) => ["tax_structure_leakage", "stranded_costs", "financial_reporting_gap", "tsa_dependency"].includes(r.category)).map((r) => `${r.category} (${r.severity}): ${r.description}`).join("; ")}
- FP&A workstream: ${context.workstreamBreakdown.find((w) => w.name === "FP&A") ? `${context.workstreamBreakdown.find((w) => w.name === "FP&A")?.pctComplete}% complete, RAG: ${context.workstreamBreakdown.find((w) => w.name === "FP&A")?.effectiveRag}` : "not active"}
- Treasury workstream: ${context.workstreamBreakdown.find((w) => w.name === "Treasury") ? `${context.workstreamBreakdown.find((w) => w.name === "Treasury")?.pctComplete}% complete` : "not active"}
- Tax workstream: ${context.workstreamBreakdown.find((w) => w.name === "Income Tax") ? `${context.workstreamBreakdown.find((w) => w.name === "Income Tax")?.pctComplete}% complete` : "not active"}
- Deal value: ${context.dealProfile.dealValue}, Deal size class: ${context.materiality.sizeClass}
- Budget-related notes: ${context.itemNotes.filter((n) => /budget|cost|spend|forecast|\$/i.test(n.noteText)).slice(0, 5).map((n) => `[${n.itemId}] ${n.noteText.slice(0, 100)}`).join("; ")}
STRUCTURE YOUR RESPONSE IN THREE DISTINCT SECTIONS (not bundled together):

SECTION A — BUDGET STATUS (3-5 sentences):
State the overall budget envelope, spend-to-date, burn rate, and forecast. Is spend pacing ahead of or behind progress? Example: "Budget: $18.5M approved. Spent: $4.2M (23%). Program completion: 19%. Burn rate is running 4 points ahead of progress, suggesting scope creep or front-loaded costs. Forecast to complete: $21.8M (+$3.3M / +18% overrun)."

SECTION B — VARIANCE DECOMPOSITION (numbered items):
Each variance driver as a separate numbered item:
"1. [Category] — [$ amount]
   [Root cause]. [Current status]. [Action to contain].
   Impact: [Favorable/Unfavorable]. Confidence: [High/Medium/Low]."

SECTION C — FORWARD OUTLOOK (2-3 sentences):
Are we on track financially? What's the projected total cost? Where are the remaining financial risks? What would change the forecast?

DO NOT bundle budget and financial impacts into one paragraph. Separate them clearly. Include burn rate vs. progress pacing analysis.`;
      break;

    case "overallBudget":
      sectionSpecific = `
SECTION FOCUS: Forward-looking summary that ties budget to timeline and milestones. This section should NOT repeat the financial details from financialImpacts — instead focus on: Are we pacing correctly? What milestones are approaching? What is the trajectory?
DATA TO DRAW ON:
- Program completion: ${context.snapshotStats.pctComplete}% (${context.snapshotStats.completed} of ${context.snapshotStats.totalActive})
- Deal size class: ${context.materiality.sizeClass} (${context.dealProfile.dealValue})
- Close date: ${context.dealProfile.closeDate}
- Workstreams in progress: ${context.workstreamBreakdown.filter((w) => w.inProgress > 0).length} of ${context.workstreamBreakdown.length}
- Upcoming milestones that need attention
FORMATTING: Write 2 paragraphs:
Paragraph 1: Overall pacing assessment — are we on track to hit Day 30/60/90/Year 1 gates? What's the projected completion trajectory?
Paragraph 2: Next reporting period focus areas — what workstreams need acceleration? What decisions are approaching?
DO NOT repeat budget numbers if already covered in financialImpacts. Focus on trajectory and forward-looking guidance.`;
      break;
  }

  return `You are a senior M&A integration advisor (McKinsey/Bain caliber) preparing a Board-level SteerCo report for "${dealName}".

TONE GUIDANCE: ${toneInstruction}

DEAL CONTEXT:
${baseContext}
${sectionSpecific}

TASK: Write the "${label}" section of the integration SteerCo report.

CRITICAL FORMATTING REQUIREMENTS — FOLLOW EXACTLY:

1. STRUCTURE: Use numbered items (1., 2., 3.) — NOT prose paragraphs, NOT bullet points.
   Each numbered item MUST have three parts:
   a) HEADLINE (bold-worthy): A specific, quantified action-title statement (e.g., "MAS regulatory approval extends timeline by 6 weeks")
   b) CONTEXT: 2-3 sentences explaining the situation, root cause, and current state. Include specific numbers, dates, owners, and dollar amounts from the data.
   c) RESOLUTION/NEXT STEP: 1-2 sentences stating the recommended action, owner, deadline, and consequence of inaction.

2. EACH ITEM MUST BE SELF-CONTAINED — a board member reading just one item gets the full picture.

3. SPECIFICITY IS MANDATORY:
   - Name workstreams, item IDs, team members, dates
   - Quantify everything: "$X impact", "N items affected", "M weeks delay"
   - Reference real blocked reasons and risk descriptions from the data
   - Use "gates" language for dependencies: "X gates Y; if unresolved by [date], Z is at risk"

4. DO NOT:
   - Write vague statements like "several issues" or "progress has been made"
   - Combine multiple topics into a single paragraph
   - List items without context or recommended action
   - Invent dollar amounts or dates not in the data — say "to be quantified" if unknown

5. LENGTH: 3-6 numbered items per section. Each item is 3-5 sentences total.

6. DECISION ITEMS (for keyDecisionsEscalations): Format as:
   "D-[N] · [Decision statement] — [$ impact if known]"
   Then: context + deadline + consequence of inaction + recommended action + owner

7. DEPENDENCY ITEMS (for materialDependencies): Format as:
   "[Source] gates [Target] — [Impact statement]"
   Then: explain the linkage, downstream cascade, and mitigation timeline

SELF-EVALUATION (apply before finalizing):
After drafting, review your output through the lens of a skeptical board member:
- Would they ask "so what?" after any item? If yes, add the implication.
- Would they ask "what are we doing about it?" If yes, add the resolution.
- Would they say "this is too vague"? If yes, add specific numbers, dates, owners.
- Are there zero-value metrics shown? Remove them — they add no insight.
- Are two topics bundled into one item? Separate them.
- Is there a forward-looking statement? Every section needs one.
- Would a PE sponsor reading this know exactly what decisions to make? If not, sharpen.

Write the ${label} section now:`;
}
