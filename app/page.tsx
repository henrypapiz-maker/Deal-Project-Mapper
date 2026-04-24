"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import { MustHaveWarningModal } from "@/components/checklist/MustHaveWarningModal";
import type { DealIntake, GeneratedDeal, ItemStatus, Priority, ChecklistItem, Person, ChangeEvent, RiskAlert, ParentProfile, WorkstreamContextOverride } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";
import { isMustHaveItem } from "@/lib/catalogue-metadata";
import { saveDeal, loadDeal, clearDeal, hasSavedDeal } from "@/lib/persistence";

type AppState = "landing" | "deals" | "intake" | "generating" | "dashboard";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [deal, setDeal] = useState<GeneratedDeal | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [dealsList, setDealsList] = useState<any[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [portfolioSort, setPortfolioSort] = useState("newest");
  const [portfolioPage, setPortfolioPage] = useState(1);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  // Adversarial guard: pending must-have override waiting for PMO confirmation
  const [mustHavePending, setMustHavePending] = useState<{
    item: ChecklistItem;
    targetStatus: ItemStatus;
  } | null>(null);

  // ── Fire-and-forget override log helper ──────────────────────────────────────
  const logOverride = useCallback((dealId: string, payload: {
    itemId?: string; itemDescription?: string; workstream?: string;
    overrideType: string; previousValue?: string; newValue?: string;
    warningShown?: boolean; overrideReason?: string;
  }) => {
    fetch(`/api/deals/${dealId}/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {/* non-critical */});
  }, []);

  // Fetch all deals from DB for multi-deal support
  async function fetchDeals() {
    setLoadingDeals(true);
    try {
      const res = await fetch("/api/deals");
      const data = await res.json();
      setDealsList(data.deals || []);
    } catch { setDealsList([]); }
    finally { setLoadingDeals(false); }
  }

  // Load a specific deal from DB by ID
  async function loadDealFromDb(dealId: string) {
    try {
      const res = await fetch(`/api/deals?id=${dealId}`);
      const data = await res.json();
      // API returns deal fields at top level (with id, intake, checklistItems, etc.)
      if (data.id || data.intake) {
        // Ensure each checklist item has an internal id
        if (data.checklistItems) {
          data.checklistItems = data.checklistItems.map((item: any, idx: number) => ({
            ...item,
            id: item.id || `db-${idx}-${Date.now()}`,
          }));
        }
        if (!data.changeLog) data.changeLog = [];
        setDeal(data);
        saveDeal(data);
        setAppState("dashboard");
      } else {
        console.warn("Deal data missing expected fields:", Object.keys(data));
      }
    } catch (e) { console.warn("Failed to load deal from DB:", e); }
  }

  // Auto-save to localStorage (immediate) + DB (debounced 2 s after last change)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false); // Prevent concurrent DB saves

  // BUG-02 fix: Push browser history state so back button works
  useEffect(() => {
    if (appState !== "landing") {
      window.history.pushState({ appState }, "", window.location.pathname);
    }
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.appState) {
        setAppState(e.state.appState);
      } else {
        setAppState("landing");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [appState]);

  useEffect(() => {
    if (!deal) return;
    // Always write to localStorage immediately so offline / fast-reload works
    saveDeal(deal);
    // Debounce the DB write — cancel any pending timer first
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    // BUG-03/05 fix: Skip DB save if already saving or if this is just an id backfill
    saveTimerRef.current = setTimeout(async () => {
      if (savingRef.current) return; // Prevent concurrent saves
      savingRef.current = true;
      setSaveStatus("saving");
      try {
        const res = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deal),
        });
        const data = await res.json();
        if (data.dealId && !deal.id) {
          // Back-fill the DB-assigned UUID into state — but skip re-triggering save
          setDeal((prev) =>
            prev ? { ...prev, id: data.dealId } : prev
          );
        }
        setLastSavedAt(new Date().toISOString());
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch (err: any) {
        console.warn("DB save failed, localStorage preserved:", err.message);
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    }, 2000);
  }, [deal]);

  // Check for saved deal on mount
  useEffect(() => {
    setHasSaved(typeof window !== "undefined" && hasSavedDeal());
  }, []);

  // Immediate DB save (used on deal creation to get deal.id right away)
  async function saveToDbImmediate(dealData: GeneratedDeal): Promise<string | null> {
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealData),
      });
      const data = await res.json();
      return data.dealId || null;
    } catch { return null; }
  }

  function handleIntakeSubmit(intake: DealIntake, parentProfile?: ParentProfile) {
    setAppState("generating");
    setTimeout(async () => {
      const generated = generateDeal(intake, parentProfile);
      // Save to DB immediately to get a deal.id for bowler table
      const dbId = await saveToDbImmediate(generated);
      if (dbId) generated.id = dbId;
      setDeal(generated);
      setAppState("dashboard");
    }, 1200);
  }

  // Internal: apply a status change directly (after must-have check passes)
  const applyStatusChange = useCallback((itemId: string, status: ItemStatus) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const item = prev.checklistItems.find(i => i.id === itemId);
      const oldValue = item?.status || "unknown";
      const event: ChangeEvent = {
        id: `chg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        itemId: item?.itemId || itemId,
        field: "status",
        oldValue,
        newValue: status,
      };
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((i) =>
          i.id === itemId ? { ...i, status } : i
        ),
        changeLog: [...(prev.changeLog || []), event],
      };
    });
  }, []);

  // Public handler: intercepts N/A on must-have items to show adversarial modal
  const handleUpdateStatus = useCallback((itemId: string, status: ItemStatus) => {
    if (status !== "na" || !deal) {
      applyStatusChange(itemId, status);
      return;
    }
    const item = deal.checklistItems.find(i => i.id === itemId);
    if (!item) { applyStatusChange(itemId, status); return; }

    const mustHave = isMustHaveItem(item.itemId, item.workstream, item.phase, item.priority);
    if (mustHave) {
      // Surface adversarial modal — do NOT apply status yet
      setMustHavePending({ item, targetStatus: status });
    } else {
      applyStatusChange(itemId, status);
    }
  }, [deal, applyStatusChange]);

  const handleUpdatePriority = useCallback((itemId: string, priority: Priority) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const item = prev.checklistItems.find(i => i.id === itemId);
      const oldValue = item?.priority || "unknown";
      // Log this as a base override if it deviates from the current priority
      if (prev.id && item && oldValue !== priority) {
        logOverride(prev.id, {
          itemId: item.itemId,
          itemDescription: item.description,
          workstream: item.workstream,
          overrideType: "priority_manual",
          previousValue: oldValue,
          newValue: priority,
          warningShown: false,
        });
      }
      const event: ChangeEvent = {
        id: `chg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        itemId: item?.itemId || itemId,
        field: "priority",
        oldValue,
        newValue: priority,
      };
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((i) =>
          i.id === itemId
            ? { ...i, priority, priorityOverride: priority }
            : i
        ),
        changeLog: [...(prev.changeLog || []), event],
      };
    });
  }, [logOverride]);

  const handleUpdateBlockedReason = useCallback((itemId: string, reason: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, blockedReason: reason } : item
        ),
      };
    });
  }, []);

  const handleAddTask = useCallback((task: { workstream: string; description: string; phase: string; priority: string; section: string; status?: string; ownerId?: string }) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const custItems = prev.checklistItems.filter(i => i.itemId.startsWith("CUST-"));
      const nextNum = custItems.length + 1;
      const newItem: ChecklistItem = {
        id: `custom-${Date.now()}`,
        itemId: `CUST-${String(nextNum).padStart(4, "0")}`,
        workstream: task.workstream as any,
        section: task.section || "Custom",
        description: task.description,
        phase: task.phase as any,
        priority: task.priority as any,
        status: (task.status as any) || "not_started",
        ownerId: task.ownerId || undefined,
        dependencies: [],
        tsaRelevant: false,
        crossBorderFlag: false,
        riskIndicators: [],
        notes: [],
      };
      return {
        ...prev,
        checklistItems: [...prev.checklistItems, newItem],
      };
    });
  }, []);

  const handleUpdateItem = useCallback((itemId: string, updates: Partial<Pick<ChecklistItem, "description" | "workstream" | "phase" | "section" | "priority" | "status" | "ownerId">>) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map(i =>
          i.id === itemId ? { ...i, ...updates } : i
        ),
      };
    });
  }, []);

  const handleAddPerson = useCallback((name: string, role?: string, email?: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const person: Person = { id: `person-${Date.now()}`, name, role, email };
      return { ...prev, people: [...prev.people, person] };
    });
  }, []);

  const handleAssignOwner = useCallback((itemId: string, ownerId: string | undefined) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const item = prev.checklistItems.find(i => i.id === itemId);
      const oldPerson = prev.people.find(p => p.id === item?.ownerId);
      const newPerson = prev.people.find(p => p.id === ownerId);
      const event: ChangeEvent = {
        id: `chg-${Date.now()}`,
        timestamp: new Date().toISOString(),
        itemId: item?.itemId || itemId,
        field: "owner",
        oldValue: oldPerson?.name || "Unassigned",
        newValue: newPerson?.name || "Unassigned",
      };
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((i) =>
          i.id === itemId ? { ...i, ownerId } : i
        ),
        changeLog: [...(prev.changeLog || []), event],
      };
    });
  }, []);

  // Bulk assign multiple items to an owner (by itemId, not id)
  const handleBulkAssign = useCallback((itemIds: string[], ownerId: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const idSet = new Set(itemIds);
      const personName = prev.people.find(p => p.id === ownerId)?.name || "Unknown";
      const events: ChangeEvent[] = prev.checklistItems
        .filter(i => idSet.has(i.itemId) && i.ownerId !== ownerId)
        .map(i => ({
          id: `chg-${Date.now()}-${i.itemId}`,
          timestamp: new Date().toISOString(),
          itemId: i.itemId,
          field: "owner",
          oldValue: prev.people.find(p => p.id === i.ownerId)?.name || "Unassigned",
          newValue: personName,
        }));
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((i) =>
          idSet.has(i.itemId) ? { ...i, ownerId } : i
        ),
        changeLog: [...(prev.changeLog || []), ...events],
      };
    });
  }, []);

  // Add note to checklist item
  const handleAddNote = useCallback((itemId: string, text: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.itemId === itemId
            ? { ...item, notes: [...item.notes, { id: `note-${Date.now()}`, text, timestamp: new Date().toISOString() }] }
            : item
        ),
      };
    });
  }, []);

  // Add attachment to checklist item
  const handleAddAttachment = useCallback((itemId: string, name: string, url?: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.itemId === itemId
            ? { ...item, attachments: [...(item.attachments || []), { id: `att-${Date.now()}`, name, url, addedAt: new Date().toISOString() }] }
            : item
        ),
      };
    });
  }, []);

  // Save a progress snapshot
  const handleSaveSnapshot = useCallback((snapshot: any) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return { ...prev, progressSnapshots: [...prev.progressSnapshots, snapshot] };
    });
  }, []);

  // Update workstream narrative in a snapshot
  const handleUpdateNarrative = useCallback((snapshotId: string, workstream: string, updates: { narrative?: string; ragOverride?: "red" | "amber" | "green" | undefined; keyRisks?: string; nextSteps?: string }) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        progressSnapshots: prev.progressSnapshots.map((snap) =>
          snap.id === snapshotId
            ? {
                ...snap,
                workstreams: snap.workstreams.map((ws) => {
                  if (ws.workstream !== workstream) return ws;
                  const { keyRisks, nextSteps, ...rest } = updates;
                  return {
                    ...ws,
                    ...rest,
                    ...(keyRisks !== undefined ? { keyRisks: keyRisks.split(",").map(s => s.trim()).filter(Boolean) } : {}),
                    ...(nextSteps !== undefined ? { nextSteps: nextSteps.split(",").map(s => s.trim()).filter(Boolean) } : {}),
                  };
                }),
              }
            : snap
        ),
      };
    });
  }, []);

  // Persist RAG override at deal level (survives tab switches and snapshot regeneration)
  const handleUpdateRagOverride = useCallback((workstream: string, rag: "red" | "amber" | "green" | undefined) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const current = prev.ragOverrides ?? {};
      const updated = { ...current };
      if (rag) {
        updated[workstream] = rag;
      } else {
        delete updated[workstream];
      }
      return { ...prev, ragOverrides: updated };
    });
  }, []);

  // Save filter
  const handleSaveFilter = useCallback((name: string, filters: any) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return { ...prev, savedFilters: [...prev.savedFilters, { id: `filter-${Date.now()}`, name, filters, createdAt: new Date().toISOString() }] };
    });
  }, []);

  // Delete filter
  const handleDeleteFilter = useCallback((filterId: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return { ...prev, savedFilters: prev.savedFilters.filter(f => f.id !== filterId) };
    });
  }, []);

  // Add a custom risk
  const handleAddRisk = useCallback((risk: { category: string; severity: string; description: string; mitigation?: string; linkedItemIds?: string[]; source?: string }) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const newRisk: RiskAlert = {
        id: `risk-${Date.now()}`,
        category: risk.category as any,
        severity: risk.severity as any,
        description: risk.description,
        mitigation: risk.mitigation || "",
        affectedWorkstreams: [],
        status: "open",
        linkedItemIds: risk.linkedItemIds || [],
        source: (risk.source as any) || "manual",
        createdAt: new Date().toISOString(),
      };
      return { ...prev, riskAlerts: [...prev.riskAlerts, newRisk] };
    });
  }, []);

  // Update risk status
  const handleUpdateRisk = useCallback((riskId: string, updates: { status?: string; notes?: string; linkedItemIds?: string[] }) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        riskAlerts: prev.riskAlerts.map(r =>
          r.id === riskId ? { ...r, ...updates as any } : r
        ),
      };
    });
  }, []);

  // Add ad-hoc dependency between items
  const handleAddDependency = useCallback((itemId: string, dependsOnId: string, depType?: string, detail?: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const dep = {
        targetItemId: dependsOnId,
        dependencyType: (depType || "predecessor") as any,
        detail: detail || undefined,
        createdAt: new Date().toISOString(),
        escalate: false,
      };
      return {
        ...prev,
        checklistItems: prev.checklistItems.map(item =>
          item.itemId === itemId
            ? { ...item, customDependencies: [...(item.customDependencies || []), dep] }
            : item
        ),
      };
    });
  }, []);

  // Remove ad-hoc dependency
  const handleRemoveDependency = useCallback((itemId: string, dependsOnId: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map(item =>
          item.itemId === itemId
            ? { ...item, customDependencies: (item.customDependencies || []).filter(d => (typeof d === 'string' ? d : d.targetItemId) !== dependsOnId) }
            : item
        ),
      };
    });
  }, []);

  // ── Workstream context override ──────────────────────────────────────────────
  const handleUpdateWorkstreamOverride = useCallback((
    workstream: string,
    patch: Partial<WorkstreamContextOverride> & { action?: "reactivate" | "priority_bump" | "priority_reduce" }
  ) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const existing = prev.workstreamOverrides?.[workstream] ?? {};
      const now = new Date().toISOString();

      let updatedItems = prev.checklistItems;
      const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
      const PRIORITY_BY_RANK = ["low", "medium", "high", "critical"] as Priority[];

      if (patch.action === "reactivate" || patch.reactivateNa) {
        // Re-activate engine-N/A'd items in this workstream (those with a naJustification)
        updatedItems = prev.checklistItems.map(i =>
          i.workstream === workstream && i.status === "na" && i.naJustification
            ? { ...i, status: "not_started" as ItemStatus, naJustification: undefined }
            : i
        );
        const reactivatedCount = updatedItems.filter(
          (i, idx) => i.workstream === workstream && prev.checklistItems[idx].status === "na"
        ).length;
        if (prev.id) {
          logOverride(prev.id, {
            workstream,
            overrideType: "workstream_reactivate",
            previousValue: "na",
            newValue: "not_started",
            overrideReason: `Bulk reactivation of ${workstream} workstream items`,
          });
        }
      }

      if (patch.action === "priority_bump" || patch.action === "priority_reduce") {
        const steps = patch.action === "priority_bump" ? 1 : -1;
        updatedItems = updatedItems.map(i => {
          if (i.workstream !== workstream || i.status === "na") return i;
          const rank = PRIORITY_RANK[i.priority] ?? 1;
          const newPriority = PRIORITY_BY_RANK[Math.min(3, Math.max(0, rank + steps))];
          return newPriority !== i.priority ? { ...i, priority: newPriority, priorityOverride: newPriority } : i;
        });
        if (prev.id) {
          logOverride(prev.id, {
            workstream,
            overrideType: "workstream_priority_bump",
            previousValue: "engine-assigned",
            newValue: patch.action === "priority_bump" ? "+1 tier" : "-1 tier",
            overrideReason: `Workstream-level priority ${patch.action === "priority_bump" ? "elevation" : "reduction"} applied to ${workstream}`,
          });
        }
      }

      const updatedOverride: WorkstreamContextOverride = {
        ...existing,
        ...(patch.notes !== undefined ? { notes: patch.notes, notesUpdatedAt: now } : {}),
        ...(patch.priorityBump !== undefined ? { priorityBump: patch.priorityBump } : {}),
        ...(patch.reactivateNa || patch.action === "reactivate" ? { reactivateNa: true, reactivatedAt: now } : {}),
      };

      return {
        ...prev,
        checklistItems: updatedItems,
        workstreamOverrides: {
          ...(prev.workstreamOverrides ?? {}),
          [workstream]: updatedOverride,
        },
      };
    });
  }, [logOverride]);

  // Update deal-level fields (used by Admin tab)
  const handleUpdateDeal = useCallback((updates: Partial<GeneratedDeal>) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
  }, []);

  // Update a person's fields (used by Admin tab for permission levels)
  const handleUpdatePerson = useCallback((personId: string, updates: Partial<Person>) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        people: prev.people.map(p => p.id === personId ? { ...p, ...updates } : p),
      };
    });
  }, []);

  // Force immediate DB save (bypasses debounce)
  const handleForceSave = useCallback(async () => {
    if (!deal) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deal),
      });
      const data = await res.json();
      if (data.dealId && !deal.id) {
        setDeal((prev) => prev ? { ...prev, id: data.dealId } : prev);
      }
      setLastSavedAt(new Date().toISOString());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      console.warn("Force save failed:", err.message);
      setSaveStatus("error");
    }
  }, [deal]);

  function handleReset() {
    clearDeal();
    setDeal(null);
    setAppState("landing");
    setHasSaved(false);
  }

  if (appState === "generating") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: "0 auto 24px",
            background: "linear-gradient(135deg, #2563EB, #3B82F6, #60A5FA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -1,
            animation: "pulse 1.5s ease-in-out infinite",
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.35)",
          }}>DM</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#F8FAFC", marginBottom: 8, letterSpacing: -0.3 }}>
            Generating Integration Plan…
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", maxWidth: 380, lineHeight: 1.6 }}>
            Running decision tree · Scanning for risks · Configuring 531-item checklist across 24 workstreams
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "#3B82F6",
                opacity: 0.4,
                animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.05)} }
          @keyframes bounce { 0%,100%{opacity:0.4;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)} }
        `}</style>
      </div>
    );
  }

  if (appState === "dashboard" && deal) {
    return (
      <>
        <Dashboard deal={deal} onUpdateStatus={handleUpdateStatus} onUpdatePriority={handleUpdatePriority} onUpdateBlockedReason={handleUpdateBlockedReason} onReset={() => { clearDeal(); setDeal(null); setAppState("deals"); fetchDeals(); }} onAddTask={handleAddTask} onUpdateItem={handleUpdateItem} onAddPerson={handleAddPerson} onAssignOwner={handleAssignOwner} onAddNote={handleAddNote} onAddAttachment={handleAddAttachment} onSaveSnapshot={handleSaveSnapshot} onUpdateNarrative={handleUpdateNarrative} onSaveFilter={handleSaveFilter} onDeleteFilter={handleDeleteFilter} onBulkAssign={handleBulkAssign} onAddRisk={handleAddRisk} onUpdateRisk={handleUpdateRisk} onAddDependency={handleAddDependency} onRemoveDependency={handleRemoveDependency} onUpdateRagOverride={handleUpdateRagOverride} onUpdateDeal={handleUpdateDeal} onUpdatePerson={handleUpdatePerson} onUpdateWorkstreamOverride={handleUpdateWorkstreamOverride} onForceSave={handleForceSave} lastSavedAt={lastSavedAt} saveStatus={saveStatus} />
        {/* Adversarial must-have override modal */}
        {mustHavePending && (
          <MustHaveWarningModal
            item={mustHavePending.item}
            targetStatus={mustHavePending.targetStatus}
            dealId={deal.id ?? ""}
            onConfirm={(item, targetStatus) => {
              applyStatusChange(item.id, targetStatus);
              setMustHavePending(null);
            }}
            onCancel={() => setMustHavePending(null)}
          />
        )}
      </>
    );
  }

  // Multi-deal list view
  if (appState === "deals") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)", color: "#F1F5F9", padding: 32 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Deal Portfolio</h1>
              <p style={{ fontSize: 12, color: "#94A3B8" }}>{dealsList.length} deals in database</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setAppState("intake")} style={{
                padding: "10px 24px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>+ New Deal</button>
              {hasSaved && (
                <button onClick={() => {
                  const saved = loadDeal();
                  if (saved) { setDeal(saved); setAppState("dashboard"); }
                }} style={{
                  padding: "10px 24px", borderRadius: 8, border: "1px solid rgba(59, 130, 246, 0.4)",
                  background: "transparent", color: "#3B82F6", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>Resume Local Draft</button>
              )}
            </div>
          </div>

          {/* BUG-10: Search + Sort controls */}
          {!loadingDeals && dealsList.length > 0 && (
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Search deals by name..."
                value={portfolioSearch}
                onChange={e => setPortfolioSearch(e.target.value)}
                style={{
                  flex: 1, padding: "8px 14px", borderRadius: 6, fontSize: 12,
                  background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(51, 65, 85, 0.5)",
                  color: "#F8FAFC", fontFamily: "inherit",
                }}
              />
              <select value={portfolioSort} onChange={e => setPortfolioSort(e.target.value)} style={{
                padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(51, 65, 85, 0.5)",
                color: "#94A3B8", fontFamily: "inherit", cursor: "pointer",
              }}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name_asc">Name A→Z</option>
                <option value="name_desc">Name Z→A</option>
              </select>
            </div>
          )}

          {loadingDeals && <div style={{ textAlign: "center", color: "#64748B", padding: 40 }}>Loading deals...</div>}

          {!loadingDeals && dealsList.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, borderRadius: 12, background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(51, 65, 85, 0.5)" }}>
              <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No deals in database yet</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Create a new deal to get started, or resume your local draft.</div>
            </div>
          )}

          {dealsList.length > 0 && (() => {
            // BUG-10/11: Filter, sort, and paginate
            let filtered = dealsList.filter((d: any) =>
              !portfolioSearch || d.name?.toLowerCase().includes(portfolioSearch.toLowerCase())
            );
            filtered.sort((a: any, b: any) => {
              if (portfolioSort === "name_asc") return (a.name || "").localeCompare(b.name || "");
              if (portfolioSort === "name_desc") return (b.name || "").localeCompare(a.name || "");
              if (portfolioSort === "oldest") return (a.created_at || "").localeCompare(b.created_at || "");
              return (b.created_at || "").localeCompare(a.created_at || ""); // newest
            });
            const PAGE_SIZE = 10;
            const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
            const paged = filtered.slice((portfolioPage - 1) * PAGE_SIZE, portfolioPage * PAGE_SIZE);

            return (
              <>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8 }}>
                  Showing {paged.length} of {filtered.length} deals{portfolioSearch ? ` matching "${portfolioSearch}"` : ""}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {paged.map((d: any) => {
                    const statusColors: Record<string, string> = { active: "#10B981", pre_close: "#F59E0B", complete: "#3B82F6", archived: "#64748B" };
                    return (
                      <div key={d.id} onClick={() => loadDealFromDb(d.id)} style={{
                        padding: "16px 20px", borderRadius: 10,
                        background: "rgba(30, 41, 59, 0.7)", border: "1px solid rgba(51, 65, 85, 0.5)",
                        cursor: "pointer", transition: "all 0.15s",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#3B82F6")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(51, 65, 85, 0.5)")}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#F8FAFC", marginBottom: 4 }}>{d.name}</div>
                          <div style={{ display: "flex", gap: 16, fontSize: 10, color: "#94A3B8" }}>
                            <span>{d.deal_structure?.replace(/_/g, " ")}</span>
                            <span>{d.integration_model?.replace(/_/g, " ")}</span>
                            <span>Close: {d.close_date ? new Date(d.close_date).toLocaleDateString() : "—"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{
                            fontSize: 9, fontWeight: 600, padding: "3px 10px", borderRadius: 4,
                            background: (statusColors[d.status] || "#64748B") + "22",
                            color: statusColors[d.status] || "#64748B",
                            textTransform: "uppercase",
                          }}>{d.status || "active"}</span>
                          {/* BUG-15: Better open label */}
                          <button onClick={(e) => { e.stopPropagation(); loadDealFromDb(d.id); }} style={{
                            padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.3)",
                            background: "transparent", color: "#3B82F6", fontSize: 9, fontWeight: 600,
                            cursor: "pointer",
                          }}>Open →</button>
                          <button onClick={async (e) => {
                            e.stopPropagation();
                            if (!window.confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
                            try {
                              await fetch(`/api/deals?id=${d.id}`, { method: "DELETE" });
                              fetchDeals();
                            } catch {}
                          }} style={{
                            padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.3)",
                            background: "transparent", color: "#EF4444", fontSize: 9, fontWeight: 600,
                            cursor: "pointer",
                          }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* BUG-11: Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
                    <button disabled={portfolioPage <= 1} onClick={() => setPortfolioPage(p => p - 1)} style={{
                      padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(51,65,85,0.5)",
                      background: "transparent", color: portfolioPage <= 1 ? "#334155" : "#94A3B8",
                      fontSize: 10, cursor: portfolioPage <= 1 ? "default" : "pointer",
                    }}>← Prev</button>
                    <span style={{ fontSize: 10, color: "#64748B", lineHeight: "28px" }}>Page {portfolioPage} of {totalPages}</span>
                    <button disabled={portfolioPage >= totalPages} onClick={() => setPortfolioPage(p => p + 1)} style={{
                      padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(51,65,85,0.5)",
                      background: "transparent", color: portfolioPage >= totalPages ? "#334155" : "#94A3B8",
                      fontSize: 10, cursor: portfolioPage >= totalPages ? "default" : "pointer",
                    }}>Next →</button>
                  </div>
                )}
              </>
            );
          })()}

          <button onClick={() => setAppState("landing")} style={{
            display: "block", margin: "24px auto 0", fontSize: 11, color: "#64748B",
            background: "transparent", border: "none", cursor: "pointer",
          }}>← Back to Home</button>
        </div>
      </div>
    );
  }

  if (appState === "intake") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)",
        color: "#F1F5F9",
      }}>
        <IntakeForm onSubmit={handleIntakeSubmit} />
      </div>
    );
  }

  // Landing page
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)",
      padding: 32,
    }}>
      <div style={{ maxWidth: 720, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 18, margin: "0 auto 28px",
          background: "linear-gradient(135deg, #2563EB, #3B82F6, #60A5FA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: -1,
          boxShadow: "0 8px 32px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.15)",
        }}>DM</div>

        <div style={{ fontSize: 11, color: "#60A5FA", textTransform: "uppercase", letterSpacing: 4, marginBottom: 16, fontWeight: 600 }}>
          DealMapper Intelligence
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#F8FAFC", marginBottom: 16, lineHeight: 1.15, letterSpacing: -0.5 }}>
          M&A Integration Engine
        </h1>
        <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.8, marginBottom: 40, maxWidth: 520, margin: "0 auto 40px", fontWeight: 400 }}>
          Configure your deal profile across 3 tiers. Receive a fully scoped integration program —
          risk assessment, 24-workstream checklist with priority override, and Claude AI guidance.
        </p>

        {/* Feature Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 44 }}>
          {[
            { label: "531-Item Checklist", icon: "\u2610" },
            { label: "8-Category Risk Engine", icon: "\u26A1" },
            { label: "Claude AI Guidance", icon: "\u2726" },
            { label: "24 Workstreams", icon: "\u25CE" },
            { label: "5-Phase Timeline", icon: "\u25B8" },
            { label: "10 IT Domains", icon: "\u2B21" },
          ].map((f) => (
            <span key={f.label} style={{
              padding: "6px 14px", borderRadius: 24, fontSize: 11, fontWeight: 500,
              background: "rgba(30, 41, 59, 0.7)", color: "#CBD5E1",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              display: "flex", alignItems: "center", gap: 6,
            }}><span style={{ color: "#60A5FA", fontSize: 10 }}>{f.icon}</span> {f.label}</span>
          ))}
        </div>

        <button
          onClick={() => setAppState("intake")}
          style={{
            padding: "16px 44px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #2563EB, #3B82F6)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.3,
            boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4), 0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          Start New Deal →
        </button>
        <button onClick={async () => {
          // Try localStorage first, then fall back to most recent DB deal
          const saved = loadDeal();
          if (saved) { setDeal(saved); setAppState("dashboard"); return; }
          // Load most recent deal from DB
          try {
            const res = await fetch("/api/deals");
            const data = await res.json();
            if (data.deals && data.deals.length > 0) {
              await loadDealFromDb(data.deals[0].id);
            } else {
              setAppState("intake");
            }
          } catch { setAppState("intake"); }
        }} style={{
          display: "block", margin: "12px auto 0", padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: "transparent", color: "#3B82F6",
          border: "1px solid rgba(59, 130, 246, 0.4)", cursor: "pointer", fontFamily: "inherit",
        }}>
          Resume Latest Deal
        </button>
        <button onClick={() => { fetchDeals(); setAppState("deals"); }} style={{
          display: "block", margin: "8px auto 0", padding: "10px 28px", borderRadius: 8, fontSize: 12, fontWeight: 500,
          background: "transparent", color: "#64748B",
          border: "1px solid rgba(51, 65, 85, 0.4)", cursor: "pointer", fontFamily: "inherit",
        }}>
          View All Deals →
        </button>

        <div style={{
          marginTop: 56, padding: "20px 28px", borderRadius: 12,
          background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(51, 65, 85, 0.5)",
          textAlign: "left",
        }}>
          <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontWeight: 600 }}>How it works</div>
          {[
            ["01", "Decision tree maps 13 intake fields across 3 tiers to 531 checklist items"],
            ["02", "Risk scanner runs 8 detection rules across 24 workstreams"],
            ["03", "Functional scope filters IT + Finance items; milestones auto-calculated"],
            ["04", "Claude AI generates contextual guidance per item with priority override"],
          ].map(([num, text]) => (
            <div key={num} style={{ display: "flex", gap: 14, marginBottom: 12, alignItems: "flex-start" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#3B82F6", minWidth: 24,
                background: "rgba(59, 130, 246, 0.1)", borderRadius: 4, padding: "2px 6px", textAlign: "center",
              }}>{num}</span>
              <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: "#334155", letterSpacing: 0.5 }}>
          DealMapper v0.6.0 · M&A Integration Engine · April 2026
        </div>
      </div>
    </div>
  );
}
