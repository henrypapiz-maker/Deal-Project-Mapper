import type { GeneratedDeal } from "./types";

const STORAGE_KEY = "dealmapper_deal_v3";
const STORAGE_KEY_V2 = "dealmapper_deal_v2";

export function saveDeal(deal: GeneratedDeal): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deal));
  } catch (e) {
    console.warn("Failed to save deal:", e);
  }
}

export function loadDeal(): GeneratedDeal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY_V2);
    if (!raw) return null;
    const deal = JSON.parse(raw) as GeneratedDeal;
    // Schema migration: ensure new fields exist
    if (!deal.people) deal.people = [];
    deal.checklistItems.forEach((item, _idx) => {
      if (!item.dependencies) item.dependencies = [];
      // Migrate notes from string[] to Note[]
      if (!item.notes) {
        item.notes = [];
      } else if (item.notes.length > 0 && typeof item.notes[0] === "string") {
        item.notes = (item.notes as unknown as string[]).map((str, i) => ({
          id: `migrated-${i}`,
          text: str,
          timestamp: deal.generatedAt,
        }));
      }
      // Add attachments if missing
      if (!item.attachments) item.attachments = [];
      // Migrate customDependencies from string[] to ClassifiedDependency[]
      if (item.customDependencies && item.customDependencies.length > 0 && typeof item.customDependencies[0] === "string") {
        item.customDependencies = (item.customDependencies as unknown as string[]).map(depId => ({
          targetItemId: depId,
          dependencyType: "predecessor" as any,
          createdAt: deal.generatedAt,
        }));
      }
    });
    // Add progressSnapshots if missing
    if (!deal.progressSnapshots) deal.progressSnapshots = [];
    // Add savedFilters with presets if missing
    if (!deal.savedFilters) {
      deal.savedFilters = [
        { id: "preset-1", name: "Day 1 Critical Path", filters: { phase: "day_1", workstream: "all", priority: "critical", status: "all", owner: "all" }, isPreset: true, createdAt: new Date().toISOString() },
        { id: "preset-2", name: "All Blocked", filters: { phase: "all", workstream: "all", priority: "all", status: "blocked", owner: "all" }, isPreset: true, createdAt: new Date().toISOString() },
        { id: "preset-3", name: "Overdue Items", filters: { phase: "all", workstream: "all", priority: "all", status: "overdue", owner: "all" }, isPreset: true, createdAt: new Date().toISOString() },
      ];
    }
    // Add changeLog if missing
    if (!deal.changeLog) deal.changeLog = [];
    return deal;
  } catch {
    return null;
  }
}

export function clearDeal(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasSavedDeal(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
