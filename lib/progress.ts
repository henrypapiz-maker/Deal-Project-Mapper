import type { GeneratedDeal, ProgressSnapshot, WorkstreamSnapshot, OwnerSnapshot, ChecklistItem } from "./types";

function computeRAG(stats: { blocked: number; total: number; completed: number; pastDue: number }): "red" | "amber" | "green" {
  if (stats.total === 0) return "green";
  const blockedPct = stats.blocked / stats.total;
  const pastDuePct = stats.pastDue / stats.total;
  if (blockedPct > 0.1 || pastDuePct > 0.2) return "red";
  if (stats.blocked > 0 || stats.pastDue > 0) return "amber";
  const completePct = stats.completed / stats.total;
  if (completePct >= 0.7) return "green";
  if (completePct >= 0.3) return "amber";
  return "red";
}

export function generateSnapshot(deal: GeneratedDeal, periodEnd: string, ragOverrides?: Record<string, "red" | "amber" | "green">): ProgressSnapshot {
  const todayStr = new Date().toISOString().split("T")[0];
  const activeItems = deal.checklistItems.filter(i => i.status !== "na");

  // Overall summary
  const completed = activeItems.filter(i => i.status === "complete").length;
  const inProgress = activeItems.filter(i => i.status === "in_progress").length;
  const blocked = activeItems.filter(i => i.status === "blocked").length;
  const notStarted = activeItems.filter(i => i.status === "not_started").length;
  const pastDue = activeItems.filter(i =>
    i.milestoneDate && i.milestoneDate < todayStr && i.status !== "complete"
  ).length;

  // Per-workstream breakdown
  const wsMap = new Map<string, ChecklistItem[]>();
  activeItems.forEach(item => {
    const ws = item.workstream;
    if (!wsMap.has(ws)) wsMap.set(ws, []);
    wsMap.get(ws)!.push(item);
  });

  const workstreams: WorkstreamSnapshot[] = Array.from(wsMap.entries()).map(([ws, items]) => {
    const wsCompleted = items.filter(i => i.status === "complete").length;
    const wsInProgress = items.filter(i => i.status === "in_progress").length;
    const wsBlocked = items.filter(i => i.status === "blocked").length;
    const wsPastDue = items.filter(i =>
      i.milestoneDate && i.milestoneDate < todayStr && i.status !== "complete"
    ).length;
    const wsTotal = items.length;

    // Find existing narrative from previous snapshot for this workstream (carry forward)
    const lastSnapshot = deal.progressSnapshots.length > 0
      ? deal.progressSnapshots[deal.progressSnapshots.length - 1]
      : null;
    const lastWsSnapshot = lastSnapshot?.workstreams.find(w => w.workstream === ws);

    // Resolve ragOverride: explicit parameter map takes priority, then deal-level ragOverrides, then last snapshot value
    const resolvedRagOverride = (ragOverrides ?? deal.ragOverrides)?.[ws] ?? lastWsSnapshot?.ragOverride;

    return {
      workstream: ws,
      ragStatus: computeRAG({ blocked: wsBlocked, total: wsTotal, completed: wsCompleted, pastDue: wsPastDue }),
      ...(resolvedRagOverride ? { ragOverride: resolvedRagOverride } : {}),
      completed: wsCompleted,
      inProgress: wsInProgress,
      blocked: wsBlocked,
      pastDue: wsPastDue,
      total: wsTotal,
      pctComplete: wsTotal ? Math.round((wsCompleted / wsTotal) * 100) : 0,
      // Carry forward previous narrative/risks/next steps as starting point
      narrative: lastWsSnapshot?.narrative,
      keyRisks: lastWsSnapshot?.keyRisks,
      nextSteps: lastWsSnapshot?.nextSteps,
      highlightedItems: lastWsSnapshot?.highlightedItems,
    };
  }).sort((a, b) => {
    // Sort: red first, then amber, then green
    const ragOrder = { red: 0, amber: 1, green: 2 };
    return ragOrder[a.ragStatus] - ragOrder[b.ragStatus];
  });

  // Per-owner breakdown
  const ownerMap = new Map<string, { ownerId?: string; name: string; items: ChecklistItem[] }>();
  activeItems.forEach(item => {
    const ownerId = item.ownerId || "unassigned";
    if (!ownerMap.has(ownerId)) {
      const person = deal.people.find(p => p.id === ownerId);
      ownerMap.set(ownerId, { ownerId: item.ownerId, name: person?.name || "Unassigned", items: [] });
    }
    ownerMap.get(ownerId)!.items.push(item);
  });

  const owners: OwnerSnapshot[] = Array.from(ownerMap.values()).map(({ ownerId, name, items }) => ({
    ownerId,
    ownerName: name,
    completed: items.filter(i => i.status === "complete").length,
    inProgress: items.filter(i => i.status === "in_progress").length,
    blocked: items.filter(i => i.status === "blocked").length,
    total: items.length,
  })).sort((a, b) => b.total - a.total);

  return {
    id: `snapshot-${Date.now()}`,
    periodEnd,
    createdAt: new Date().toISOString(),
    summary: {
      totalActive: activeItems.length,
      completed,
      newlyInProgress: inProgress,
      newlyBlocked: blocked,
      pastDue,
      unchanged: notStarted,
    },
    workstreams,
    owners,
  };
}

// Get the current week-ending Friday date
export function getCurrentPeriodEnd(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (5 - day + 7) % 7; // Days until Friday
  const friday = new Date(now);
  friday.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  return friday.toISOString().split("T")[0];
}

// Compute overall program RAG from workstream RAGs
export function computeProgramRAG(workstreams: WorkstreamSnapshot[]): "red" | "amber" | "green" {
  if (workstreams.length === 0) return "green";
  const effectiveRags = workstreams.map(w => w.ragOverride || w.ragStatus);
  if (effectiveRags.some(r => r === "red")) return "red";
  if (effectiveRags.filter(r => r === "amber").length > workstreams.length * 0.3) return "red";
  if (effectiveRags.some(r => r === "amber")) return "amber";
  return "green";
}
