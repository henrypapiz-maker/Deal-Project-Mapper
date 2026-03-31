import type { GeneratedDeal } from "./types";

const STORAGE_KEY = "dealmapper_deal_v2";

export function saveDeal(deal: GeneratedDeal): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deal));
  } catch (e) {
    console.warn("Failed to save deal:", e);
  }
}

export function loadDeal(): GeneratedDeal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const deal = JSON.parse(raw) as GeneratedDeal;
    // Schema migration: ensure new fields exist
    if (!deal.people) deal.people = [];
    deal.checklistItems.forEach(item => {
      if (!item.notes) item.notes = [];
      if (!item.dependencies) item.dependencies = [];
    });
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
