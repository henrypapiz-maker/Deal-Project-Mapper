"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import type { DealIntake, GeneratedDeal, ItemStatus, Priority, ChecklistItem, Person, ChangeEvent, RiskAlert } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";
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
  const [adminMode, setAdminMode] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | undefined>(undefined);

  // Fetch all deals from DB for multi-deal support
  async function fetchDeals(includeArchived = false) {
    setLoadingDeals(true);
    try {
      const url = includeArchived ? "/api/deals?includeArchived=true" : "/api/deals";
      const res = await fetch(url);
      const data = await res.json();
      setDealsList(data.deals || []);
    } catch { setDealsList([]); }
    finally { setLoadingDeals(false); }
  }

  async function archiveDeal(id: string) {
    await fetch(`/api/deals?id=${id}&action=archive`, { method: "PATCH" });
    fetchDeals(showArchived);
    setSelectedDeals(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function unarchiveDeal(id: string) {
    await fetch(`/api/deals?id=${id}&action=unarchive`, { method: "PATCH" });
    fetchDeals(showArchived);
  }

  async function deleteDeal(id: string) {
    await fetch(`/api/deals?id=${id}`, { method: "DELETE" });
    setConfirmDeleteId(null);
    fetchDeals(showArchived);
    setSelectedDeals(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  async function exportDeal(id: string, name: string) {
    try {
      const res = await fetch(`/api/deals?id=${id}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silently fail */ }
  }

  async function bulkArchive() {
    setBulkWorking(true);
    await Promise.all(Array.from(selectedDeals).map(id =>
      fetch(`/api/deals?id=${id}&action=archive`, { method: "PATCH" })
    ));
    setSelectedDeals(new Set());
    setBulkWorking(false);
    fetchDeals(showArchived);
  }

  async function bulkDelete() {
    if (!window.confirm(`Permanently delete ${selectedDeals.size} deal(s)? This cannot be undone.`)) return;
    setBulkWorking(true);
    await Promise.all(Array.from(selectedDeals).map(id =>
      fetch(`/api/deals?id=${id}`, { method: "DELETE" })
    ));
    setSelectedDeals(new Set());
    setBulkWorking(false);
    fetchDeals(showArchived);
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

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    setTimeout(async () => {
      const generated = generateDeal(intake);
      // Save to DB immediately to get a deal.id for bowler table
      const dbId = await saveToDbImmediate(generated);
      if (dbId) generated.id = dbId;
      setDeal(generated);
      setAppState("dashboard");
    }, 1200);
  }

  const handleUpdateStatus = useCallback((itemId: string, status: ItemStatus) => {
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

  const handleUpdatePriority = useCallback((itemId: string, priority: Priority) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const item = prev.checklistItems.find(i => i.id === itemId);
      const oldValue = item?.priority || "unknown";
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
  }, []);

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
            Running decision tree · Scanning for risks · Configuring 530-item checklist across 24 workstreams
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
    return <Dashboard deal={deal} onUpdateStatus={handleUpdateStatus} onUpdatePriority={handleUpdatePriority} onUpdateBlockedReason={handleUpdateBlockedReason} onReset={() => { clearDeal(); setDeal(null); setAppState("deals"); fetchDeals(); }} onAddTask={handleAddTask} onUpdateItem={handleUpdateItem} onAddPerson={handleAddPerson} onAssignOwner={handleAssignOwner} onAddNote={handleAddNote} onAddAttachment={handleAddAttachment} onSaveSnapshot={handleSaveSnapshot} onUpdateNarrative={handleUpdateNarrative} onSaveFilter={handleSaveFilter} onDeleteFilter={handleDeleteFilter} onBulkAssign={handleBulkAssign} onAddRisk={handleAddRisk} onUpdateRisk={handleUpdateRisk} onAddDependency={handleAddDependency} onRemoveDependency={handleRemoveDependency} onUpdateRagOverride={handleUpdateRagOverride} onUpdateDeal={handleUpdateDeal} onUpdatePerson={handleUpdatePerson} onForceSave={handleForceSave} lastSavedAt={lastSavedAt} saveStatus={saveStatus} />;
  }

  // Multi-deal list view
  if (appState === "deals") {
    const statusColors: Record<string, string> = { active: "#10B981", pre_close: "#F59E0B", complete: "#3B82F6", archived: "#64748B" };
    const filtered = dealsList
      .filter((d: any) => !portfolioSearch || d.name?.toLowerCase().includes(portfolioSearch.toLowerCase()))
      .sort((a: any, b: any) => {
        if (portfolioSort === "name_asc") return (a.name || "").localeCompare(b.name || "");
        if (portfolioSort === "name_desc") return (b.name || "").localeCompare(a.name || "");
        if (portfolioSort === "oldest") return (a.created_at || "").localeCompare(b.created_at || "");
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
    const PAGE_SIZE = 10;
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice((portfolioPage - 1) * PAGE_SIZE, portfolioPage * PAGE_SIZE);
    const allPageSelected = paged.length > 0 && paged.every((d: any) => selectedDeals.has(d.id));

    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)", color: "#F1F5F9", padding: 32 }}>
        <div style={{
          maxWidth: 900, margin: "0 auto",
          border: adminMode ? "1px solid rgba(245,158,11,0.3)" : "none",
          borderRadius: adminMode ? 14 : 0,
          padding: adminMode ? 20 : 0,
        }}>

          {/* ── Header ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Deal Portfolio</h1>
                {adminMode && (
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)" }}>
                    ADMIN MODE
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                {dealsList.length} deal{dealsList.length !== 1 ? "s" : ""}{showArchived ? " (including archived)" : ""}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setAppState("intake")} style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>+ New Deal</button>
              {hasSaved && (
                <button onClick={() => { const saved = loadDeal(); if (saved) { setDeal(saved); setAppState("dashboard"); } }} style={{
                  padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(59,130,246,0.4)",
                  background: "transparent", color: "#3B82F6", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}>Resume Draft</button>
              )}
              <button
                onClick={() => {
                  const next = !adminMode;
                  setAdminMode(next);
                  setSelectedDeals(new Set());
                  if (!next) { setShowArchived(false); fetchDeals(false); }
                }}
                style={{
                  padding: "10px 16px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${adminMode ? "rgba(245,158,11,0.6)" : "rgba(51,65,85,0.6)"}`,
                  background: adminMode ? "rgba(245,158,11,0.12)" : "transparent",
                  color: adminMode ? "#F59E0B" : "#64748B",
                }}
              >
                {adminMode ? "✓ Admin" : "Admin"}
              </button>
            </div>
          </div>

          {/* ── Search + Sort + Admin toggles ── */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search deals by name..."
              value={portfolioSearch}
              onChange={e => setPortfolioSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 160, padding: "8px 14px", borderRadius: 6, fontSize: 12,
                background: "rgba(30,41,59,0.7)", border: "1px solid rgba(51,65,85,0.5)",
                color: "#F8FAFC", fontFamily: "inherit", outline: "none",
              }}
            />
            <select value={portfolioSort} onChange={e => setPortfolioSort(e.target.value)} style={{
              padding: "8px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
              background: "rgba(30,41,59,0.7)", border: "1px solid rgba(51,65,85,0.5)",
              color: "#94A3B8", fontFamily: "inherit", cursor: "pointer",
            }}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name_asc">Name A→Z</option>
              <option value="name_desc">Name Z→A</option>
            </select>
            {adminMode && (
              <button
                onClick={() => { const next = !showArchived; setShowArchived(next); fetchDeals(next); }}
                style={{
                  padding: "8px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${showArchived ? "rgba(100,116,139,0.6)" : "rgba(51,65,85,0.5)"}`,
                  background: showArchived ? "rgba(100,116,139,0.15)" : "transparent",
                  color: showArchived ? "#94A3B8" : "#64748B",
                }}
              >
                {showArchived ? "✓ Archived" : "Show Archived"}
              </button>
            )}
          </div>

          {/* ── Bulk action bar ── */}
          {adminMode && selectedDeals.size > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
              padding: "10px 16px", borderRadius: 8,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#F59E0B", flex: 1 }}>
                {selectedDeals.size} deal{selectedDeals.size !== 1 ? "s" : ""} selected
              </span>
              <button onClick={bulkArchive} disabled={bulkWorking} style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: "1px solid rgba(245,158,11,0.5)", background: "rgba(245,158,11,0.12)", color: "#F59E0B",
                opacity: bulkWorking ? 0.5 : 1,
              }}>{bulkWorking ? "Working…" : "Archive Selected"}</button>
              <button onClick={bulkDelete} disabled={bulkWorking} style={{
                padding: "5px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.10)", color: "#EF4444",
                opacity: bulkWorking ? 0.5 : 1,
              }}>{bulkWorking ? "Working…" : "Delete Selected"}</button>
              <button onClick={() => setSelectedDeals(new Set())} style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer",
                border: "1px solid rgba(51,65,85,0.5)", background: "transparent", color: "#64748B",
              }}>Clear</button>
            </div>
          )}

          {loadingDeals && <div style={{ textAlign: "center", color: "#64748B", padding: 40 }}>Loading deals...</div>}

          {!loadingDeals && dealsList.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, borderRadius: 12, background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)" }}>
              <div style={{ fontSize: 14, color: "#94A3B8", marginBottom: 12 }}>No deals in database yet</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Create a new deal to get started, or resume your local draft.</div>
            </div>
          )}

          {dealsList.length > 0 && (
            <>
              {/* Select-all row */}
              {adminMode && paged.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                  <input type="checkbox" checked={allPageSelected} onChange={() => {
                    if (allPageSelected) {
                      setSelectedDeals(prev => { const n = new Set(prev); paged.forEach((d: any) => n.delete(d.id)); return n; });
                    } else {
                      setSelectedDeals(prev => { const n = new Set(prev); paged.forEach((d: any) => n.add(d.id)); return n; });
                    }
                  }} style={{ cursor: "pointer" }} />
                  <span style={{ fontSize: 10, color: "#64748B" }}>Select all on this page</span>
                </div>
              )}
              <div style={{ fontSize: 10, color: "#64748B", marginBottom: 8 }}>
                Showing {paged.length} of {filtered.length} deal{filtered.length !== 1 ? "s" : ""}{portfolioSearch ? ` matching "${portfolioSearch}"` : ""}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {paged.map((d: any) => {
                  const isArchived = d.status === "archived";
                  const isSelected = selectedDeals.has(d.id);
                  const isConfirmingDelete = confirmDeleteId === d.id;
                  return (
                    <div key={d.id} style={{
                      padding: "14px 18px", borderRadius: 10,
                      background: isArchived ? "rgba(20,28,44,0.7)" : "rgba(30,41,59,0.7)",
                      border: `1px solid ${isSelected ? "rgba(245,158,11,0.5)" : isArchived ? "rgba(51,65,85,0.3)" : "rgba(51,65,85,0.5)"}`,
                      opacity: isArchived ? 0.78 : 1,
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      {adminMode && (
                        <input type="checkbox" checked={isSelected} onClick={e => e.stopPropagation()} onChange={() => {
                          setSelectedDeals(prev => { const n = new Set(prev); if (n.has(d.id)) n.delete(d.id); else n.add(d.id); return n; });
                        }} style={{ cursor: "pointer", flexShrink: 0 }} />
                      )}
                      <div
                        onClick={() => !isArchived && loadDealFromDb(d.id)}
                        style={{ flex: 1, cursor: isArchived ? "default" : "pointer" }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: isArchived ? "#64748B" : "#F8FAFC", marginBottom: 3 }}>{d.name}</div>
                        <div style={{ display: "flex", gap: 14, fontSize: 10, color: "#64748B" }}>
                          <span>{d.deal_structure?.replace(/_/g, " ")}</span>
                          <span>{d.integration_model?.replace(/_/g, " ")}</span>
                          <span>Close: {d.close_date ? new Date(d.close_date).toLocaleDateString() : "—"}</span>
                          {isArchived && d.archived_at && <span>Archived: {new Date(d.archived_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 4,
                          background: (statusColors[d.status] || "#64748B") + "22",
                          color: statusColors[d.status] || "#64748B",
                          textTransform: "uppercase",
                        }}>{d.status || "active"}</span>

                        {!isArchived && (
                          <button onClick={(e) => { e.stopPropagation(); loadDealFromDb(d.id); }} style={{
                            padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(59,130,246,0.3)",
                            background: "transparent", color: "#3B82F6", fontSize: 9, fontWeight: 600, cursor: "pointer",
                          }}>Open →</button>
                        )}

                        {adminMode && !isArchived && (
                          <button onClick={(e) => { e.stopPropagation(); archiveDeal(d.id); }} style={{
                            padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(245,158,11,0.4)",
                            background: "transparent", color: "#F59E0B", fontSize: 9, fontWeight: 600, cursor: "pointer",
                          }}>Archive</button>
                        )}

                        {adminMode && isArchived && (
                          <button onClick={(e) => { e.stopPropagation(); unarchiveDeal(d.id); }} style={{
                            padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(100,116,139,0.5)",
                            background: "transparent", color: "#94A3B8", fontSize: 9, fontWeight: 600, cursor: "pointer",
                          }}>Unarchive</button>
                        )}

                        {adminMode && (
                          <button onClick={(e) => { e.stopPropagation(); exportDeal(d.id, d.name); }} style={{
                            padding: "3px 10px", borderRadius: 4, border: "1px solid rgba(16,185,129,0.4)",
                            background: "transparent", color: "#10B981", fontSize: 9, fontWeight: 600, cursor: "pointer",
                          }}>Export ↓</button>
                        )}

                        {adminMode && (isConfirmingDelete ? (
                          <span style={{ display: "flex", gap: 4 }}>
                            <button onClick={(e) => { e.stopPropagation(); deleteDeal(d.id); }} style={{
                              padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.7)",
                              background: "rgba(239,68,68,0.15)", color: "#EF4444", fontSize: 9, fontWeight: 700, cursor: "pointer",
                            }}>Confirm ✓</button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} style={{
                              padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(51,65,85,0.5)",
                              background: "transparent", color: "#64748B", fontSize: 9, cursor: "pointer",
                            }}>Cancel</button>
                          </span>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(d.id); }} style={{
                            padding: "3px 8px", borderRadius: 4, border: "1px solid rgba(239,68,68,0.3)",
                            background: "transparent", color: "#EF4444", fontSize: 9, fontWeight: 600, cursor: "pointer",
                          }}>Delete</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

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
          )}

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
        <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.8, marginBottom: 40, maxWidth: 540, margin: "0 auto 40px", fontWeight: 400 }}>
          Configure your deal across 4 tiers — org context, deal identity, complexity scope, and AI tuning.
          Receive a fully scoped integration program: 530-item checklist, 8-category risk engine, and Claude AI guidance across 15 functional areas.
        </p>

        {/* Feature Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 44 }}>
          {[
            { label: "530-Item Checklist",     icon: "☐", color: "#60A5FA" },
            { label: "15 Functional Areas",    icon: "◈", color: "#60A5FA" },
            { label: "8-Category Risk Engine", icon: "⚡", color: "#F59E0B" },
            { label: "Claude AI Guidance",     icon: "✦", color: "#A78BFA" },
            { label: "24 Workstreams",         icon: "◎", color: "#60A5FA" },
            { label: "4-Tier Intake Wizard",   icon: "▸", color: "#10B981" },
            { label: "5-Phase Timeline",       icon: "⬡", color: "#60A5FA" },
            { label: "Admin Deal Management",  icon: "◆", color: "#F59E0B" },
          ].map((f) => (
            <span key={f.label} style={{
              padding: "6px 14px", borderRadius: 24, fontSize: 11, fontWeight: 500,
              background: "rgba(30, 41, 59, 0.7)", color: "#CBD5E1",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              display: "flex", alignItems: "center", gap: 6,
            }}><span style={{ color: f.color, fontSize: 10 }}>{f.icon}</span> {f.label}</span>
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
            ["01", "Tier 0 org profile sets acquirer context — GAAP, ERP, IMO structure, buyer maturity — persisted across all deals"],
            ["02", "Decision tree maps 4-tier intake across 15 functional areas to 530 checklist items"],
            ["03", "Risk scanner runs 8 detection rules across 24 workstreams; milestones auto-calculated from close date"],
            ["04", "Structured Prompt Library with role, context, format and reasoning injects targeted AI guidance per workstream"],
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
          DealMapper v0.7.2 · M&A Integration Engine · June 2026
        </div>
      </div>
    </div>
  );
}
