"use client";

import { useState, useCallback, useEffect } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import type { DealIntake, GeneratedDeal, ItemStatus, TeamMember, AISuggestion, Phase, Priority, Workstream } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";

const STORAGE_KEY = "mae_current_deal";

function loadSavedDeal(): GeneratedDeal | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const deal = JSON.parse(raw) as GeneratedDeal;
    // Backfill field added after initial release
    if (!deal.aiSuggestions) deal.aiSuggestions = [];
    return deal;
  } catch {
    return null;
  }
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function fetchDealSuggestions(intake: DealIntake): Promise<AISuggestion[]> {
  try {
    const res = await fetch("/api/ai-considerations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "deal", intake }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.suggestions ?? [];
    return raw.map((s: { workstream: string; description: string; rationale: string; phase: string; priority: string }) => ({
      id: generateId(),
      source: "deal_intake" as const,
      workstream: s.workstream as Workstream,
      description: s.description,
      rationale: s.rationale,
      phase: s.phase as Phase,
      priority: s.priority as Priority,
      status: "pending" as const,
      suggestedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchItemSuggestions(
  item: { itemId: string; workstream: string; description: string; status: string; blockedReason?: string; notes: string[] },
  dealContext: DealIntake
): Promise<AISuggestion[]> {
  try {
    const res = await fetch("/api/ai-considerations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "item", item, dealContext }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const raw = data.suggestions ?? [];
    return raw.map((s: { workstream: string; description: string; rationale: string; phase: string; priority: string }) => ({
      id: generateId(),
      source: "item_update" as const,
      triggerItemId: item.itemId,
      workstream: s.workstream as Workstream,
      description: s.description,
      rationale: s.rationale,
      phase: s.phase as Phase,
      priority: s.priority as Priority,
      status: "pending" as const,
      suggestedAt: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function saveDeal(deal: GeneratedDeal) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deal));
  } catch {
    // storage quota exceeded — silently ignore
  }
  // Background sync to Neon (fire-and-forget)
  if (deal.dealId) {
    fetch(`/api/deals/${deal.dealId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: deal }),
    }).catch(() => {/* ignore — localStorage is primary */});
  }
}

function clearSavedDeal() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Create a new deal row in Neon, return its id (null if DB not configured)
async function dbCreate(deal: GeneratedDeal): Promise<string | null> {
  try {
    const res = await fetch("/api/deals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: deal.intake.dealName, data: deal }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}

// Load a deal from Neon by id (null if not found or DB unavailable)
async function dbLoad(dealId: string): Promise<GeneratedDeal | null> {
  try {
    const res = await fetch(`/api/deals/${dealId}`);
    if (!res.ok) return null;
    return res.json() as Promise<GeneratedDeal>;
  } catch {
    return null;
  }
}

type AppState = "landing" | "intake" | "generating" | "dashboard";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [deal, setDeal] = useState<GeneratedDeal | null>(null);
  const [savedMeta, setSavedMeta] = useState<{ name: string; savedAt: string } | null>(null);

  // On mount: check for a saved deal and surface resume option
  useEffect(() => {
    const saved = loadSavedDeal();
    if (saved) {
      setSavedMeta({
        name: saved.intake.dealName,
        savedAt: new Date(saved.generatedAt).toLocaleDateString(),
      });
    }
  }, []);

  // Auto-save whenever deal changes
  useEffect(() => {
    if (deal) saveDeal(deal);
  }, [deal]);

  async function handleResume() {
    const saved = loadSavedDeal();
    if (!saved) return;
    // If we have a dealId, try to fetch the freshest version from Neon
    if (saved.dealId) {
      const fresh = await dbLoad(saved.dealId);
      if (fresh) {
        saveDeal(fresh); // keep localStorage in sync
        setDeal(fresh);
        setAppState("dashboard");
        return;
      }
    }
    // Fall back to localStorage copy
    setDeal(saved);
    setAppState("dashboard");
  }

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    setTimeout(async () => {
      const generated = generateDeal(intake);
      const base: GeneratedDeal = { ...generated, aiSuggestions: [] };
      const dealId = await dbCreate(base);
      const dealWithId: GeneratedDeal = dealId ? { ...base, dealId } : base;
      setDeal(dealWithId);
      setSavedMeta({ name: dealWithId.intake.dealName, savedAt: new Date(dealWithId.generatedAt).toLocaleDateString() });
      setAppState("dashboard");
      // Fire deal-level AI considerations async — update deal when they arrive
      fetchDealSuggestions(intake).then((suggestions) => {
        if (suggestions.length === 0) return;
        setDeal((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, aiSuggestions: [...prev.aiSuggestions, ...suggestions] };
          saveDeal(updated);
          return updated;
        });
      });
    }, 1200);
  }

  const handleUpdateStatus = useCallback((itemId: string, status: ItemStatus) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, status } : item
        ),
      };
      saveDeal(updated);
      // Fire item-level AI considerations when moving to in_progress or complete
      if (status === "in_progress" || status === "complete" || status === "blocked") {
        const targetItem = updated.checklistItems.find((i) => i.id === itemId);
        if (targetItem) {
          fetchItemSuggestions(
            {
              itemId: targetItem.itemId,
              workstream: targetItem.workstream,
              description: targetItem.description,
              status: targetItem.status,
              blockedReason: targetItem.blockedReason,
              notes: targetItem.notes,
            },
            updated.intake
          ).then((suggestions) => {
            if (suggestions.length === 0) return;
            setDeal((current) => {
              if (!current) return current;
              // Deduplicate: skip suggestions already pending for this trigger item
              const existingForItem = new Set(
                current.aiSuggestions
                  .filter((s) => s.triggerItemId === targetItem.itemId && s.status === "pending")
                  .map((s) => s.description)
              );
              const fresh = suggestions.filter((s) => !existingForItem.has(s.description));
              if (fresh.length === 0) return current;
              const withNew = { ...current, aiSuggestions: [...current.aiSuggestions, ...fresh] };
              saveDeal(withNew);
              return withNew;
            });
          });
        }
      }
      return updated;
    });
  }, []);

  const handleAddMember = useCallback((member: TeamMember) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, teamMembers: [...prev.teamMembers, member] };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleRemoveMember = useCallback((memberId: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        teamMembers: prev.teamMembers.filter((m) => m.id !== memberId),
        checklistItems: prev.checklistItems.map((item) =>
          item.ownerId === memberId ? { ...item, ownerId: undefined } : item
        ),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleUpdateOwner = useCallback((itemId: string, ownerId: string | undefined) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, ownerId } : item
        ),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleAddNote = useCallback((itemId: string, note: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, notes: [...item.notes, note] } : item
        ),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleUpdateBlockedReason = useCallback((itemId: string, reason: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, blockedReason: reason || undefined } : item
        ),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleAcceptSuggestion = useCallback((suggestionId: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const suggestion = prev.aiSuggestions.find((s) => s.id === suggestionId);
      if (!suggestion) return prev;
      const newItem = {
        id: generateId(),
        itemId: `AI-${generateId().slice(0, 6).toUpperCase()}`,
        workstream: suggestion.workstream,
        section: "AI-Generated Consideration",
        description: suggestion.description,
        phase: suggestion.phase,
        milestoneDate: undefined,
        priority: suggestion.priority,
        status: "not_started" as ItemStatus,
        dependencies: [],
        tsaRelevant: false,
        crossBorderFlag: false,
        riskIndicators: [],
        notes: [`Rationale: ${suggestion.rationale}`],
        isAiGenerated: true,
      };
      const updated = {
        ...prev,
        checklistItems: [...prev.checklistItems, newItem],
        aiSuggestions: prev.aiSuggestions.map((s) =>
          s.id === suggestionId ? { ...s, status: "accepted" as const } : s
        ),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleDismissSuggestion = useCallback((suggestionId: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        aiSuggestions: prev.aiSuggestions.map((s) =>
          s.id === suggestionId ? { ...s, status: "dismissed" as const } : s
        ),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleUpdateRisk = useCallback((riskId: string, field: "severity" | "status", newValue: string, reason: string) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        riskAlerts: prev.riskAlerts.map((r) => {
          if (r.id !== riskId) return r;
          const override = {
            id: generateId(),
            changedAt: new Date().toISOString(),
            field,
            fromValue: String(r[field]),
            toValue: newValue,
            reason,
          };
          return { ...r, [field]: newValue as never, overrides: [...(r.overrides ?? []), override] };
        }),
      };
      saveDeal(updated);
      return updated;
    });
  }, []);

  const handleUpdateWorkstreamLead = useCallback((workstream: string, memberId: string | undefined) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const leads = { ...(prev.workstreamLeads ?? {}) };
      if (memberId) leads[workstream] = memberId;
      else delete leads[workstream];
      const updated = { ...prev, workstreamLeads: leads };
      saveDeal(updated);
      return updated;
    });
  }, []);

  function handleReset() {
    clearSavedDeal();
    setSavedMeta(null);
    setDeal(null);
    setAppState("landing");
  }

  if (appState === "generating") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0F1B2D 0%, #0F172A 100%)",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: "#fff",
            animation: "pulse 1.5s ease-in-out infinite",
          }}>M</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>
            Generating Integration Plan…
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", maxWidth: 340 }}>
            Running decision tree · Scanning for risks · Configuring 443-item checklist
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
      <Dashboard
        deal={deal}
        onUpdateStatus={handleUpdateStatus}
        onUpdateOwner={handleUpdateOwner}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onUpdateBlockedReason={handleUpdateBlockedReason}
        onAcceptSuggestion={handleAcceptSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        onUpdateRisk={handleUpdateRisk}
        onAddNote={handleAddNote}
        onUpdateWorkstreamLead={handleUpdateWorkstreamLead}
        onReset={handleReset}
      />
    );
  }

  if (appState === "intake") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0F1B2D 0%, #0F172A 100%)",
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
      background: "linear-gradient(135deg, #0F1B2D 0%, #0F172A 100%)",
      fontFamily: "'JetBrains Mono', monospace", padding: 24,
    }}>
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: "0 auto 24px",
          background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, color: "#fff",
          boxShadow: "0 0 40px #3B82F644",
        }}>M</div>

        <div style={{ fontSize: 12, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12, fontWeight: 700 }}>
          Phase 1 MVP · Variant A: Reactive Monitor
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F1F5F9", marginBottom: 16, lineHeight: 1.2 }}>
          M&A Integration Engine
        </h1>
        <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
          Enter 12 deal intake fields. Receive a fully configured integration program —
          risk assessment, dynamic checklist, and AI guidance — in seconds.
        </p>

        {/* Feature Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 40 }}>
          {[
            "443-Item Checklist",
            "7-Category Risk Engine",
            "Claude AI Guidance",
            "12 Workstreams",
            "5-Phase Timeline",
            "Decision Tree",
          ].map((f) => (
            <span key={f} style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: "#1E293B", color: "#60A5FA", border: "1px solid #334155",
            }}>{f}</span>
          ))}
        </div>

        {/* Resume saved deal */}
        {savedMeta && (
          <div style={{
            marginBottom: 16, padding: "12px 20px", borderRadius: 8,
            background: "#1E293B", border: "1px solid #3B82F633",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 10, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Saved deal</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>{savedMeta.name}</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Last opened {savedMeta.savedAt}</div>
            </div>
            <button
              onClick={handleResume}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none",
                background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
                color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              Resume →
            </button>
          </div>
        )}

        <button
          onClick={() => setAppState("intake")}
          style={{
            padding: "14px 36px", borderRadius: 8,
            background: savedMeta ? "#1E293B" : "linear-gradient(135deg, #3B82F6, #60A5FA)",
            color: savedMeta ? "#94A3B8" : "#fff",
            border: savedMeta ? "1px solid #334155" : "1px solid transparent",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
            boxShadow: savedMeta ? "none" : "0 4px 24px #3B82F644",
          }}
        >
          {savedMeta ? "Start New Deal" : "Start New Deal →"}
        </button>

        <div style={{ marginTop: 48, padding: "16px 24px", borderRadius: 8, background: "#1E293B", border: "1px solid #334155", textAlign: "left" }}>
          <div style={{ fontSize: 10, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>What happens when you submit</div>
          {[
            ["1", "Decision tree maps your 12 intake fields to relevant checklist items"],
            ["2", "Risk scanner runs 7 detection rules and surfaces critical flags"],
            ["3", "Milestone dates calculated from your target close date"],
            ["4", "Claude API ready to generate contextual guidance per checklist item"],
          ].map(([num, text]) => (
            <div key={num} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#3B82F6", minWidth: 16 }}>{num}</span>
              <span style={{ fontSize: 11, color: "#64748B" }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 10, color: "#334155" }}>
          M&A Integration Engine v0.1.0 · Phase 1 MVP · February 2026
        </div>
      </div>
    </div>
  );
}
