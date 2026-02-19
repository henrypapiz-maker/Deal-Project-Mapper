import type {
  DealIntake,
  ChecklistItem,
  RiskAlert,
  GeneratedDeal,
  WorkstreamSummary,
  Milestone,
  Phase,
  Priority,
  Workstream,
  RiskCategory,
  RiskSeverity,
} from "./types";
import {
  MASTER_CHECKLIST,
  filterByDealContext,
  WORKSTREAM_PHASES,
} from "./checklist-master";

// ============================================================
// Simple ID generator (no external uuid dep required)
// ============================================================
function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ============================================================
// Phase → days offset from close date
// ============================================================
const PHASE_OFFSETS: Record<Phase, number> = {
  pre_close: -7,
  day_1: 0,
  day_30: 30,
  day_60: 60,
  day_90: 90,
  year_1: 365,
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ============================================================
// Risk Detection Rules (from Training Model Framework §6)
// ============================================================
interface RiskRule {
  category: RiskCategory;
  severity: RiskSeverity;
  check: (intake: DealIntake) => boolean;
  descriptionFn: (intake: DealIntake) => string;
  mitigationFn: () => string;
  affectedWorkstreams: Workstream[];
}

const RISK_RULES: RiskRule[] = [
  {
    category: "regulatory_delay",
    severity: "critical",
    check: (i) => i.crossBorder && i.jurisdictions.length >= 3,
    descriptionFn: (i) =>
      `${i.jurisdictions.length} jurisdictions require regulatory filing/clearance. Multiple concurrent processes (CFIUS, EUMR, NSI Act) increase close-date risk and Day 1 complexity.`,
    mitigationFn: () =>
      "Engage external regulatory counsel immediately. Build a jurisdiction-by-jurisdiction clearance tracker. Extend Day 1 planning buffer by 30 days per additional jurisdiction beyond 2.",
    affectedWorkstreams: ["Income Tax & Compliance", "Integration Budget & PMO"],
  },
  {
    category: "tax_structure_leakage",
    severity: "high",
    check: (i) =>
      i.crossBorder &&
      (i.jurisdictions.some((j) =>
        ["EU-IE", "EU-NL", "EU-LU", "SG", "CH"].includes(j)
      ) ||
        i.dealValueRange === ">$5B" ||
        i.dealValueRange === "$1B–$5B"),
    descriptionFn: (i) =>
      `Deal involves jurisdictions with potential sub-15% effective tax rates or significant value ($${i.dealValueRange}). Pillar Two top-up tax analysis required; GILTI/BEAT exposure not yet modelled.`,
    mitigationFn: () =>
      "Commission Pillar Two ETR analysis by jurisdiction. Model GILTI and BEAT exposure. Evaluate §338(g) election implications for foreign target entities.",
    affectedWorkstreams: ["Income Tax & Compliance"],
  },
  {
    category: "tsa_dependency",
    severity: "high",
    check: (i) => i.tsaRequired === "yes",
    descriptionFn: (i) =>
      `TSA required${i.dealStructure === "carve_out" ? " (Carve-Out — high TSA complexity)" : ""}. No standalone capability assessment complete. Prolonged TSA dependency increases stranded cost risk and integration timeline.`,
    mitigationFn: () =>
      "Complete standalone capability assessment within Day 30. Define exit criteria for each TSA service. Assign TSA exit owners per service category. Budget for TSA premium pricing (typically cost-plus 15–25%).",
    affectedWorkstreams: ["TSA Assessment & Exit"],
  },
  {
    category: "data_privacy_breach",
    severity: "high",
    check: (i) =>
      i.crossBorder &&
      i.jurisdictions.some((j) => j.startsWith("EU") || j === "UK"),
    descriptionFn: (i) =>
      `Target processes personal data in ${i.jurisdictions.filter((j) => j.startsWith("EU") || j === "UK").join(", ")}. GDPR/UK GDPR applies. DPIA not yet initiated; AI systems may be in scope under EU AI Act.`,
    mitigationFn: () =>
      "Appoint or confirm DPO coverage. Initiate DPIA immediately for all personal data processing activities. Update privacy notices. Review AI system inventory against EU AI Act risk tiers.",
    affectedWorkstreams: ["Cybersecurity & Data Privacy"],
  },
  {
    category: "cultural_integration",
    severity: "medium",
    check: (i) =>
      i.crossBorder &&
      i.jurisdictions.filter((j) => !j.startsWith("US")).length >= 2,
    descriptionFn: () =>
      "Significant cross-border workforce spans multiple cultures and employment law frameworks. Cultural integration and retention risk elevated.",
    mitigationFn: () =>
      "Commission early cultural assessment. Engage local HR/employment counsel per jurisdiction. Design retention incentives for key personnel. Include cultural integration in Day 90 SteerCo review.",
    affectedWorkstreams: ["HR & Workforce Integration", "Integration Budget & PMO"],
  },
  {
    category: "financial_reporting_gap",
    severity: "high",
    check: (i) =>
      (i.targetGaap !== "" && i.targetGaap !== "US GAAP") ||
      (i.targetEntities > 5 && i.crossBorder),
    descriptionFn: (i) =>
      `Target uses ${i.targetGaap || "non-US"} accounting standards. ${i.targetEntities} legal entities require consolidation. Significant conversion effort needed for first combined close.`,
    mitigationFn: () =>
      "Engage technical accounting team for GAAP conversion workplan. Allocate budget for external auditor readiness review. Map all policy differences before first consolidated close (Day 30 deadline).",
    affectedWorkstreams: ["Consolidation & Reporting"],
  },
  {
    category: "stranded_costs",
    severity: "medium",
    check: (i) => i.dealStructure === "carve_out",
    descriptionFn: () =>
      "Carve-out structure creates high stranded cost exposure. Shared services, facilities, and corporate overhead allocated to the carved entity must be replaced or renegotiated.",
    mitigationFn: () =>
      "Complete stranded cost mapping within Day 60. Build standalone cost model per function. Evaluate insourcing vs. outsourcing for each stranded function. Include run-rate standalone cost in synergy baseline.",
    affectedWorkstreams: [
      "TSA Assessment & Exit",
      "Facilities & Real Estate",
      "Integration Budget & PMO",
    ],
  },
];

// ============================================================
// Priority overlay: certain deal structures elevate priorities
// ============================================================
function adjustPriority(
  basePriority: Priority,
  itemId: string,
  intake: DealIntake
): Priority {
  // Carve-out: elevate TSA items to critical
  if (
    intake.dealStructure === "carve_out" &&
    itemId.startsWith("FRC-00") &&
    parseInt(itemId.replace("FRC-0", "")) <= 70
  ) {
    return "critical";
  }
  // Standalone model: deprioritize full integration items
  if (intake.integrationModel === "standalone" && basePriority === "critical") {
    return "high";
  }
  return basePriority;
}

// ============================================================
// Core Decision Tree: DealIntake → GeneratedDeal
// ============================================================
export function generateDeal(intake: DealIntake): GeneratedDeal {
  const naItemIds = new Set(filterByDealContext(intake));

  // 1. Instantiate checklist items from master
  const checklistItems: ChecklistItem[] = MASTER_CHECKLIST.map((master) => {
    const isNa = naItemIds.has(master.itemId);
    const adjustedPriority = adjustPriority(master.priority, master.itemId, intake);

    return {
      id: generateId(),
      itemId: master.itemId,
      workstream: master.workstream,
      section: master.section,
      description: master.description,
      phase: master.phase,
      milestoneDate: intake.closeDate
        ? addDays(intake.closeDate, PHASE_OFFSETS[master.phase])
        : undefined,
      priority: adjustedPriority,
      status: isNa ? "na" : "not_started",
      dependencies: master.dependencies,
      tsaRelevant: master.tsaRelevant,
      crossBorderFlag: master.crossBorderFlag,
      riskIndicators: master.riskIndicators,
      naJustification: isNa
        ? master.tsaRelevant
          ? "TSA not required for this deal"
          : "Cross-border items not applicable — domestic deal"
        : undefined,
      notes: [],
    };
  });

  // 2. Run risk detection rules
  const riskAlerts: RiskAlert[] = RISK_RULES.filter((rule) =>
    rule.check(intake)
  ).map((rule) => ({
    id: generateId(),
    category: rule.category,
    severity: rule.severity,
    description: rule.descriptionFn(intake),
    mitigation: rule.mitigationFn(),
    affectedWorkstreams: rule.affectedWorkstreams,
    status: "open" as const,
  }));

  // 3. Build workstream summary
  const wsMap = new Map<string, { total: number; active: number; priorities: Priority[] }>();
  checklistItems.forEach((item) => {
    const existing = wsMap.get(item.workstream) || { total: 0, active: 0, priorities: [] };
    existing.total++;
    if (item.status !== "na") {
      existing.active++;
      existing.priorities.push(item.priority);
    }
    wsMap.set(item.workstream, existing);
  });

  const workstreamSummary: WorkstreamSummary[] = Array.from(wsMap.entries()).map(
    ([name, stats]) => {
      const hasCritical = stats.priorities.includes("critical");
      const hasHigh = stats.priorities.includes("high");
      return {
        name: name as Workstream,
        totalItems: stats.total,
        activeItems: stats.active,
        phase: WORKSTREAM_PHASES[name] || "Day 1",
        priority: hasCritical ? "critical" : hasHigh ? "high" : "medium",
      };
    }
  );

  // 4. Build milestones from closeDate
  const milestones: Milestone[] = intake.closeDate
    ? [
        { phase: "day_1", label: "Day 1 / Close", date: addDays(intake.closeDate, 0), daysFromClose: 0 },
        { phase: "day_30", label: "Day 30 Checkpoint", date: addDays(intake.closeDate, 30), daysFromClose: 30 },
        { phase: "day_60", label: "Day 60 Review", date: addDays(intake.closeDate, 60), daysFromClose: 60 },
        { phase: "day_90", label: "Day 90 SteerCo", date: addDays(intake.closeDate, 90), daysFromClose: 90 },
        { phase: "year_1", label: "Year 1 Close-Out", date: addDays(intake.closeDate, 365), daysFromClose: 365 },
      ]
    : [];

  return {
    intake,
    checklistItems,
    riskAlerts,
    workstreamSummary,
    milestones,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// Summarize checklist counts for dashboard KPIs
// ============================================================
export function getKpis(items: ChecklistItem[]) {
  const active = items.filter((i) => i.status !== "na");
  return {
    total: active.length,
    complete: active.filter((i) => i.status === "complete").length,
    inProgress: active.filter((i) => i.status === "in_progress").length,
    blocked: active.filter((i) => i.status === "blocked").length,
    notStarted: active.filter((i) => i.status === "not_started").length,
    pctComplete: active.length
      ? Math.round(
          (active.filter((i) => i.status === "complete").length / active.length) * 100
        )
      : 0,
  };
}

export function getWorkstreamStats(items: ChecklistItem[]) {
  const map = new Map<
    string,
    { complete: number; inProgress: number; blocked: number; notStarted: number; total: number }
  >();

  items.forEach((item) => {
    if (item.status === "na") return;
    const ws = item.workstream;
    const s = map.get(ws) || { complete: 0, inProgress: 0, blocked: 0, notStarted: 0, total: 0 };
    s.total++;
    if (item.status === "complete") s.complete++;
    else if (item.status === "in_progress") s.inProgress++;
    else if (item.status === "blocked") s.blocked++;
    else s.notStarted++;
    map.set(ws, s);
  });

  return map;
}
