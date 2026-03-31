"use client";

import { useState } from "react";
import type { GeneratedDeal, ChecklistItem, RiskAlert, ItemStatus, Priority } from "@/lib/types";
import { getKpis, getWorkstreamStats } from "@/lib/decision-tree";

const C = {
  navy: "#0F1B2D",
  deepBlue: "#1B2A4A",
  accent: "#3B82F6",
  accentLight: "#60A5FA",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  muted: "#64748B",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
};

const STRUCTURE_LABELS: Record<string, string> = {
  stock_purchase: "Stock Purchase",
  asset_purchase: "Asset Purchase",
  merger_forward: "Forward Merger",
  merger_reverse: "Reverse Triangular Merger",
  carve_out: "Carve-Out",
  f_reorg: "F-Reorganization",
};

const MODEL_LABELS: Record<string, string> = {
  fully_integrated: "Fully Integrated",
  hybrid: "Hybrid",
  standalone: "Standalone",
};

const RISK_LABELS: Record<string, string> = {
  regulatory_delay: "Regulatory Delay",
  tax_structure_leakage: "Tax Structure Leakage",
  tsa_dependency: "TSA Dependency",
  data_privacy_breach: "Data Privacy Breach",
  cultural_integration: "Cultural Integration",
  financial_reporting_gap: "Financial Reporting Gap",
  stranded_costs: "Stranded Costs",
  it_integration_risk: "IT Integration Risk",
};

const SCOPE_LABELS: Record<string, string> = {
  finance: "Finance",
  it: "IT",
  hr: "HR",
  legal: "Legal",
  tax: "Tax",
  treasury: "Treasury",
  cybersecurity: "Cybersecurity",
  esg: "ESG",
  facilities: "Facilities",
  operations: "Operations",
  all: "All Functions",
};

const PHASE_LABELS: Record<string, string> = {
  pre_close: "Pre-Close",
  day_1: "Day 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  year_1: "Year 1",
};

interface Props {
  deal: GeneratedDeal;
  onUpdateStatus: (itemId: string, status: ItemStatus) => void;
  onUpdatePriority: (itemId: string, priority: Priority) => void;
  onUpdateBlockedReason: (itemId: string, reason: string) => void;
  onReset: () => void;
  onAddTask: (task: {
    workstream: string;
    description: string;
    phase: string;
    priority: string;
    section: string;
  }) => void;
  onAddPerson: (name: string, role?: string) => void;
  onAssignOwner: (itemId: string, ownerId: string | undefined) => void;
}

export default function Dashboard({
  deal,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateBlockedReason,
  onReset,
  onAddTask,
  onAddPerson,
  onAssignOwner,
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "risks" | "timeline">("overview");
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [guidanceText, setGuidanceText] = useState<string>("");
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterWs, setFilterWs] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskWs, setNewTaskWs] = useState<string>("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState<string>("day_30");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [showSteerCo, setShowSteerCo] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNaItems, setShowNaItems] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [filterOwner, setFilterOwner] = useState<string>("all");

  function computeRAG(stats: { complete: number; blocked: number; total: number }): "red" | "amber" | "green" {
    if (stats.blocked > 0 && stats.blocked >= stats.total * 0.1) return "red";
    if (stats.blocked > 0) return "amber";
    const pct = stats.total ? stats.complete / stats.total : 0;
    if (pct >= 0.7) return "green";
    if (pct >= 0.3) return "amber";
    return "red";
  }

  const { intake, checklistItems, riskAlerts, milestones } = deal;
  const kpis = getKpis(checklistItems);
  const wsStats = getWorkstreamStats(checklistItems);

  async function fetchGuidance(item: ChecklistItem) {
    setSelectedItem(item);
    setGuidanceText("");
    setGuidanceLoading(true);
    try {
      const res = await fetch("/api/ai-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.itemId,
          description: item.description,
          workstream: item.workstream,
          status: item.status,
          blockedReason: item.blockedReason,
          dealContext: {
            dealStructure: intake.dealStructure,
            integrationModel: intake.integrationModel,
            crossBorder: intake.crossBorder,
            jurisdictions: intake.jurisdictions,
            tsaRequired: intake.tsaRequired,
            industrySector: intake.industrySector,
            targetGaap: intake.targetGaap,
          },
        }),
      });
      const data = await res.json();
      setGuidanceText(data.guidance || "No guidance available.");
    } catch {
      setGuidanceText("AI guidance temporarily unavailable. Please try again.");
    }
    setGuidanceLoading(false);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Compute overdue status for each item
  const isItemOverdue = (item: ChecklistItem) =>
    item.milestoneDate && item.milestoneDate < todayStr && item.status !== "complete" && item.status !== "na";

  const overdueCount = checklistItems.filter(i => i.status !== "na" && isItemOverdue(i)).length;

  // Dependency lookup: itemId → ChecklistItem
  const itemByItemId = new Map(checklistItems.map(i => [i.itemId, i]));

  // Compute dependency warnings: items whose upstream deps are blocked
  const blockedItemIds = new Set(checklistItems.filter(i => i.status === "blocked").map(i => i.itemId));
  const dependencyWarnings = new Map<string, string[]>();
  checklistItems.forEach(item => {
    const blockedDeps = item.dependencies.filter(d => blockedItemIds.has(d));
    if (blockedDeps.length > 0) dependencyWarnings.set(item.id, blockedDeps);
  });

  const visibleItems = checklistItems.filter((item) => {
    if (item.status === "na" && !showNaItems) return false;
    if (filterPhase !== "all" && item.phase !== filterPhase) return false;
    if (filterWs !== "all" && item.workstream !== filterWs) return false;
    if (filterPriority !== "all" && item.priority !== filterPriority) return false;
    if (filterStatus !== "all") {
      if (filterStatus === "overdue") {
        if (!isItemOverdue(item)) return false;
      } else {
        if (item.status !== filterStatus) return false;
      }
    }
    if (filterOwner !== "all") {
      if (filterOwner === "unassigned") {
        if (item.ownerId) return false;
      } else {
        if (item.ownerId !== filterOwner) return false;
      }
    }
    return true;
  });

  const today = new Date();
  const closeDate = intake.closeDate ? new Date(intake.closeDate) : null;

  return (
    <div style={{
      background: `linear-gradient(160deg, #0C1222 0%, #162036 40%, ${C.navy} 100%)`,
      color: C.text, minHeight: "100vh",
    }}>
      {/* Top Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px", borderBottom: `1px solid rgba(51, 65, 85, 0.5)`,
        background: "rgba(12, 18, 34, 0.85)", backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg, #2563EB, ${C.accent}, ${C.accentLight})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff", letterSpacing: -0.5,
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          }}>DM</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: -0.2, color: "#F8FAFC" }}>
              DealMapper
            </div>
            <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 400 }}>
              {intake.dealName} — {STRUCTURE_LABELS[intake.dealStructure]} · {MODEL_LABELS[intake.integrationModel]}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, alignItems: "center", background: "rgba(30, 41, 59, 0.5)", borderRadius: 8, padding: 3 }}>
          {(["overview", "checklist", "risks", "timeline"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: activeTab === tab ? C.accent : "transparent",
              color: activeTab === tab ? "#fff" : C.textMuted,
              fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: "capitalize",
              transition: "all 0.15s ease",
            }}>{tab}</button>
          ))}
          <button onClick={() => { if (window.confirm("Starting a new deal will discard all current progress. Continue?")) onReset(); }} style={{
            marginLeft: 8, padding: "6px 14px", borderRadius: 6,
            border: `1px solid rgba(51, 65, 85, 0.5)`, background: "transparent",
            color: C.textMuted, fontSize: 11, cursor: "pointer", fontWeight: 500,
          }}>\u2190 New Deal</button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Deal Context Bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12,
          padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`,
          marginBottom: 20
        }}>
          {[
            ["Structure", STRUCTURE_LABELS[intake.dealStructure]],
            ["Model", MODEL_LABELS[intake.integrationModel]],
            ["Close Date", intake.closeDate || "TBD"],
            ["Cross-Border", intake.crossBorder ? intake.jurisdictions.join(", ") : "Domestic"],
            ["TSA", intake.tsaRequired.toUpperCase()],
            ["Sector", intake.industrySector || "—"],
            ["Value", intake.dealValueRange || "—"],
            ["Entities", String(intake.targetEntities)],
            ["Scope", intake.functionalScope?.includes("all") ? "All Functions" : (intake.functionalScope?.map(s => SCOPE_LABELS[s] || s).join(", ") || "All Functions")],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{val}</div>
            </div>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Overall Progress", value: `${kpis.pctComplete}%`, sub: `${kpis.complete} of ${kpis.total} items`, color: C.accent, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("all"); } },
                { label: "In Progress", value: kpis.inProgress, sub: "items actively being worked", color: C.accentLight, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("in_progress"); } },
                { label: "Blocked Items", value: kpis.blocked, sub: "require escalation", color: kpis.blocked > 3 ? C.danger : C.warning, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("blocked"); } },
                { label: "Overdue", value: overdueCount, sub: "past milestone date", color: overdueCount > 0 ? C.danger : C.success, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("overdue"); } },
                { label: "Active Risks", value: riskAlerts.filter(r => r.status === "open").length, sub: `${riskAlerts.filter(r => r.severity === "critical").length} critical`, color: C.danger, click: () => { setActiveTab("risks"); } },
              ].map((kpi, i) => (
                <div key={i} onClick={kpi.click} style={{
                  padding: 16, borderRadius: 8, background: C.cardBg,
                  border: `1px solid ${C.border}`, borderLeft: `3px solid ${kpi.color}`,
                  cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.deepBlue)}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.cardBg)}
                >
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <button onClick={() => setShowSteerCo(true)} style={{
                padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                background: C.accent + "22", color: C.accent, border: `1px solid ${C.accent}44`,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                SteerCo Summary
              </button>
            </div>

            {showSteerCo && (
              <div id="steerco-print" style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
              }} onClick={() => setShowSteerCo(false)}>
                <div onClick={(e) => e.stopPropagation()} style={{
                  background: "#fff", color: "#1E293B", borderRadius: 12, padding: 32, maxWidth: 700, width: "90%",
                  maxHeight: "80vh", overflowY: "auto",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Integration Status — SteerCo Summary</h2>
                    <button onClick={() => window.print()} style={{
                      padding: "6px 16px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: "#3B82F6", color: "#fff", border: "none", cursor: "pointer",
                    }}>Print / Export PDF</button>
                  </div>
                  <div style={{ fontSize: 10, color: "#64748B", marginBottom: 16 }}>
                    Deal: {intake.dealName} · Generated: {new Date(deal.generatedAt).toLocaleDateString()} · Close: {intake.closeDate}
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                        <th style={{ textAlign: "left", padding: 8 }}>Workstream</th>
                        <th style={{ textAlign: "center", padding: 8 }}>RAG</th>
                        <th style={{ textAlign: "center", padding: 8 }}>Complete</th>
                        <th style={{ textAlign: "center", padding: 8 }}>In Progress</th>
                        <th style={{ textAlign: "center", padding: 8 }}>Blocked</th>
                        <th style={{ textAlign: "center", padding: 8 }}>% Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(wsStats.entries()).map(([ws, stats]) => {
                        const rag = computeRAG(stats);
                        const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
                        const ragColor = rag === "red" ? "#EF4444" : rag === "amber" ? "#F59E0B" : "#22C55E";
                        return (
                          <tr key={ws} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: 8, fontWeight: 500 }}>{ws}</td>
                            <td style={{ padding: 8, textAlign: "center" }}>
                              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: ragColor }} />
                            </td>
                            <td style={{ padding: 8, textAlign: "center", color: "#22C55E" }}>{stats.complete}</td>
                            <td style={{ padding: 8, textAlign: "center", color: "#3B82F6" }}>{stats.inProgress}</td>
                            <td style={{ padding: 8, textAlign: "center", color: stats.blocked > 0 ? "#EF4444" : "#94A3B8" }}>{stats.blocked}</td>
                            <td style={{ padding: 8, textAlign: "center", fontWeight: 700 }}>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 16, fontSize: 9, color: "#94A3B8", textAlign: "center" }}>
                    DealMapper v0.3.0 · {checklistItems.filter(i => i.status !== "na").length} active items · Exported {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
              {/* Workstream Progress */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                  Workstream Progress
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from(wsStats.entries()).map(([ws, stats]) => {
                    const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
                    const color = stats.blocked > 0 ? C.warning : pct > 50 ? C.success : C.accent;
                    const isSelected = selectedWs === ws;
                    return (
                      <div key={ws} onClick={() => setSelectedWs(isSelected ? null : ws)}
                        style={{
                          cursor: "pointer", padding: "8px 10px", borderRadius: 6,
                          background: isSelected ? C.deepBlue : "transparent",
                          border: `1px solid ${isSelected ? C.accent + "44" : "transparent"}`,
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{ws}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {stats.blocked > 0 && (
                              <span style={{ fontSize: 9, color: C.danger, fontWeight: 700 }}>{stats.blocked} blocked</span>
                            )}
                            <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ width: "100%", height: 5, background: C.deepBlue, borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                        {isSelected && (
                          <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: C.textMuted }}>
                            <span style={{ color: C.success }}>✓ {stats.complete} done</span>
                            <span style={{ color: C.accent }}>→ {stats.inProgress} active</span>
                            <span style={{ color: C.danger }}>✕ {stats.blocked} blocked</span>
                            <span>○ {stats.notStarted} pending</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk + Milestones Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Risk Register */}
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                    Risk Register — {riskAlerts.length} Active
                  </div>
                  {riskAlerts.length === 0 ? (
                    <div style={{ fontSize: 11, color: C.success, padding: 8 }}>✓ No material risks detected for this deal profile</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {riskAlerts.map((r) => (
                        <RiskCard key={r.id} risk={r} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestones */}
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                    Milestones
                  </div>
                  {milestones.map((ms, i) => {
                    const msDate = new Date(ms.date);
                    const daysOut = closeDate
                      ? Math.round((msDate.getTime() - today.getTime()) / 86400000)
                      : ms.daysFromClose;
                    const isPast = daysOut < 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: isPast ? C.success : daysOut < 30 ? C.warning : C.muted,
                          boxShadow: !isPast && daysOut < 30 ? `0 0 8px ${C.warning}66` : "none",
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{ms.label}</div>
                          <div style={{ fontSize: 9, color: C.textMuted }}>{ms.date}</div>
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                          background: isPast ? C.success + "22" : daysOut < 30 ? C.warning + "22" : C.cardBg,
                          color: isPast ? C.success : daysOut < 30 ? C.warning : C.textMuted,
                        }}>
                          {isPast ? "Done" : `${daysOut}d`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── CHECKLIST TAB ─── */}
        {activeTab === "checklist" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Phase </span>
                <select
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}
                >
                  <option value="all">All Phases</option>
                  {["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"].map(p => (
                    <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Workstream </span>
                <select value={filterWs} onChange={(e) => setFilterWs(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}>
                  <option value="all">All Workstreams</option>
                  <optgroup label="Finance">
                    {["TSA", "Technical Accounting", "Financial Reporting & Consolidation", "FP&A", "Operational Finance", "Income Tax", "Treasury"]
                      .filter(ws => wsStats.has(ws)).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                  </optgroup>
                  <optgroup label="Controls & Governance">
                    {["Controls", "Governance & Compliance"]
                      .filter(ws => wsStats.has(ws)).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                  </optgroup>
                  <optgroup label="IT">
                    {["IT Strategy & Governance", "IT > Enterprise Systems", "IT > Infrastructure", "IT > Data & Analytics", "IT > IT Vendor Management", "IT > Client-Facing & Digital"]
                      .filter(ws => wsStats.has(ws)).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                  </optgroup>
                  <optgroup label="Other">
                    {["ESG", "Integration Management", "Facilities", "Human Resources", "Legal", "Communications"]
                      .filter(ws => wsStats.has(ws)).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Priority </span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Status </span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="complete">Complete</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Owner </span>
                <select value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}>
                  <option value="all">All Owners</option>
                  <option value="unassigned">Unassigned</option>
                  {deal.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted, alignSelf: "center" }}>
                {visibleItems.length} items shown{overdueCount > 0 && <span style={{ color: C.danger, marginLeft: 8 }}>{overdueCount} overdue</span>}
              </div>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                style={{
                  padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: showAddTask ? C.danger + "22" : C.accent + "22",
                  color: showAddTask ? C.danger : C.accent,
                  border: `1px solid ${showAddTask ? C.danger + "44" : C.accent + "44"}`,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {showAddTask ? "Cancel" : "+ New Task"}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.textMuted, cursor: "pointer" }}>
                <input type="checkbox" checked={showNaItems} onChange={(e) => setShowNaItems(e.target.checked)} />
                Show N/A
              </label>
            </div>

            {showAddTask && (
              <div style={{
                padding: 12, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.accent}44`,
                marginBottom: 12, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Workstream</div>
                  <select value={newTaskWs} onChange={(e) => setNewTaskWs(e.target.value)}
                    style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit", minWidth: 160 }}>
                    <option value="">Select...</option>
                    {Array.from(wsStats.keys()).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Description</div>
                  <input type="text" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Describe the task..."
                    style={{ width: "100%", padding: "4px 8px", borderRadius: 4, fontSize: 10, background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, fontFamily: "inherit" }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Phase</div>
                  <select value={newTaskPhase} onChange={(e) => setNewTaskPhase(e.target.value)}
                    style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}>
                    {["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"].map(p => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Priority</div>
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}
                    style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!newTaskWs || !newTaskDesc.trim()) return;
                    onAddTask({ workstream: newTaskWs, description: newTaskDesc.trim(), phase: newTaskPhase, priority: newTaskPriority, section: "Custom" });
                    setNewTaskDesc("");
                    setShowAddTask(false);
                  }}
                  disabled={!newTaskWs || !newTaskDesc.trim()}
                  style={{
                    padding: "6px 16px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: (!newTaskWs || !newTaskDesc.trim()) ? C.muted : C.accent,
                    color: "#fff", border: "none", cursor: (!newTaskWs || !newTaskDesc.trim()) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Add Task
                </button>
              </div>
            )}

            {/* Team Roster — empty state prompt */}
            {deal.people.length === 0 && activeTab === "checklist" && !showAddTask && (
              <div style={{ padding: 8, borderRadius: 6, background: C.accent + "11", border: `1px dashed ${C.accent}44`, marginBottom: 12, fontSize: 10, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                <span>No team members yet.</span>
                <input type="text" placeholder="Name" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                  style={{ padding: "3px 6px", borderRadius: 3, fontSize: 10, background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, fontFamily: "inherit", width: 120 }} />
                <input type="text" placeholder="Role (optional)" value={newPersonRole} onChange={(e) => setNewPersonRole(e.target.value)}
                  style={{ padding: "3px 6px", borderRadius: 3, fontSize: 10, background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, fontFamily: "inherit", width: 100 }} />
                <button onClick={() => { if (newPersonName.trim()) { onAddPerson(newPersonName.trim(), newPersonRole.trim() || undefined); setNewPersonName(""); setNewPersonRole(""); } }}
                  disabled={!newPersonName.trim()}
                  style={{ padding: "3px 10px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: C.accent, color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  + Add
                </button>
              </div>
            )}

            {/* Team Roster — existing members */}
            {deal.people.length > 0 && activeTab === "checklist" && (
              <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Team: </span>
                {deal.people.map(p => (
                  <span key={p.id} style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: C.accent + "22", color: C.accent }}>
                    {p.name}{p.role ? ` (${p.role})` : ""}
                  </span>
                ))}
                <input type="text" placeholder="+ Add person" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newPersonName.trim()) { onAddPerson(newPersonName.trim()); setNewPersonName(""); } }}
                  style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, background: "transparent", color: C.text, border: `1px solid ${C.border}44`, fontFamily: "inherit", width: 100 }} />
              </div>
            )}

            {selectedIds.size > 0 && (
              <div style={{
                padding: "8px 12px", borderRadius: 6, background: C.accent + "22", border: `1px solid ${C.accent}44`,
                marginBottom: 8, display: "flex", alignItems: "center", gap: 10, fontSize: 10,
              }}>
                <span style={{ fontWeight: 700, color: C.accent }}>{selectedIds.size} selected</span>
                <select
                  onChange={(e) => {
                    const status = e.target.value;
                    if (!status) return;
                    selectedIds.forEach(id => onUpdateStatus(id, status as any));
                    setSelectedIds(new Set());
                    e.target.value = "";
                  }}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 10, fontFamily: "inherit" }}
                >
                  <option value="">Set Status...</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="complete">Complete</option>
                </select>
                <button onClick={() => setSelectedIds(new Set())} style={{
                  padding: "3px 8px", borderRadius: 3, fontSize: 9, background: "transparent",
                  color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "inherit",
                }}>Clear</button>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 340px" : "1fr", gap: 16 }}>
              {/* Table */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      <th style={{ padding: "6px", width: 24 }}>
                        <input type="checkbox"
                          checked={visibleItems.length > 0 && visibleItems.every(i => selectedIds.has(i.id))}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(new Set(visibleItems.map(i => i.id)));
                            else setSelectedIds(new Set());
                          }}
                          style={{ cursor: "pointer" }}
                        />
                      </th>
                      {["ID", "Workstream", "Task", "Phase", "Priority", "Status", "Owner", ""].map((h) => (
                        <th key={h} style={{ padding: "6px", textAlign: "left", color: C.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const statusColor = item.status === "complete" ? C.success : item.status === "in_progress" ? C.accent : item.status === "blocked" ? C.danger : C.muted;
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => fetchGuidance(item)}
                          style={{
                            borderBottom: `1px solid ${C.border}22`,
                            background: isSelected ? C.deepBlue : "transparent",
                            cursor: "pointer",
                            opacity: item.status === "na" ? 0.4 : 1,
                          }}
                        >
                          <td style={{ padding: "6px", width: 24 }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(item.id)}
                              onChange={(e) => {
                                const next = new Set(selectedIds);
                                if (e.target.checked) next.add(item.id); else next.delete(item.id);
                                setSelectedIds(next);
                              }}
                              style={{ cursor: "pointer" }}
                            />
                          </td>
                          <td style={{ padding: "6px", fontWeight: 700, color: C.accent, whiteSpace: "nowrap" }}>{item.itemId}</td>
                          <td title={item.workstream} style={{ padding: "6px", color: C.textMuted, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{item.workstream.split(" ")[0]}</td>
                          <td style={{ padding: "6px", maxWidth: 320 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                            {item.dependencies.length > 0 && (
                              <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                                {item.dependencies.slice(0, 5).map(depId => {
                                  const depItem = itemByItemId.get(depId);
                                  const depStatus = depItem?.status || "not_started";
                                  const chipColor = depStatus === "complete" ? "#22C55E" : depStatus === "in_progress" ? "#3B82F6" : depStatus === "blocked" ? "#EF4444" : "#64748B";
                                  return (
                                    <span key={depId} title={depItem ? `${depId}: ${depItem.description} (${depStatus})` : depId} style={{
                                      fontSize: 8, padding: "1px 4px", borderRadius: 2,
                                      background: chipColor + "22", color: chipColor, fontWeight: 600,
                                      cursor: "default",
                                    }}>
                                      {depId} <span style={{ fontSize: 7 }}>{depStatus === "complete" ? "\u2713" : depStatus === "blocked" ? "\u2717" : "\u25CF"}</span>
                                    </span>
                                  );
                                })}
                                {item.dependencies.length > 5 && (
                                  <span style={{ fontSize: 8, color: "#64748B" }}>+{item.dependencies.length - 5} more</span>
                                )}
                              </div>
                            )}
                            {dependencyWarnings.has(item.id) && (
                              <div style={{ fontSize: 8, color: "#EF4444", marginTop: 2, fontWeight: 600 }}>
                                &#x26A0; Blocked by: {dependencyWarnings.get(item.id)!.join(", ")}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "6px" }}>
                            <span style={{ padding: "1px 6px", borderRadius: 3, background: item.phase === "day_1" ? C.warning + "22" : C.cardBg, color: item.phase === "day_1" ? C.warning : C.textMuted, fontSize: 9 }}>
                              {PHASE_LABELS[item.phase]}
                            </span>
                            {isItemOverdue(item) && (
                              <span style={{ marginLeft: 4, padding: "1px 4px", borderRadius: 3, background: C.danger + "22", color: C.danger, fontSize: 8, fontWeight: 700 }} title={`Due: ${item.milestoneDate}`}>
                                OVERDUE
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "6px" }}>
                            <select
                              value={item.priority}
                              onChange={(e) => {
                                e.stopPropagation();
                                onUpdatePriority(item.id, e.target.value as Priority);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: "transparent", border: "none", borderBottom: "1px dashed currentColor",
                                color: item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.textMuted,
                                fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
                              }}
                            >
                              <option value="critical">Critical</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                            {item.priorityOverride && (
                              <span style={{ color: C.accent, fontSize: 8, marginLeft: 2 }} title="Priority manually overridden">*</span>
                            )}
                          </td>
                          <td style={{ padding: "6px" }}>
                            <select
                              value={item.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(item.id, e.target.value as ItemStatus);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: "transparent", border: "none", borderBottom: "1px dashed currentColor",
                                color: statusColor, fontSize: 9, fontWeight: 700,
                                cursor: "pointer", fontFamily: "inherit", textTransform: "uppercase",
                              }}
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="complete">Complete</option>
                            </select>
                          </td>
                          <td style={{ padding: "6px", minWidth: 90 }}>
                            <select
                              value={item.ownerId || ""}
                              onChange={(e) => { e.stopPropagation(); onAssignOwner(item.id, e.target.value || undefined); }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ background: "transparent", border: "none", color: item.ownerId ? C.accent : C.muted, fontSize: 9, cursor: "pointer", fontFamily: "inherit", maxWidth: 85 }}
                            >
                              <option value="">—</option>
                              {deal.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: "6px" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); fetchGuidance(item); }}
                              style={{ background: "transparent", border: "none", color: C.accent, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}
                            >
                              AI →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {visibleItems.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 11 }}>
                    No items match the current filters. Try adjusting Phase, Workstream, Priority, or Status.
                  </div>
                )}
              </div>

              {/* AI Guidance Panel */}
              {selectedItem && (
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.accent}33`, position: "sticky", top: 80, maxHeight: "80vh", overflowY: "auto" }}>
                  <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    AI Guidance
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{selectedItem.itemId}</div>
                  <div style={{ fontSize: 11, color: C.text, marginBottom: 12, lineHeight: 1.5 }}>{selectedItem.description}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.accent + "22", color: C.accent }}>{selectedItem.workstream}</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.warning + "22", color: C.warning }}>{PHASE_LABELS[selectedItem.phase]}</span>
                  </div>
                  {selectedItem && selectedItem.status === "blocked" && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Blocked Reason</div>
                      <input
                        type="text"
                        placeholder="Why is this item blocked?"
                        value={selectedItem.blockedReason || ""}
                        onChange={(e) => onUpdateBlockedReason(selectedItem.id, e.target.value)}
                        style={{
                          width: "100%", padding: "6px 8px", borderRadius: 4, fontSize: 10,
                          background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(51, 65, 85, 0.5)",
                          color: "#E2E8F0", fontFamily: "inherit",
                        }}
                      />
                    </div>
                  )}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    {guidanceLoading ? (
                      <div style={{ fontSize: 11, color: C.textMuted }}>Generating guidance…</div>
                    ) : guidanceText ? (
                      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{guidanceText}</div>
                    ) : (
                      <div style={{ fontSize: 10, color: C.textMuted }}>Click &quot;AI →&quot; on any row or click a row to load guidance.</div>
                    )}
                  </div>
                  <button onClick={() => setSelectedItem(null)} style={{ marginTop: 12, fontSize: 10, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
                    ✕ Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RISKS TAB ─── */}
        {activeTab === "risks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {riskAlerts.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, color: C.success }}>No material risks detected</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Based on your deal profile, the decision tree found no risk triggers.</div>
              </div>
            ) : (
              riskAlerts.map((r) => (
                <div key={r.id} style={{
                  padding: 16, borderRadius: 8, background: C.cardBg,
                  border: `1px solid ${r.severity === "critical" ? "#EF444444" : r.severity === "high" ? "#F59E0B44" : C.border}`,
                  borderLeft: `4px solid ${r.severity === "critical" ? C.danger : r.severity === "high" ? C.warning : C.accent}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{RISK_LABELS[r.category]}</div>
                      <SeverityBadge severity={r.severity} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {r.affectedWorkstreams.map((ws) => (
                        <span key={ws} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.accent + "22", color: C.accent }}>{ws.split(" ")[0]}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>{r.description}</div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: 1, color: C.success, fontWeight: 700, marginBottom: 6 }}>Suggested Mitigation</div>
                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6 }}>{r.mitigation}</div>
                  </div>
                </div>
              ))
            )}

            {/* Risk Heat Map */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: C.textMuted }}>
                Risk Heat Map — Section 6 Taxonomy
              </div>
              {Object.entries(RISK_LABELS).map(([key, label]) => {
                const alert = riskAlerts.find(r => r.category === key);
                const level = alert ? (alert.severity === "critical" ? 3 : alert.severity === "high" ? 2 : 1) : 0;
                const levelColors = ["#1E293B", C.accent, C.warning, C.danger];
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 200, fontSize: 11, color: C.text }}>{label}</div>
                    <div style={{ display: "flex", gap: 3, flex: 1 }}>
                      {[1, 2, 3].map((l) => (
                        <div key={l} style={{
                          flex: 1, height: 18, borderRadius: 3,
                          background: l <= level ? levelColors[l] : "#1E293B",
                          border: `1px solid ${C.border}`,
                        }} />
                      ))}
                    </div>
                    <div style={{ width: 80, textAlign: "right" }}>
                      {alert ? <SeverityBadge severity={alert.severity} /> : <span style={{ fontSize: 10, color: C.muted }}>Clear</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TIMELINE TAB ─── */}
        {activeTab === "timeline" && (
          <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20, color: C.textMuted }}>
              Integration Timeline — Day 1 through Year 1
            </div>
            <div style={{ position: "relative", paddingLeft: 140 }}>
              <div style={{ position: "absolute", left: 136, top: 0, bottom: 0, width: 2, background: C.border }} />
              {[
                { phase: "Pre-Close", period: "Now → Close", color: C.accent, items: deal.checklistItems.filter(i => i.phase === "pre_close" && i.status !== "na").map(i => i.description.slice(0, 50)) },
                { phase: "Day 1", period: intake.closeDate || "Close Date", color: C.warning, items: deal.checklistItems.filter(i => i.phase === "day_1" && i.status !== "na" && i.priority === "critical").slice(0, 5).map(i => i.description.slice(0, 50)) },
                { phase: "Day 1–30", period: "+30 days", color: C.accentLight, items: deal.checklistItems.filter(i => i.phase === "day_30" && i.status !== "na").slice(0, 5).map(i => i.description.slice(0, 50)) },
                { phase: "Day 30–60", period: "+60 days", color: C.success, items: deal.checklistItems.filter(i => i.phase === "day_60" && i.status !== "na").slice(0, 4).map(i => i.description.slice(0, 50)) },
                { phase: "Day 60–90", period: "+90 days", color: C.success, items: deal.checklistItems.filter(i => i.phase === "day_90" && i.status !== "na").slice(0, 4).map(i => i.description.slice(0, 50)) },
                { phase: "Year 1", period: "+365 days", color: C.muted, items: deal.checklistItems.filter(i => i.phase === "year_1" && i.status !== "na").slice(0, 3).map(i => i.description.slice(0, 50)) },
              ].map((phase, i) => (
                <div key={i} style={{ display: "flex", marginBottom: 24, position: "relative" }}>
                  <div style={{ width: 120, textAlign: "right", paddingRight: 24, paddingTop: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: phase.color }}>{phase.phase}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>{phase.period}</div>
                  </div>
                  <div style={{
                    position: "absolute", left: 130, top: 5, width: 14, height: 14, borderRadius: "50%",
                    background: "#0F172A", border: `3px solid ${phase.color}`, zIndex: 1
                  }} />
                  <div style={{ flex: 1, paddingLeft: 24 }}>
                    {phase.items.length === 0 ? (
                      <span style={{ fontSize: 10, color: C.muted }}>No items for this phase</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {phase.items.map((item, j) => (
                          <span key={j} style={{
                            padding: "3px 8px", borderRadius: 4, fontSize: 10,
                            background: phase.color + "18", color: phase.color,
                            border: `1px solid ${phase.color}33`,
                          }}>{item}{item.length === 50 ? "…" : ""}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 24, padding: "14px 0", borderTop: `1px solid rgba(51, 65, 85, 0.4)`,
          display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted
        }}>
          <span>DealMapper v0.3.0 · Generated {new Date(deal.generatedAt).toLocaleString()}</span>
          <span>Powered by Claude AI · {deal.checklistItems.filter(i => i.status !== "na").length} active items across 24 workstreams</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: RiskAlert }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = risk.severity === "critical" ? "#EF444444" : risk.severity === "high" ? "#F59E0B44" : "#334155";
  return (
    <div style={{
      padding: 10, borderRadius: 6, background: "#1B2A4A",
      border: `1px solid ${borderColor}`, cursor: "pointer",
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700 }}>{RISK_LABELS[risk.category]}</span>
        <SeverityBadge severity={risk.severity} />
      </div>
      {expanded && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#94A3B8", lineHeight: 1.5 }}>
          {risk.description}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const c = severity === "critical" ? C.danger : severity === "high" ? C.warning : C.accent;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      background: c + "22", color: c, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
    }}>
      {severity.toUpperCase()}
    </span>
  );
}
