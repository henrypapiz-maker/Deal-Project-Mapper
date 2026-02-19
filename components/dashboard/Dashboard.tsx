"use client";

import { useState, useRef, useEffect } from "react";
import type { GeneratedDeal, ChecklistItem, RiskAlert, ItemStatus } from "@/lib/types";
import { getKpis, getWorkstreamStats } from "@/lib/decision-tree";
import { exportChecklist, exportRisks, exportSummary } from "@/lib/export";

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
  onReset: () => void;
}

export default function Dashboard({ deal, onUpdateStatus, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "checklist" | "risks" | "timeline">("overview");
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [guidanceText, setGuidanceText] = useState<string>("");
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterWs, setFilterWs] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
      setGuidanceText("Unable to load AI guidance. Check your ANTHROPIC_API_KEY.");
    }
    setGuidanceLoading(false);
  }

  const visibleItems = checklistItems.filter((item) => {
    if (item.status === "na") return false;
    if (filterPhase !== "all" && item.phase !== filterPhase) return false;
    if (filterWs !== "all" && item.workstream !== filterWs) return false;
    return true;
  });

  const today = new Date();
  const closeDate = intake.closeDate ? new Date(intake.closeDate) : null;

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      background: `linear-gradient(135deg, ${C.navy} 0%, #0F172A 100%)`,
      color: C.text, minHeight: "100vh",
    }}>
      {/* Top Nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid ${C.border}`,
        background: C.navy + "CC", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff"
          }}>M</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              M&A Integration Engine
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>
              {intake.dealName} — {STRUCTURE_LABELS[intake.dealStructure]} · {MODEL_LABELS[intake.integrationModel]}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {(["overview", "checklist", "risks", "timeline"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
              background: activeTab === tab ? C.accent : "transparent",
              color: activeTab === tab ? "#fff" : C.textMuted,
              fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
            }}>{tab}</button>
          ))}
          {/* Export dropdown */}
          <div ref={exportRef} style={{ position: "relative", marginLeft: 8 }}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              style={{
                padding: "5px 12px", borderRadius: 4, cursor: "pointer",
                background: exportOpen ? C.accent : "transparent",
                border: `1px solid ${exportOpen ? C.accent : C.border}`,
                color: exportOpen ? "#fff" : C.textMuted,
                fontSize: 10, fontWeight: 600,
              }}
            >
              Export ↓
            </button>
            {exportOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 6px)",
                background: C.cardBg, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: 4, minWidth: 160, zIndex: 20,
                boxShadow: "0 8px 24px #00000066",
              }}>
                {[
                  { label: "Checklist (CSV)", fn: () => exportChecklist(deal) },
                  { label: "Risk Register (CSV)", fn: () => exportRisks(deal) },
                  { label: "Deal Summary (CSV)", fn: () => exportSummary(deal) },
                ].map(({ label, fn }) => (
                  <button
                    key={label}
                    onClick={() => { fn(); setExportOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "7px 10px", borderRadius: 4, border: "none",
                      background: "transparent", color: C.text,
                      fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.deepBlue)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={onReset} style={{
            marginLeft: 4, padding: "5px 12px", borderRadius: 4,
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.textMuted, fontSize: 10, cursor: "pointer",
          }}>← New Deal</button>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Overall Progress", value: `${kpis.pctComplete}%`, sub: `${kpis.complete} of ${kpis.total} items`, color: C.accent },
                { label: "In Progress", value: kpis.inProgress, sub: "items actively being worked", color: C.accentLight },
                { label: "Blocked Items", value: kpis.blocked, sub: "require escalation", color: kpis.blocked > 3 ? C.danger : C.warning },
                { label: "Active Risks", value: riskAlerts.filter(r => r.status === "open").length, sub: `${riskAlerts.filter(r => r.severity === "critical").length} critical`, color: C.danger },
              ].map((kpi, i) => (
                <div key={i} style={{
                  padding: 16, borderRadius: 8, background: C.cardBg,
                  border: `1px solid ${C.border}`, borderLeft: `3px solid ${kpi.color}`
                }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

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
                  {["day_1", "day_30", "day_60", "day_90", "year_1"].map(p => (
                    <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Workstream </span>
                <select
                  value={filterWs}
                  onChange={(e) => setFilterWs(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}
                >
                  <option value="all">All Workstreams</option>
                  {Array.from(wsStats.keys()).map(ws => (
                    <option key={ws} value={ws}>{ws}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted, alignSelf: "center" }}>
                {visibleItems.length} items shown
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 340px" : "1fr", gap: 16 }}>
              {/* Table */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {["ID", "Workstream", "Task", "Phase", "Priority", "Status", ""].map((h) => (
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
                          }}
                        >
                          <td style={{ padding: "6px", fontWeight: 700, color: C.accent, whiteSpace: "nowrap" }}>{item.itemId}</td>
                          <td style={{ padding: "6px", color: C.textMuted, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{item.workstream.split(" ")[0]}</td>
                          <td style={{ padding: "6px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</td>
                          <td style={{ padding: "6px" }}>
                            <span style={{ padding: "1px 6px", borderRadius: 3, background: item.phase === "day_1" ? C.warning + "22" : C.cardBg, color: item.phase === "day_1" ? C.warning : C.textMuted, fontSize: 9 }}>
                              {PHASE_LABELS[item.phase]}
                            </span>
                          </td>
                          <td style={{ padding: "6px" }}>
                            <span style={{ color: item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.textMuted, fontWeight: 600, fontSize: 9, textTransform: "uppercase" }}>
                              {item.priority}
                            </span>
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
                                background: "transparent", border: "none",
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left: Heat Map + active risk cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                      <div style={{ width: 180, fontSize: 11, color: C.text }}>{label}</div>
                      <div style={{ display: "flex", gap: 3, flex: 1 }}>
                        {[1, 2, 3].map((l) => (
                          <div key={l} style={{
                            flex: 1, height: 20, borderRadius: 3,
                            background: l <= level ? levelColors[l] : "#1E293B",
                            border: `1px solid ${C.border}`,
                            transition: "all 0.3s",
                          }} />
                        ))}
                      </div>
                      <div style={{ width: 70, textAlign: "right" }}>
                        {alert ? <SeverityBadge severity={alert.severity} /> : <span style={{ fontSize: 10, color: C.muted }}>Clear</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active risk detail cards */}
              {riskAlerts.length > 0 && (
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                    Active Risk Register — {riskAlerts.length} detected
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {riskAlerts.map((r) => (
                      <div key={r.id} style={{
                        padding: 10, borderRadius: 6, background: C.deepBlue,
                        border: `1px solid ${r.severity === "critical" ? C.danger + "44" : r.severity === "high" ? C.warning + "33" : C.border}`,
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{RISK_LABELS[r.category]}</span>
                          <SeverityBadge severity={r.severity} />
                        </div>
                        <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.4, marginBottom: 4 }}>{r.description}</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {r.affectedWorkstreams.map((ws) => (
                            <span key={ws} style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: C.accent + "22", color: C.accent }}>{ws.split(" ")[0]}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {riskAlerts.length === 0 && (
                <div style={{ padding: 24, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
                  <div style={{ fontSize: 13, color: C.success }}>No material risks detected</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>No risk triggers fired for this deal profile.</div>
                </div>
              )}
            </div>

            {/* Right: Detection Rules */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: C.textMuted }}>
                Risk Detection Rules — Section 6 Taxonomy
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                {[
                  { rule: "IF cross_border AND jurisdictions_requiring_filing > 3 → Regulatory Delay (Critical)", fired: riskAlerts.some(r => r.category === "regulatory_delay") },
                  { rule: "IF any jurisdiction ETR < 15% → Tax Structure Leakage (High)", fired: riskAlerts.some(r => r.category === "tax_structure_leakage") },
                  { rule: "IF tsa_required = yes AND integration_model ≠ standalone → TSA Dependency (High)", fired: riskAlerts.some(r => r.category === "tsa_dependency") },
                  { rule: "IF cross_border AND jurisdictions includes EU → Data Privacy Breach (High)", fired: riskAlerts.some(r => r.category === "data_privacy_breach") },
                  { rule: "IF buyer_maturity = first AND deal_value > $250M → Cultural Integration (Medium)", fired: riskAlerts.some(r => r.category === "cultural_integration") },
                  { rule: "IF target_gaap ≠ acquirer_gaap OR target_entities > 5 → Financial Reporting Gap (High)", fired: riskAlerts.some(r => r.category === "financial_reporting_gap") },
                  { rule: "IF deal_structure = carve_out → Stranded Costs (Medium)", fired: riskAlerts.some(r => r.category === "stranded_costs") },
                ].map(({ rule, fired }, i) => (
                  <div key={i} style={{
                    padding: "7px 10px", borderRadius: 4,
                    background: fired ? C.danger + "11" : C.deepBlue,
                    border: `1px solid ${fired ? C.danger + "33" : C.border}`,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ fontSize: 10, color: fired ? C.danger : C.textMuted, lineHeight: 1.4, flex: 1 }}>{rule}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: fired ? C.danger : C.muted, whiteSpace: "nowrap" }}>
                        {fired ? "▲ FIRED" : "— clear"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mitigation panel for fired risks */}
              {riskAlerts.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                    Suggested Mitigations
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {riskAlerts.map((r) => (
                      <div key={r.id}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: r.severity === "critical" ? C.danger : r.severity === "high" ? C.warning : C.accent, marginBottom: 3 }}>
                          {RISK_LABELS[r.category]}
                        </div>
                        <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>{r.mitigation}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
          marginTop: 24, padding: "12px 0", borderTop: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", fontSize: 9, color: C.muted
        }}>
          <span>M&A Integration Engine — Phase 1 MVP · Generated {new Date(deal.generatedAt).toLocaleString()}</span>
          <span>Powered by Claude API + React · {deal.checklistItems.filter(i => i.status !== "na").length} active items</span>
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
