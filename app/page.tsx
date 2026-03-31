"use client";

import { useState, useCallback, useEffect } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import type { DealIntake, GeneratedDeal, ItemStatus, Priority, ChecklistItem, Person } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";
import { saveDeal, loadDeal, clearDeal, hasSavedDeal } from "@/lib/persistence";

type AppState = "landing" | "intake" | "generating" | "dashboard";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [deal, setDeal] = useState<GeneratedDeal | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Auto-save whenever deal changes
  useEffect(() => {
    if (deal) saveDeal(deal);
  }, [deal]);

  // Check for saved deal on mount
  useEffect(() => {
    setHasSaved(typeof window !== "undefined" && hasSavedDeal());
  }, []);

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    setTimeout(() => {
      const generated = generateDeal(intake);
      setDeal(generated);
      setAppState("dashboard");
    }, 1200);
  }

  const handleUpdateStatus = useCallback((itemId: string, status: ItemStatus) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, status } : item
        ),
      };
    });
  }, []);

  const handleUpdatePriority = useCallback((itemId: string, priority: Priority) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId
            ? { ...item, priority, priorityOverride: priority }
            : item
        ),
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

  const handleAddTask = useCallback((task: { workstream: string; description: string; phase: string; priority: string; section: string }) => {
    setDeal((prev) => {
      if (!prev) return prev;
      const itemCount = prev.checklistItems.length;
      const newItem: ChecklistItem = {
        id: `custom-${Date.now()}`,
        itemId: `CUST-${String(itemCount + 1).padStart(4, "0")}`,
        workstream: task.workstream as any,
        section: task.section,
        description: task.description,
        phase: task.phase as any,
        priority: task.priority as any,
        status: "not_started",
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
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, ownerId } : item
        ),
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
    return <Dashboard deal={deal} onUpdateStatus={handleUpdateStatus} onUpdatePriority={handleUpdatePriority} onUpdateBlockedReason={handleUpdateBlockedReason} onReset={handleReset} onAddTask={handleAddTask} onAddPerson={handleAddPerson} onAssignOwner={handleAssignOwner} onAddNote={handleAddNote} onAddAttachment={handleAddAttachment} onSaveSnapshot={handleSaveSnapshot} onUpdateNarrative={handleUpdateNarrative} onSaveFilter={handleSaveFilter} onDeleteFilter={handleDeleteFilter} />;
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
            { label: "530-Item Checklist", icon: "\u2610" },
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
        {hasSaved && (
          <button onClick={() => {
            const saved = loadDeal();
            if (saved) { setDeal(saved); setAppState("dashboard"); }
          }} style={{
            display: "block", margin: "12px auto 0", padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "transparent", color: "#3B82F6",
            border: "1px solid rgba(59, 130, 246, 0.4)", cursor: "pointer", fontFamily: "inherit",
          }}>
            Resume Previous Deal
          </button>
        )}

        <div style={{
          marginTop: 56, padding: "20px 28px", borderRadius: 12,
          background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(51, 65, 85, 0.5)",
          textAlign: "left",
        }}>
          <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontWeight: 600 }}>How it works</div>
          {[
            ["01", "Decision tree maps 13 intake fields across 3 tiers to 530 checklist items"],
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
          DealMapper v0.4.0 · M&A Integration Engine · March 2026
        </div>
      </div>
    </div>
  );
}
