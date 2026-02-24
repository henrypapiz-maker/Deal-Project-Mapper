"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import WorkstreamView from "@/components/workstream/WorkstreamView";
import type { DealIntake, GeneratedDeal, ItemStatus, ChecklistItem, RagStatus } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";

const STORAGE_KEY = "dealMapper_savedDeal";

type NavItem = "dashboard" | "deal-setup" | "checklist" | "risks" | "timeline" | "workstreams";
type AppState = "landing" | "intake" | "generating" | "dashboard";

const NAV_ITEMS: {
  id: NavItem;
  label: string;
  icon: React.ReactNode;
  section?: string;
  requiresDeal?: boolean;
}[] = [
  {
    section: "MAIN MENU",
    id: "dashboard",
    label: "Dashboard",
    requiresDeal: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    id: "deal-setup",
    label: "Deal Setup",
    requiresDeal: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    id: "workstreams",
    label: "Workstreams",
    requiresDeal: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    ),
  },
  {
    id: "checklist",
    label: "Checklist",
    requiresDeal: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/>
        <polyline points="3 18 4 19 6 17"/>
      </svg>
    ),
  },
  {
    id: "risks",
    label: "Program Status",
    requiresDeal: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    section: "TOOLS",
    id: "timeline",
    label: "Timeline",
    requiresDeal: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
];

const SECTION_LABELS: Partial<Record<NavItem, string>> = {
  dashboard: "MAIN MENU",
  timeline: "TOOLS",
};

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [deal, setDeal] = useState<GeneratedDeal | null>(null);
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; color: string }[]>([]);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const toastId = useRef(0);

  // ── Restore saved deal on mount ──────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedDeal;
        // Ensure workstreamUpdates exists for deals saved before this field was added
        if (!parsed.workstreamUpdates) parsed.workstreamUpdates = {};
        setDeal(parsed);
        setAppState("dashboard");
        setActiveNav("dashboard");
        const savedAt = localStorage.getItem(STORAGE_KEY + "_ts");
        if (savedAt) setLastSaved(savedAt);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Auto-save whenever deal changes ──────────────────────────────────────
  useEffect(() => {
    if (!deal) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(deal));
      const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      localStorage.setItem(STORAGE_KEY + "_ts", ts);
      setLastSaved(ts);
    } catch { /* ignore quota errors */ }
  }, [deal]);

  const showToast = useCallback((msg: string, color = "#16a34a") => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, color }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    setTimeout(() => {
      const generated = generateDeal(intake);
      setDeal(generated);
      setAppState("dashboard");
      setActiveNav("dashboard");
    }, 1200);
  }

  // Generic item updater — handles status, notes, blockedReason, dependencies, and phase
  const handleUpdateItem = useCallback(
    (itemId: string, updates: Partial<Pick<ChecklistItem, "status" | "notes" | "blockedReason" | "dependencies" | "phase">>) => {
      setDeal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklistItems: prev.checklistItems.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item
          ),
        };
      });
    },
    []
  );

  // Add a brand-new custom checklist item
  const handleAddItem = useCallback(
    (newItem: Omit<ChecklistItem, "id">) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      setDeal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          checklistItems: [...prev.checklistItems, { ...newItem, id }],
        };
      });
    },
    []
  );

  // Workstream weekly status update handler
  const handleUpdateWorkstreamStatus = useCallback(
    (workstream: string, ragStatus: RagStatus, updateText: string) => {
      setDeal((prev) => {
        if (!prev) return prev;
        const ts = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        return {
          ...prev,
          workstreamUpdates: {
            ...prev.workstreamUpdates,
            [workstream]: { workstream, ragStatus, updateText, updatedAt: ts },
          },
        };
      });
    },
    []
  );

  // Kept for Dashboard backward-compat
  const handleUpdateStatus = useCallback((itemId: string, status: ItemStatus) => {
    handleUpdateItem(itemId, { status });
  }, [handleUpdateItem]);

  function handleReset() {
    if (deal && !window.confirm("Start a new deal? Your current deal plan will be cleared.")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY + "_ts");
    setDeal(null);
    setLastSaved(null);
    setAppState("landing");
    setActiveNav("dashboard");
  }

  function handleNavClick(id: NavItem) {
    if (id === "deal-setup") {
      setActiveNav("deal-setup");
      if (!deal) setAppState("intake");
      return;
    }
    if (!deal) {
      setActiveNav("deal-setup");
      setAppState("intake");
      return;
    }
    setActiveNav(id);
    if (appState !== "dashboard") setAppState("dashboard");
  }

  function renderContent() {
    if (appState === "generating") {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f0" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, margin: "0 auto 20px",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, color: "#fff",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: "spin 1.5s linear infinite" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
              Generating Deal Plan…
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", maxWidth: 340 }}>
              Running decision tree · Scanning for risks · Configuring 443-item checklist
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 6, justifyContent: "center" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
                  animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes bounce { 0%,100%{opacity:0.4;transform:translateY(0)}50%{opacity:1;transform:translateY(-5px)} }
          `}</style>
        </div>
      );
    }

    if (activeNav === "deal-setup" || appState === "intake") {
      return (
        <div style={{ flex: 1, overflowY: "auto", background: "#f0f4f0" }}>
          <div style={{ padding: "28px 32px 12px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Deal Setup</h1>
            <p style={{ fontSize: 13, color: "#6b7280" }}>Configure deal parameters to generate your integration plan</p>
          </div>
          <div style={{ padding: "0 32px 32px" }}>
            <IntakeForm onSubmit={handleIntakeSubmit} />
          </div>
        </div>
      );
    }

    if (deal && appState === "dashboard") {
      // Workstream view
      if (activeNav === "workstreams") {
        return (
          <WorkstreamView
            deal={deal}
            onUpdateItem={handleUpdateItem}
            onUpdateWorkstreamStatus={handleUpdateWorkstreamStatus}
            onAddItem={handleAddItem}
            onToast={showToast}
          />
        );
      }

      // Dashboard tabs
      const dashTab = (activeNav === "checklist" || activeNav === "risks" || activeNav === "timeline")
        ? activeNav
        : "overview";

      return (
        <Dashboard
          deal={deal}
          activeTab={dashTab as "overview" | "checklist" | "risks" | "timeline"}
          onUpdateStatus={handleUpdateStatus}
          onUpdateItem={handleUpdateItem}
          onAddItem={handleAddItem}
          onReset={handleReset}
          onTabChange={(tab) => {
            const nav = tab as NavItem;
            setActiveNav(nav);
          }}
          onToast={showToast}
        />
      );
    }

    // Landing / empty state
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f0" }}>
        <div style={{ textAlign: "center", maxWidth: 440 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18, margin: "0 auto 24px",
            background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>M&A Integration Engine</h2>
          <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 28 }}>
            Configure a deal to generate your integration plan — risk assessment, 443-item dynamic checklist,
            workstream drill-down, and AI guidance.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
            {["443-Item Checklist", "7-Category Risk Engine", "12 Workstreams", "Dependency Tracking", "Claude AI Guidance"].map((f) => (
              <span key={f} style={{
                padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: "#e8f5e9", color: "#16a34a", border: "1px solid #bbf7d0",
              }}>{f}</span>
            ))}
          </div>
          <button
            onClick={() => { setActiveNav("deal-setup"); setAppState("intake"); }}
            style={{
              padding: "12px 28px", borderRadius: 8, border: "none",
              background: "#22c55e", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            + New Deal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 199 }} />
      )}

      {/* ─── Sidebar ─── */}
      <aside
        className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
        style={{
          width: 240, flexShrink: 0, background: "#192819",
          display: "flex", flexDirection: "column",
          borderRight: "1px solid #2a3f2a",
        }}
      >
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #2a3f2a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f0fdf4", letterSpacing: 0.2 }}>DealMapper</div>
              <div style={{ fontSize: 9, color: "#6b9a6b", letterSpacing: 1, textTransform: "uppercase" }}>M&A Intelligence</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.id;
            const isDisabled = item.requiresDeal && !deal;
            const sectionLabel = SECTION_LABELS[item.id];
            return (
              <div key={item.id}>
                {sectionLabel && (
                  <div style={{
                    padding: "14px 16px 6px",
                    fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
                    color: "#6b9a6b", textTransform: "uppercase",
                  }}>
                    {sectionLabel}
                  </div>
                )}
                <button
                  onClick={() => { handleNavClick(item.id); setSidebarOpen(false); }}
                  aria-label={item.label}
                  disabled={isDisabled}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 16px", border: "none", cursor: isDisabled ? "not-allowed" : "pointer",
                    background: isActive ? "#2e4a2e" : "transparent",
                    color: isDisabled ? "#3a5a3a" : isActive ? "#86efac" : "#b8d4b8",
                    borderLeft: isActive ? "3px solid #22c55e" : "3px solid transparent",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    textAlign: "left", transition: "all 0.15s", opacity: isDisabled ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isDisabled) (e.currentTarget as HTMLButtonElement).style.background = "#243824";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                  {item.id === "workstreams" && deal && (
                    <span style={{ marginLeft: "auto", fontSize: 9, color: "#6b9a6b", background: "#243824", padding: "1px 5px", borderRadius: 3 }}>NEW</span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a3f2a" }}>
          <button
            onClick={() => { setActiveNav("deal-setup"); setAppState("intake"); }}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 7, border: "none",
              background: "#22c55e", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            + New Deal
          </button>
          {deal && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#6b9a6b", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {deal.intake.dealName}
            </div>
          )}
          {lastSaved && (
            <div style={{ marginTop: 6, fontSize: 10, color: "#4a7a4a", textAlign: "center" }}>
              ✓ Saved {lastSaved}
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar (non-dashboard views) */}
        {!(deal && appState === "dashboard" && activeNav !== "deal-setup") && appState !== "generating" && (
          <div style={{
            padding: "20px 32px 16px",
            background: "#f0f4f0",
            borderBottom: "1px solid #e2e8e2",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <button
              className="hamburger"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Open navigation"
              style={{
                display: "none", alignItems: "center", justifyContent: "center",
                width: 36, height: 36, borderRadius: 6, border: "1px solid #e2e8e2",
                background: "#fff", cursor: "pointer", marginRight: 12, flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                {activeNav === "deal-setup" ? "Deal Setup" : "DealMapper"}
              </h1>
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                {activeNav === "deal-setup" ? "Configure deal parameters" : "M&A Integration Engine"}
              </p>
            </div>
            {!deal && activeNav !== "deal-setup" && (
              <button
                onClick={() => { setActiveNav("deal-setup"); setAppState("intake"); }}
                style={{ padding: "9px 18px", borderRadius: 7, border: "none", background: "#22c55e", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                + New Deal
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {renderContent()}
        </div>
      </main>

      {/* ─── Toast notifications ─── */}
      <div style={{
        position: "fixed", bottom: 20, right: 20,
        display: "flex", flexDirection: "column", gap: 8, zIndex: 1000,
        pointerEvents: "none",
      }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: "10px 16px", borderRadius: 8,
            background: "#fff", border: `1px solid ${t.color}`,
            borderLeft: `4px solid ${t.color}`,
            color: t.color, fontSize: 13, fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            animation: "toastSlideIn 0.25s ease-out",
            whiteSpace: "nowrap",
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
