"use client";

import { useState } from "react";
import type { GeneratedDeal, ChecklistItem, RiskAlert, ItemStatus } from "@/lib/types";
import { getKpis, getWorkstreamStats } from "@/lib/decision-tree";

const C = {
  // Content
  bg: "#f0f4f0",
  card: "#ffffff",
  border: "#e2e8e2",
  text: "#111827",
  muted: "#6b7280",
  light: "#9ca3af",
  // Status
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  warning: "#d97706",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  accent: "#2563eb",
  accentBg: "#eff6ff",
};

const STRUCTURE_LABELS: Record<string, string> = {
  stock_purchase: "Stock Purchase",
  asset_purchase: "Asset Purchase",
  merger_forward: "Forward Merger",
  merger_reverse: "Reverse Triangular",
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
  activeTab: "overview" | "checklist" | "risks" | "timeline";
  onUpdateStatus: (itemId: string, status: ItemStatus) => void;
  onReset: () => void;
  onTabChange: (tab: string) => void;
  onToast?: (msg: string, color?: string) => void;
}

export default function Dashboard({ deal, activeTab, onUpdateStatus, onReset, onTabChange, onToast }: Props) {
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [guidanceText, setGuidanceText] = useState<string>("");
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterWs, setFilterWs] = useState<string>("all");

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

  const pageTitles: Record<string, { title: string; sub: string }> = {
    overview: { title: "Dashboard", sub: "Overview of your integration program" },
    checklist: { title: "Checklist", sub: "Track integration tasks and completion status" },
    risks: { title: "Risk Register", sub: "Monitor and mitigate deal risks" },
    timeline: { title: "Timeline", sub: "Integration phases and milestone dates" },
  };
  const { title, sub } = pageTitles[activeTab] || pageTitles.overview;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      {/* Page Header */}
      <div style={{
        padding: "20px 32px 0",
        background: C.bg,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 2 }}>{title}</h1>
            <p style={{ fontSize: 13, color: C.muted }}>{sub}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{
              padding: "6px 12px", borderRadius: 6, background: C.greenBg,
              border: `1px solid ${C.greenBorder}`, fontSize: 12, fontWeight: 600, color: C.green,
            }}>
              {intake.dealName}
            </div>
            <button
              onClick={onReset}
              style={{
                padding: "7px 14px", borderRadius: 6,
                border: `1px solid ${C.border}`, background: C.card,
                color: C.muted, fontSize: 12, cursor: "pointer",
              }}
            >
              ← New Deal
            </button>
          </div>
        </div>

        {/* Deal context pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            STRUCTURE_LABELS[intake.dealStructure],
            MODEL_LABELS[intake.integrationModel],
            intake.industrySector || "—",
            intake.dealValueRange || "—",
            intake.crossBorder ? `Cross-Border (${intake.jurisdictions.length} jurisdictions)` : "Domestic",
            `TSA: ${intake.tsaRequired.toUpperCase()}`,
          ].map((val) => (
            <span key={val} style={{
              padding: "3px 10px", borderRadius: 20,
              background: C.card, border: `1px solid ${C.border}`,
              fontSize: 11, color: C.muted,
            }}>{val}</span>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div key={activeTab} style={{ animation: "fadeInUp 0.2s ease-out" }}>

        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Overall Progress", value: `${kpis.pctComplete}%`, sub: `${kpis.complete} of ${kpis.total} complete`, color: C.green, bg: C.greenBg, border: C.greenBorder },
                { label: "In Progress", value: kpis.inProgress, sub: "items active", color: C.accent, bg: C.accentBg, border: "#bfdbfe" },
                { label: "Blocked", value: kpis.blocked, sub: "require escalation", color: C.danger, bg: C.dangerBg, border: "#fecaca" },
                { label: "Active Risks", value: riskAlerts.filter(r => r.status === "open").length, sub: `${riskAlerts.filter(r => r.severity === "critical").length} critical`, color: C.warning, bg: C.warningBg, border: "#fde68a" },
              ].map((kpi, i) => (
                <div key={i} style={{
                  padding: "16px 18px", borderRadius: 10, background: kpi.bg,
                  border: `1px solid ${kpi.border}`,
                }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginBottom: 8 }}>{kpi.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: C.light, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16 }}>
              {/* Workstream Progress */}
              <div style={{ padding: 20, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
                  Workstream Progress
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {Array.from(wsStats.entries()).map(([ws, stats]) => {
                    const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
                    const barColor = stats.blocked > 0 ? C.warning : pct > 50 ? C.green : C.accent;
                    const isSelected = selectedWs === ws;
                    return (
                      <div
                        key={ws}
                        onClick={() => setSelectedWs(isSelected ? null : ws)}
                        style={{
                          cursor: "pointer", padding: "10px 12px", borderRadius: 8,
                          background: isSelected ? "#f0fdf4" : "transparent",
                          border: `1px solid ${isSelected ? C.greenBorder : "transparent"}`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{ws}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {stats.blocked > 0 && (
                              <span style={{ fontSize: 11, color: C.danger, fontWeight: 600 }}>{stats.blocked} blocked</span>
                            )}
                            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ width: "100%", height: 5, background: "#f3f4f6", borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.5s" }} />
                        </div>
                        {isSelected && (
                          <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11 }}>
                            <span style={{ color: C.green }}>✓ {stats.complete} done</span>
                            <span style={{ color: C.accent }}>→ {stats.inProgress} active</span>
                            <span style={{ color: C.danger }}>✕ {stats.blocked} blocked</span>
                            <span style={{ color: C.light }}>○ {stats.notStarted} pending</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right panel: Risk + Milestones */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Risk Register */}
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                    Risk Register — {riskAlerts.length} Active
                  </div>
                  {riskAlerts.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.green }}>✓ No material risks detected</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {riskAlerts.map((r) => (
                        <RiskCard key={r.id} risk={r} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestones */}
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                    Milestones
                  </div>
                  {milestones.map((ms, i) => {
                    const msDate = new Date(ms.date);
                    const daysOut = closeDate
                      ? Math.round((msDate.getTime() - today.getTime()) / 86400000)
                      : ms.daysFromClose;
                    const isPast = daysOut < 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: isPast ? C.green : daysOut < 30 ? C.warning : "#d1d5db",
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{ms.label}</div>
                          <div style={{ fontSize: 10, color: C.light }}>{ms.date}</div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
                          background: isPast ? C.greenBg : daysOut < 30 ? C.warningBg : "#f9fafb",
                          color: isPast ? C.green : daysOut < 30 ? C.warning : C.light,
                        }}>
                          {isPast ? "Done" : `${daysOut}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── CHECKLIST ─── */}
        {activeTab === "checklist" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All Phases</option>
                {["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"].map(p => (
                  <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                ))}
              </select>
              <select
                value={filterWs}
                onChange={(e) => setFilterWs(e.target.value)}
                style={selectStyle}
              >
                <option value="all">All Workstreams</option>
                {Array.from(wsStats.keys()).map(ws => (
                  <option key={ws} value={ws}>{ws}</option>
                ))}
              </select>
              <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>
                {visibleItems.length} items
              </div>
            </div>

            <div className="checklist-grid" style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 340px" : "1fr", gap: 16 }}>
              {/* Table */}
              <div style={{ borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {["ID", "Workstream", "Task", "Phase", "Priority", "Status", ""].map((h) => (
                        <th key={h} style={{
                          padding: "10px 12px", textAlign: "left",
                          color: C.muted, fontSize: 11, fontWeight: 600,
                          background: "#f9fafb",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const statusColor = item.status === "complete" ? C.green : item.status === "in_progress" ? C.accent : item.status === "blocked" ? C.danger : C.light;
                      const isSelected = selectedItem?.id === item.id;
                      return (
                        <tr
                          key={item.id}
                          onClick={() => fetchGuidance(item)}
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            background: isSelected ? "#f0fdf4" : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: C.accent, whiteSpace: "nowrap", fontSize: 11 }}>{item.itemId}</td>
                          <td style={{ padding: "8px 12px", color: C.muted, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.workstream.split(" ")[0]}
                          </td>
                          <td style={{ padding: "8px 12px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>
                            {item.description}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              padding: "2px 8px", borderRadius: 4, fontSize: 11,
                              background: item.phase === "day_1" ? C.warningBg : "#f3f4f6",
                              color: item.phase === "day_1" ? C.warning : C.muted,
                            }}>
                              {PHASE_LABELS[item.phase]}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{
                              color: item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.muted,
                              fontWeight: 600, fontSize: 11, textTransform: "capitalize",
                            }}>
                              {item.priority}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <select
                              value={item.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                const next = e.target.value as ItemStatus;
                                onUpdateStatus(item.id, next);
                                const labels: Record<string, string> = { not_started: "Not Started", in_progress: "In Progress", blocked: "Blocked", complete: "Complete" };
                                const color = next === "complete" ? C.green : next === "blocked" ? C.danger : next === "in_progress" ? C.accent : C.light;
                                onToast?.(`${item.itemId}: ${labels[next]}`, color);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                background: "transparent", border: "none",
                                color: statusColor, fontSize: 11, fontWeight: 600,
                                cursor: "pointer", textTransform: "capitalize",
                              }}
                            >
                              <option value="not_started">Not Started</option>
                              <option value="in_progress">In Progress</option>
                              <option value="blocked">Blocked</option>
                              <option value="complete">Complete</option>
                            </select>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); fetchGuidance(item); }}
                              style={{
                                background: C.accentBg, border: `1px solid #bfdbfe`,
                                color: C.accent, fontSize: 11, fontWeight: 600,
                                cursor: "pointer", borderRadius: 4, padding: "2px 8px",
                              }}
                            >
                              AI
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
                <div style={{
                  padding: 18, borderRadius: 10, background: C.card,
                  border: `1px solid ${C.greenBorder}`,
                  position: "sticky", top: 0, maxHeight: "75vh", overflowY: "auto",
                }}>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                    AI Guidance
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{selectedItem.itemId}</div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 12, lineHeight: 1.5 }}>{selectedItem.description}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.accentBg, color: C.accent }}>{selectedItem.workstream}</span>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: C.warningBg, color: C.warning }}>{PHASE_LABELS[selectedItem.phase]}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    {guidanceLoading ? (
                      <div>
                        {[100, 82, 95, 68, 88, 75].map((w, i) => (
                          <div key={i} style={{
                            height: 10, borderRadius: 4, background: "#e5e7eb",
                            width: `${w}%`, marginBottom: 10,
                            animation: `skeletonPulse 1.5s ${i * 0.12}s ease-in-out infinite`,
                          }} />
                        ))}
                        <div style={{ fontSize: 11, color: C.light, marginTop: 4 }}>Claude is generating guidance…</div>
                      </div>
                    ) : guidanceText ? (
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{guidanceText}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.light }}>Click a row or the AI button to load guidance.</div>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    style={{ marginTop: 12, fontSize: 11, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    ✕ Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RISKS ─── */}
        {activeTab === "risks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {riskAlerts.length === 0 ? (
              <div style={{ padding: 32, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: C.green }}>No material risks detected</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>The decision tree found no risk triggers for this deal profile.</div>
              </div>
            ) : (
              riskAlerts.map((r) => {
                const borderColor = r.severity === "critical" ? C.danger : r.severity === "high" ? C.warning : C.accent;
                const bgColor = r.severity === "critical" ? C.dangerBg : r.severity === "high" ? C.warningBg : C.accentBg;
                return (
                  <div key={r.id} style={{
                    padding: 18, borderRadius: 10, background: C.card,
                    border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${borderColor}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>{RISK_LABELS[r.category]}</div>
                        <SeverityBadge severity={r.severity} />
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {r.affectedWorkstreams.map((ws) => (
                          <span key={ws} style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 4,
                            background: C.accentBg, color: C.accent,
                          }}>{ws.split(" ")[0]}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>{r.description}</div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.green, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
                        Suggested Mitigation
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{r.mitigation}</div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Risk Heat Map */}
            <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 16 }}>
                Risk Heat Map
              </div>
              {Object.entries(RISK_LABELS).map(([key, label]) => {
                const alert = riskAlerts.find(r => r.category === key);
                const level = alert ? (alert.severity === "critical" ? 3 : alert.severity === "high" ? 2 : 1) : 0;
                const levelColors = ["#f3f4f6", C.accent, C.warning, C.danger];
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 200, fontSize: 12, color: C.text }}>{label}</div>
                    <div style={{ display: "flex", gap: 3, flex: 1 }}>
                      {[1, 2, 3].map((l) => (
                        <div key={l} style={{
                          flex: 1, height: 16, borderRadius: 3,
                          background: l <= level ? levelColors[l] : "#f3f4f6",
                          border: `1px solid ${C.border}`,
                        }} />
                      ))}
                    </div>
                    <div style={{ width: 80, textAlign: "right" }}>
                      {alert ? <SeverityBadge severity={alert.severity} /> : <span style={{ fontSize: 11, color: C.light }}>Clear</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TIMELINE ─── */}
        {activeTab === "timeline" && (
          <div style={{ padding: 20, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 24 }}>
              Integration Timeline — Day 1 through Year 1
            </div>
            <div style={{ position: "relative", paddingLeft: 140 }}>
              <div style={{ position: "absolute", left: 136, top: 0, bottom: 0, width: 2, background: C.border }} />
              {[
                { phase: "Pre-Close", period: "Now → Close", color: C.accent, items: deal.checklistItems.filter(i => i.phase === "pre_close" && i.status !== "na").map(i => i.description.slice(0, 50)) },
                { phase: "Day 1", period: intake.closeDate || "Close Date", color: C.warning, items: deal.checklistItems.filter(i => i.phase === "day_1" && i.status !== "na" && i.priority === "critical").slice(0, 5).map(i => i.description.slice(0, 50)) },
                { phase: "Day 1–30", period: "+30 days", color: C.green, items: deal.checklistItems.filter(i => i.phase === "day_30" && i.status !== "na").slice(0, 5).map(i => i.description.slice(0, 50)) },
                { phase: "Day 30–60", period: "+60 days", color: C.green, items: deal.checklistItems.filter(i => i.phase === "day_60" && i.status !== "na").slice(0, 4).map(i => i.description.slice(0, 50)) },
                { phase: "Day 60–90", period: "+90 days", color: C.green, items: deal.checklistItems.filter(i => i.phase === "day_90" && i.status !== "na").slice(0, 4).map(i => i.description.slice(0, 50)) },
                { phase: "Year 1", period: "+365 days", color: C.light, items: deal.checklistItems.filter(i => i.phase === "year_1" && i.status !== "na").slice(0, 3).map(i => i.description.slice(0, 50)) },
              ].map((phase, i) => (
                <div key={i} style={{ display: "flex", marginBottom: 28, position: "relative" }}>
                  <div style={{ width: 120, textAlign: "right", paddingRight: 24, paddingTop: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: phase.color }}>{phase.phase}</div>
                    <div style={{ fontSize: 11, color: C.light }}>{phase.period}</div>
                  </div>
                  <div style={{
                    position: "absolute", left: 130, top: 4, width: 14, height: 14, borderRadius: "50%",
                    background: C.card, border: `3px solid ${phase.color}`, zIndex: 1
                  }} />
                  <div style={{ flex: 1, paddingLeft: 24 }}>
                    {phase.items.length === 0 ? (
                      <span style={{ fontSize: 12, color: C.light }}>No items for this phase</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {phase.items.map((item, j) => (
                          <span key={j} style={{
                            padding: "3px 10px", borderRadius: 4, fontSize: 12,
                            background: phase.color === C.warning ? C.warningBg : phase.color === C.accent ? C.accentBg : C.greenBg,
                            color: phase.color,
                            border: `1px solid ${phase.color === C.warning ? "#fde68a" : phase.color === C.accent ? "#bfdbfe" : C.greenBorder}`,
                          }}>
                            {item}{item.length === 50 ? "…" : ""}
                          </span>
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
          display: "flex", justifyContent: "space-between", fontSize: 11, color: C.light,
        }}>
          <span>DealMapper · Generated {new Date(deal.generatedAt).toLocaleString()}</span>
          <span>{deal.checklistItems.filter(i => i.status !== "na").length} active items · Powered by Claude AI</span>
        </div>
        </div>{/* end animated tab wrapper */}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: RiskAlert }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = risk.severity === "critical" ? "#fecaca" : risk.severity === "high" ? "#fde68a" : "#bfdbfe";
  const textColor = risk.severity === "critical" ? C.danger : risk.severity === "high" ? C.warning : C.accent;
  return (
    <div
      style={{
        padding: "10px 12px", borderRadius: 7, background: "#fafafa",
        border: `1px solid ${borderColor}`, cursor: "pointer",
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{RISK_LABELS[risk.category]}</span>
        <SeverityBadge severity={risk.severity} />
      </div>
      {expanded && (
        <div style={{ marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          {risk.description}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = severity === "critical"
    ? { bg: "#fef2f2", color: C.danger, border: "#fecaca" }
    : severity === "high"
    ? { bg: "#fffbeb", color: C.warning, border: "#fde68a" }
    : { bg: "#eff6ff", color: C.accent, border: "#bfdbfe" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
    }}>
      {severity}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 12px", borderRadius: 7,
  border: "1px solid #e2e8e2", background: "#fff",
  color: "#374151", fontSize: 12, outline: "none", cursor: "pointer",
};
