"use client";

import { useState, useCallback } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import type { DealIntake, GeneratedDeal, ItemStatus } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";

type NavItem = "dashboard" | "deal-setup" | "checklist" | "risks" | "timeline";
type AppState = "landing" | "intake" | "generating" | "dashboard";

const NAV_ITEMS: { id: NavItem; label: string; icon: React.ReactNode; section?: string }[] = [
  {
    section: "MAIN MENU",
    id: "dashboard",
    label: "Dashboard",
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
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: "checklist",
    label: "Checklist",
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
    label: "Risk Register",
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

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    setTimeout(() => {
      const generated = generateDeal(intake);
      setDeal(generated);
      setAppState("dashboard");
      setActiveNav("dashboard");
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

  function handleReset() {
    setDeal(null);
    setAppState("landing");
    setActiveNav("dashboard");
  }

  function handleNavClick(id: NavItem) {
    if (!deal && id !== "deal-setup") {
      // No deal yet — go to deal setup
      setActiveNav("deal-setup");
      setAppState("intake");
      return;
    }
    setActiveNav(id);
    if (id === "deal-setup") {
      if (!deal) setAppState("intake");
    }
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
              animation: "spin 2s linear infinite",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                  opacity: 0.4,
                  animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
                }} />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes spin { 0%,100%{transform:rotate(0deg)}50%{transform:rotate(10deg)} }
            @keyframes bounce { 0%,100%{opacity:0.4;transform:translateY(0)}50%{opacity:1;transform:translateY(-5px)} }
          `}</style>
        </div>
      );
    }

    if (activeNav === "deal-setup" || appState === "intake") {
      return (
        <div style={{ flex: 1, overflowY: "auto", background: "#f0f4f0" }}>
          <div style={{
            padding: "28px 32px 12px",
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Deal Setup</h1>
              <p style={{ fontSize: 13, color: "#6b7280" }}>Configure deal parameters to generate your integration plan</p>
            </div>
          </div>
          <div style={{ padding: "0 32px 32px" }}>
            <IntakeForm onSubmit={handleIntakeSubmit} />
          </div>
        </div>
      );
    }

    if (deal && appState === "dashboard") {
      return (
        <Dashboard
          deal={deal}
          activeTab={activeNav === "checklist" ? "checklist" : activeNav === "risks" ? "risks" : activeNav === "timeline" ? "timeline" : "overview"}
          onUpdateStatus={handleUpdateStatus}
          onReset={handleReset}
          onTabChange={(tab) => setActiveNav(tab as NavItem)}
        />
      );
    }

    // Landing / empty state
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f4f0" }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          {/* Empty state icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 18, margin: "0 auto 24px",
            background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Start a New Deal</h2>
          <p style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, marginBottom: 28 }}>
            Set up a deal to generate your integration plan — risk assessment, dynamic checklist, and AI guidance.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 28 }}>
            {["443-Item Checklist", "7-Category Risk Engine", "Claude AI Guidance", "12 Workstreams"].map((f) => (
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

  const pageTitle = (() => {
    if (activeNav === "deal-setup") return { title: "Deal Setup", sub: "Configure deal parameters" };
    if (activeNav === "checklist") return { title: "Checklist", sub: "Track integration tasks and completion status" };
    if (activeNav === "risks") return { title: "Risk Register", sub: "Monitor and mitigate deal risks" };
    if (activeNav === "timeline") return { title: "Timeline", sub: "Integration phases and milestone dates" };
    return { title: "Dashboard", sub: "Overview of your integration program" };
  })();

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      {/* ─── Sidebar ─── */}
      <aside style={{
        width: 240, flexShrink: 0, background: "#192819",
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #2a3f2a",
      }}>
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
            const sectionLabel = SECTION_LABELS[item.id];
            return (
              <div key={item.id}>
                {sectionLabel && (
                  <div style={{
                    padding: "14px 16px 6px",
                    fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
                    color: "#4a6b4a", textTransform: "uppercase",
                  }}>
                    {sectionLabel}
                  </div>
                )}
                <button
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 16px", border: "none", cursor: "pointer",
                    background: isActive ? "#2e4a2e" : "transparent",
                    color: isActive ? "#86efac" : "#9ab89a",
                    borderLeft: isActive ? "3px solid #22c55e" : "3px solid transparent",
                    fontSize: 13, fontWeight: isActive ? 600 : 400,
                    textAlign: "left", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#243824";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Bottom: New Deal button */}
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
            <div style={{ marginTop: 10, fontSize: 11, color: "#4a6b4a", textAlign: "center" }}>
              {deal.intake.dealName}
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top header bar (only when not in dashboard view) */}
        {!(deal && appState === "dashboard") && !(appState === "generating") && (
          <div style={{
            padding: "20px 32px 16px",
            background: "#f0f4f0",
            borderBottom: "1px solid #e2e8e2",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                {pageTitle.title}
              </h1>
              <p style={{ fontSize: 13, color: "#6b7280" }}>{pageTitle.sub}</p>
            </div>
            {!deal && activeNav !== "deal-setup" && (
              <button
                onClick={() => { setActiveNav("deal-setup"); setAppState("intake"); }}
                style={{
                  padding: "9px 18px", borderRadius: 7, border: "none",
                  background: "#22c55e", color: "#fff",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
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
    </div>
  );
}
