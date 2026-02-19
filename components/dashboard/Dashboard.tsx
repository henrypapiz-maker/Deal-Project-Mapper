"use client";

import { useState, useRef, useEffect } from "react";
import type { GeneratedDeal, ChecklistItem, RiskAlert, RiskOverride, ItemStatus, TeamMember, AISuggestion, WorkstreamRole } from "@/lib/types";
import { getKpis, getWorkstreamStats, getWorkstreamRag, getDealRag, type RagStatus } from "@/lib/decision-tree";
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

const RAG_COLOR: Record<string, string> = {
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#10B981",
};
const RAG_LABEL: Record<string, string> = { red: "RED", amber: "AMBER", green: "GREEN" };

const ALL_ROLES: WorkstreamRole[] = [
  "Finance", "HR", "IT", "Commercial", "Technical Accounting",
  "Legal", "Operations", "PMO", "Tax", "Treasury",
];

const ROLE_TO_WORKSTREAMS: Record<WorkstreamRole, string[]> = {
  Finance: ["Consolidation & Reporting", "Operational Accounting", "FP&A & Baselining", "Treasury & Banking"],
  HR: ["HR & Workforce Integration"],
  IT: ["Cybersecurity & Data Privacy"],
  Commercial: ["Integration Budget & PMO"],
  "Technical Accounting": ["TSA Assessment & Exit", "Internal Controls & SOX", "Consolidation & Reporting"],
  Legal: [],
  Operations: ["ESG & Sustainability", "Facilities & Real Estate"],
  PMO: ["Integration Budget & PMO"],
  Tax: ["Income Tax & Compliance"],
  Treasury: ["Treasury & Banking"],
};

const ROLE_COLORS: Record<WorkstreamRole, string> = {
  Finance: "#3B82F6",
  HR: "#10B981",
  IT: "#8B5CF6",
  Commercial: "#F59E0B",
  "Technical Accounting": "#60A5FA",
  Legal: "#94A3B8",
  Operations: "#F97316",
  PMO: "#EC4899",
  Tax: "#EF4444",
  Treasury: "#06B6D4",
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
  onUpdateOwner: (itemId: string, ownerId: string | undefined) => void;
  onAddMember: (member: TeamMember) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateBlockedReason: (itemId: string, reason: string) => void;
  onAcceptSuggestion: (suggestionId: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
  onUpdateRisk: (riskId: string, field: "severity" | "status", newValue: string, reason: string) => void;
  onAddNote: (itemId: string, note: string) => void;
  onReset: () => void;
}

export default function Dashboard({ deal, onUpdateStatus, onUpdateOwner, onAddMember, onRemoveMember, onUpdateBlockedReason, onAcceptSuggestion, onDismissSuggestion, onUpdateRisk, onAddNote, onReset }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "actions" | "checklist" | "risks" | "timeline" | "report">("overview");
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [guidanceText, setGuidanceText] = useState<string>("");
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterWs, setFilterWs] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [itemSuggestions, setItemSuggestions] = useState<AISuggestion[]>([]);
  const [actionsNotStartedLimit, setActionsNotStartedLimit] = useState(25);
  const [actionsDoneExpanded, setActionsDoneExpanded] = useState(false);
  const [actionsFilterWs, setActionsFilterWs] = useState<string>("all");
  const [newMemberRole, setNewMemberRole] = useState<WorkstreamRole | "">("");
  const [now, setNow] = useState(() => new Date());
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { intake, checklistItems, riskAlerts, milestones } = deal;
  const kpis = getKpis(checklistItems);
  const wsStats = getWorkstreamStats(checklistItems);
  const dealRag = getDealRag(kpis, riskAlerts);
  const wsRag = new Map<string, RagStatus>(
    Array.from(wsStats.entries()).map(([ws, stats]) => [ws, getWorkstreamRag(stats)])
  );
  const blockedItems = checklistItems.filter((i) => i.status === "blocked");
  const itemByItemId = new Map<string, ChecklistItem>(checklistItems.map((i) => [i.itemId, i]));
  const pendingSuggestions = (deal.aiSuggestions ?? []).filter((s) => s.status === "pending");
  const selectedItemLive = selectedItem ? (checklistItems.find((i) => i.id === selectedItem.id) ?? selectedItem) : null;
  const pendingDealSuggestions = pendingSuggestions.filter((s) => s.source === "deal_intake");
  const pendingItemSuggestions = pendingSuggestions.filter((s) => s.source === "item_update");

  async function fetchGuidance(item: ChecklistItem) {
    setSelectedItem(item);
    setGuidanceText("");
    setGuidanceLoading(true);
    // Surface any pending item-level suggestions for this item
    const forItem = (deal.aiSuggestions ?? []).filter(
      (s) => s.source === "item_update" && s.triggerItemId === item.itemId && s.status === "pending"
    );
    setItemSuggestions(forItem);
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

  const closeDate = intake.closeDate ? new Date(intake.closeDate) : null;
  const msToClose = closeDate ? closeDate.getTime() - now.getTime() : null;
  const daysToClose = msToClose !== null ? Math.floor(msToClose / 86400000) : null;
  const hoursToClose = msToClose !== null ? Math.floor((msToClose % 86400000) / 3600000) : null;
  const minsToClose = msToClose !== null ? Math.floor((msToClose % 3600000) / 60000) : null;
  const isClosePast = daysToClose !== null && daysToClose < 0;
  const closeSoonColor = daysToClose !== null && daysToClose < 0 ? C.success : daysToClose !== null && daysToClose < 14 ? C.danger : daysToClose !== null && daysToClose < 30 ? C.warning : C.accent;

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
          {(["overview", "actions", "checklist", "risks", "timeline", "report"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
              background: activeTab === tab ? (tab === "report" ? C.success : C.accent) : "transparent",
              color: activeTab === tab ? "#fff" : C.textMuted,
              fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
              position: "relative",
            }}>
              {tab === "report" ? "Report" : tab}
              {tab === "overview" && pendingSuggestions.length > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  width: 7, height: 7, borderRadius: "50%",
                  background: C.warning, display: "block",
                }} />
              )}
              {tab === "actions" && kpis.blocked > 0 && (
                <span style={{
                  position: "absolute", top: 2, right: 2,
                  width: 7, height: 7, borderRadius: "50%",
                  background: C.danger, display: "block",
                }} />
              )}
            </button>
          ))}
          {/* Countdown chip */}
          {daysToClose !== null && (
            <div style={{
              padding: "4px 10px", borderRadius: 4,
              background: closeSoonColor + "22",
              border: `1px solid ${closeSoonColor}44`,
              fontSize: 10, fontWeight: 700, color: closeSoonColor,
              letterSpacing: 0.5, whiteSpace: "nowrap",
            }}>
              {isClosePast
                ? `Closed ${Math.abs(daysToClose)}d ago`
                : daysToClose === 0
                ? `Closes today`
                : `${daysToClose}d ${hoursToClose}h to close`}
            </div>
          )}
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
          <div>
            <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>RAG Status</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 8px", borderRadius: 4,
              background: RAG_COLOR[dealRag] + "22",
              border: `1px solid ${RAG_COLOR[dealRag]}44`,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: RAG_COLOR[dealRag], display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: RAG_COLOR[dealRag], letterSpacing: 0.5 }}>{RAG_LABEL[dealRag]}</span>
            </div>
          </div>
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
            {/* Countdown Banner */}
            {closeDate && (
              <div style={{
                padding: "16px 20px", borderRadius: 8, background: C.cardBg,
                border: `1px solid ${closeSoonColor}44`, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 24,
              }}>
                {/* Digits */}
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {isClosePast ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 11, color: C.success, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                        Deal Closed {Math.abs(daysToClose!)}d ago
                      </div>
                    </div>
                  ) : (
                    [
                      { val: daysToClose!, label: "DAYS" },
                      { val: Math.abs(hoursToClose!), label: "HRS" },
                      { val: Math.abs(minsToClose!), label: "MIN" },
                    ].map(({ val, label }) => (
                      <div key={label} style={{ textAlign: "center", minWidth: 44 }}>
                        <div style={{
                          fontSize: 32, fontWeight: 800, lineHeight: 1,
                          color: closeSoonColor,
                          fontVariantNumeric: "tabular-nums",
                        }}>{String(Math.max(0, val)).padStart(2, "0")}</div>
                        <div style={{ fontSize: 8, color: C.textMuted, letterSpacing: 2, marginTop: 2 }}>{label}</div>
                      </div>
                    ))
                  )}
                </div>
                {/* Label + progress bar */}
                {!isClosePast && (
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 9, color: C.textMuted }}>
                      <span style={{ textTransform: "uppercase", letterSpacing: 1 }}>
                        {daysToClose! < 1 ? "CLOSES TODAY" : daysToClose! < 14 ? "CLOSES SOON" : "TO CLOSE DATE"} — {intake.closeDate}
                      </span>
                      <span style={{ color: closeSoonColor, fontWeight: 700 }}>
                        {kpis.pctComplete}% complete
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 8, background: C.deepBlue, borderRadius: 4, position: "relative" }}>
                      <div style={{
                        height: "100%", borderRadius: 4, transition: "width 0.5s",
                        background: `linear-gradient(90deg, ${C.accent}, ${closeSoonColor})`,
                        width: `${kpis.pctComplete}%`,
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: C.muted }}>
                      <span>Day 1</span>
                      <span>Day 30</span>
                      <span>Day 60</span>
                      <span>Day 90</span>
                      <span>Year 1</span>
                    </div>
                  </div>
                )}
              </div>
            )}

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
              {/* Left column: Workstream + Role Progress */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Workstream Progress */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                  Workstream Progress
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from(wsStats.entries()).map(([ws, stats]) => {
                    const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
                    const rag = wsRag.get(ws) ?? "amber";
                    const barColor = rag === "red" ? C.danger : rag === "green" ? C.success : C.accent;
                    const isSelected = selectedWs === ws;
                    return (
                      <div key={ws} onClick={() => setSelectedWs(isSelected ? null : ws)}
                        style={{
                          cursor: "pointer", padding: "8px 10px", borderRadius: 6,
                          background: isSelected ? C.deepBlue : "transparent",
                          border: `1px solid ${isSelected ? C.accent + "44" : "transparent"}`,
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                              background: RAG_COLOR[rag],
                              boxShadow: rag === "red" ? `0 0 6px ${RAG_COLOR.red}88` : "none",
                              display: "inline-block",
                            }} />
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{ws}</span>
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {stats.blocked > 0 && (
                              <span style={{ fontSize: 9, color: C.danger, fontWeight: 700 }}>{stats.blocked} blocked</span>
                            )}
                            <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pct}%</span>
                          </div>
                        </div>
                        <div style={{ width: "100%", height: 5, background: C.deepBlue, borderRadius: 3 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.5s" }} />
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

              {/* Progress by Role */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                  Progress by Role
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ALL_ROLES.map((role) => {
                    const wsList = ROLE_TO_WORKSTREAMS[role];
                    const members = deal.teamMembers.filter((m) => m.role === role);
                    // aggregate stats across mapped workstreams
                    let total = 0, complete = 0, blocked = 0;
                    wsList.forEach((ws) => {
                      const s = wsStats.get(ws);
                      if (s) { total += s.total; complete += s.complete; blocked += s.blocked; }
                    });
                    const pct = total ? Math.round((complete / total) * 100) : null;
                    const roleColor = ROLE_COLORS[role];
                    return (
                      <div key={role} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: roleColor,
                        }} />
                        <div style={{ width: 140, fontSize: 10, fontWeight: 600, color: C.text, flexShrink: 0 }}>{role}</div>
                        {pct !== null ? (
                          <>
                            <div style={{ flex: 1, height: 5, background: C.deepBlue, borderRadius: 3 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: roleColor, borderRadius: 3, transition: "width 0.5s" }} />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: roleColor, width: 30, textAlign: "right" }}>{pct}%</div>
                          </>
                        ) : (
                          <div style={{ flex: 1, fontSize: 9, color: C.muted, fontStyle: "italic" }}>No workstreams mapped</div>
                        )}
                        {blocked > 0 && (
                          <span style={{ fontSize: 9, color: C.danger, fontWeight: 700, whiteSpace: "nowrap" }}>{blocked} ✕</span>
                        )}
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minWidth: 60, justifyContent: "flex-end" }}>
                          {members.length === 0 ? (
                            <span style={{ fontSize: 9, color: C.muted }}>—</span>
                          ) : (
                            members.map((m) => (
                              <span key={m.id} style={{
                                fontSize: 9, padding: "1px 5px", borderRadius: 10,
                                background: roleColor + "22", color: roleColor,
                                fontWeight: 600, whiteSpace: "nowrap",
                              }}>{m.name.split(" ")[0]}</span>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>{/* end left column */}

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
                      ? Math.round((msDate.getTime() - now.getTime()) / 86400000)
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

        {/* ─── ROADBLOCKS PANEL (overview) ─── */}
        {activeTab === "overview" && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${blockedItems.length > 0 ? C.danger + "44" : C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: blockedItems.length > 0 ? 14 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: blockedItems.length > 0 ? C.danger : C.textMuted }}>
                Roadblocks — {blockedItems.length} item{blockedItems.length !== 1 ? "s" : ""} blocked
              </div>
              {blockedItems.length === 0 && (
                <span style={{ fontSize: 10, color: C.success }}>✓ No active blockers</span>
              )}
            </div>
            {blockedItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {blockedItems.map((item) => (
                  <BlockedItemCard
                    key={item.id}
                    item={item}
                    onUpdateReason={(reason) => onUpdateBlockedReason(item.id, reason)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── AI CONSIDERATIONS PANEL (overview) ─── */}
        {activeTab === "overview" && pendingSuggestions.length > 0 && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.warning}44` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.warning }}>
                AI Considerations — {pendingSuggestions.length} pending
              </div>
              <div style={{ fontSize: 9, color: C.textMuted, fontStyle: "italic" }}>
                {pendingDealSuggestions.length > 0 && `${pendingDealSuggestions.length} from deal profile`}
                {pendingDealSuggestions.length > 0 && pendingItemSuggestions.length > 0 && " · "}
                {pendingItemSuggestions.length > 0 && `${pendingItemSuggestions.length} from checklist execution`}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingSuggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onAccept={() => onAcceptSuggestion(s.id)}
                  onDismiss={() => onDismissSuggestion(s.id)}
                />
              ))}
            </div>
            {(deal.aiSuggestions ?? []).filter((s) => s.status === "accepted").length > 0 && (
              <div style={{ marginTop: 10, fontSize: 9, color: C.success }}>
                ✓ {(deal.aiSuggestions ?? []).filter((s) => s.status === "accepted").length} consideration{(deal.aiSuggestions ?? []).filter((s) => s.status === "accepted").length !== 1 ? "s" : ""} accepted and added to checklist
              </div>
            )}
          </div>
        )}

        {/* ─── KEY DEPENDENCIES PANEL (overview) ─── */}
        {activeTab === "overview" && (() => {
          const itemsWithUnmetDeps = checklistItems
            .filter((i) => {
              if (i.status === "na" || i.status === "complete") return false;
              return i.dependencies.length > 0 && i.dependencies.some((depId) => {
                const dep = itemByItemId.get(depId);
                return !dep || dep.status !== "complete";
              });
            })
            .sort((a, b) => {
              const p: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
              return p[a.priority] - p[b.priority];
            });

          return (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: itemsWithUnmetDeps.length > 0 ? 14 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: itemsWithUnmetDeps.length > 0 ? C.warning : C.textMuted }}>
                  Key Dependencies — {itemsWithUnmetDeps.length} item{itemsWithUnmetDeps.length !== 1 ? "s" : ""} with unmet prerequisites
                </div>
                {itemsWithUnmetDeps.length === 0 && (
                  <span style={{ fontSize: 10, color: C.success }}>✓ All dependencies satisfied</span>
                )}
              </div>
              {itemsWithUnmetDeps.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {itemsWithUnmetDeps.slice(0, 10).map((item) => {
                    const unmet = item.dependencies
                      .map((d) => itemByItemId.get(d))
                      .filter((d): d is ChecklistItem => !!d && d.status !== "complete");
                    const priorityColor = item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.textMuted;
                    return (
                      <div key={item.id} style={{ padding: "8px 10px", borderRadius: 5, background: C.deepBlue, border: `1px solid ${C.warning}22` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: priorityColor, display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>{item.itemId}</span>
                          <span style={{ fontSize: 9, color: priorityColor, fontWeight: 700, textTransform: "uppercase" }}>{item.priority}</span>
                          <span style={{ fontSize: 9, color: C.textMuted }}>{PHASE_LABELS[item.phase]}</span>
                          <span style={{ fontSize: 9, color: C.textMuted }}>{item.workstream.split(" ")[0]}</span>
                        </div>
                        <div style={{ fontSize: 10, color: C.text, marginBottom: 6, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.description}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, color: C.textMuted }}>Waiting on:</span>
                          {unmet.map((dep) => {
                            const depColor = dep.status === "blocked" ? C.danger : dep.status === "in_progress" ? C.accent : C.muted;
                            return (
                              <span key={dep.id} style={{
                                fontSize: 9, padding: "1px 6px", borderRadius: 3,
                                background: depColor + "18", color: depColor,
                                border: `1px solid ${depColor}33`,
                              }}>
                                {dep.itemId} · {dep.status.replace("_", " ")}
                              </span>
                            );
                          })}
                          {item.dependencies.filter((d) => !itemByItemId.has(d)).map((d) => (
                            <span key={d} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: C.muted + "18", color: C.muted }}>{d}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {itemsWithUnmetDeps.length > 10 && (
                    <div style={{ fontSize: 9, color: C.textMuted, fontStyle: "italic", paddingLeft: 4 }}>
                      +{itemsWithUnmetDeps.length - 10} more items with unmet dependencies
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── TEAM TAB (shown as panel inside overview) ─── */}
        {activeTab === "overview" && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: C.textMuted }}>
              Deal Team — {deal.teamMembers.length} member{deal.teamMembers.length !== 1 ? "s" : ""}
            </div>

            {/* Member list */}
            {deal.teamMembers.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {deal.teamMembers.map((m) => {
                  const owned = deal.checklistItems.filter(i => i.ownerId === m.id && i.status !== "na").length;
                  const roleColor = m.role ? ROLE_COLORS[m.role] : C.accent;
                  return (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 10px", borderRadius: 6,
                      background: C.deepBlue,
                      border: `1px solid ${m.role ? roleColor + "44" : C.border}`,
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg, ${roleColor}, ${roleColor}BB)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: "#fff",
                      }}>
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{m.name}</span>
                          {m.role && (
                            <span style={{
                              fontSize: 8, padding: "1px 5px", borderRadius: 10,
                              background: roleColor + "22", color: roleColor,
                              fontWeight: 700, letterSpacing: 0.5,
                            }}>{m.role}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 9, color: C.textMuted }}>{m.email || "No email"} · {owned} item{owned !== 1 ? "s" : ""} owned</div>
                      </div>
                      <button
                        onClick={() => onRemoveMember(m.id)}
                        style={{ marginLeft: 4, background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 12, lineHeight: 1 }}
                        title="Remove member"
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add member form */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                placeholder="Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMemberName.trim()) {
                    onAddMember({ id: Math.random().toString(36).slice(2) + Date.now().toString(36), name: newMemberName.trim(), email: newMemberEmail.trim(), role: newMemberRole || undefined });
                    setNewMemberName(""); setNewMemberEmail(""); setNewMemberRole("");
                  }
                }}
                style={{
                  padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.border}`,
                  background: C.deepBlue, color: C.text, fontSize: 11,
                  fontFamily: "inherit", width: 140, outline: "none",
                }}
              />
              <input
                placeholder="Email (optional)"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMemberName.trim()) {
                    onAddMember({ id: Math.random().toString(36).slice(2) + Date.now().toString(36), name: newMemberName.trim(), email: newMemberEmail.trim(), role: newMemberRole || undefined });
                    setNewMemberName(""); setNewMemberEmail(""); setNewMemberRole("");
                  }
                }}
                style={{
                  padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.border}`,
                  background: C.deepBlue, color: C.text, fontSize: 11,
                  fontFamily: "inherit", width: 170, outline: "none",
                }}
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value as WorkstreamRole | "")}
                style={{
                  padding: "6px 10px", borderRadius: 4, border: `1px solid ${newMemberRole ? ROLE_COLORS[newMemberRole as WorkstreamRole] + "88" : C.border}`,
                  background: C.deepBlue, color: newMemberRole ? ROLE_COLORS[newMemberRole as WorkstreamRole] : C.textMuted,
                  fontSize: 11, fontFamily: "inherit", fontWeight: newMemberRole ? 700 : 400,
                }}
              >
                <option value="">— Role</option>
                {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={() => {
                  if (!newMemberName.trim()) return;
                  onAddMember({ id: Math.random().toString(36).slice(2) + Date.now().toString(36), name: newMemberName.trim(), email: newMemberEmail.trim(), role: newMemberRole || undefined });
                  setNewMemberName(""); setNewMemberEmail(""); setNewMemberRole("");
                }}
                style={{
                  padding: "6px 14px", borderRadius: 4, border: "none",
                  background: C.accent, color: "#fff", fontSize: 11,
                  fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                }}
              >
                + Add
              </button>
            </div>
          </div>
        )}

        {/* ─── ACTIONS TAB ─── */}
        {activeTab === "actions" && (() => {
          const PHASE_ORDER: Record<string, number> = {
            pre_close: 0, day_1: 1, day_30: 2, day_60: 3, day_90: 4, year_1: 5,
          };
          const PRIORITY_ORDER: Record<string, number> = {
            critical: 0, high: 1, medium: 2, low: 3,
          };
          const active = checklistItems.filter((i) => i.status !== "na");
          const wsFilter = (i: ChecklistItem) => actionsFilterWs === "all" || i.workstream === actionsFilterWs;

          const upcoming = active.filter((i) => (i.status === "in_progress" || i.status === "blocked") && wsFilter(i))
            .sort((a, b) => {
              if (a.status === "blocked" && b.status !== "blocked") return -1;
              if (b.status === "blocked" && a.status !== "blocked") return 1;
              return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            });

          const notStarted = active.filter((i) => i.status === "not_started" && wsFilter(i))
            .sort((a, b) => {
              const phaseDiff = PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase];
              if (phaseDiff !== 0) return phaseDiff;
              return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
            });

          const done = active.filter((i) => i.status === "complete" && wsFilter(i))
            .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]);

          const notStartedVisible = notStarted.slice(0, actionsNotStartedLimit);

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Workstream filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Workstream</span>
                <select
                  value={actionsFilterWs}
                  onChange={(e) => setActionsFilterWs(e.target.value)}
                  style={{ background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 8px", fontSize: 10, fontFamily: "inherit" }}
                >
                  <option value="all">All Workstreams</option>
                  {Array.from(wsStats.keys()).map((ws) => (
                    <option key={ws} value={ws}>{ws}</option>
                  ))}
                </select>
                <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontSize: 10 }}>
                  <span style={{ color: C.danger }}>{kpis.blocked} blocked</span>
                  <span style={{ color: C.accent }}>{kpis.inProgress} in progress</span>
                  <span style={{ color: C.success }}>{kpis.complete} done</span>
                  <span style={{ color: C.textMuted }}>{kpis.notStarted} not started</span>
                </div>
              </div>

              {/* UPCOMING — blocked + in_progress */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${upcoming.some(i => i.status === "blocked") ? C.danger + "44" : C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: upcoming.length > 0 ? 12 : 0, color: C.text }}>
                  Upcoming
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: C.textMuted }}>
                    {upcoming.length} item{upcoming.length !== 1 ? "s" : ""} active
                    {upcoming.filter(i => i.status === "blocked").length > 0 && (
                      <span style={{ marginLeft: 6, color: C.danger, fontWeight: 700 }}>
                        · {upcoming.filter(i => i.status === "blocked").length} blocked
                      </span>
                    )}
                  </span>
                </div>
                {upcoming.length === 0 ? (
                  <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>No items in progress — pick items from Not Started below to begin working</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {upcoming.map((item) => (
                      <ActionItemRow
                        key={item.id}
                        item={item}
                        members={deal.teamMembers}
                        onUpdateStatus={onUpdateStatus}
                        onUpdateOwner={onUpdateOwner}
                        onClickGuidance={() => { setActiveTab("checklist"); fetchGuidance(item); }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* NOT STARTED */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: notStarted.length > 0 ? 12 : 0, color: C.textMuted }}>
                  Not Started
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400 }}>{notStarted.length} item{notStarted.length !== 1 ? "s" : ""}</span>
                </div>
                {notStarted.length === 0 ? (
                  <div style={{ fontSize: 10, color: C.success }}>✓ All items started or complete</div>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {notStartedVisible.map((item) => (
                        <ActionItemRow
                          key={item.id}
                          item={item}
                          members={deal.teamMembers}
                          onUpdateStatus={onUpdateStatus}
                          onUpdateOwner={onUpdateOwner}
                          onClickGuidance={() => { setActiveTab("checklist"); fetchGuidance(item); }}
                        />
                      ))}
                    </div>
                    {notStarted.length > actionsNotStartedLimit && (
                      <button
                        onClick={() => setActionsNotStartedLimit((n) => n + 25)}
                        style={{ marginTop: 10, fontSize: 10, color: C.accent, background: "transparent", border: `1px solid ${C.accent}44`, borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}
                      >
                        Show {Math.min(25, notStarted.length - actionsNotStartedLimit)} more ({notStarted.length - actionsNotStartedLimit} remaining)
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* DONE */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: done.length > 0 ? "pointer" : "default" }}
                  onClick={() => done.length > 0 && setActionsDoneExpanded((e) => !e)}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: done.length > 0 ? C.success : C.textMuted }}>
                    Done
                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: C.success }}>{done.length} item{done.length !== 1 ? "s" : ""} complete</span>
                  </div>
                  {done.length > 0 && (
                    <span style={{ fontSize: 10, color: C.textMuted }}>{actionsDoneExpanded ? "▲ collapse" : "▼ expand"}</span>
                  )}
                </div>
                {actionsDoneExpanded && done.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {done.map((item) => (
                      <ActionItemRow
                        key={item.id}
                        item={item}
                        members={deal.teamMembers}
                        onUpdateStatus={onUpdateStatus}
                        onUpdateOwner={onUpdateOwner}
                        onClickGuidance={() => { setActiveTab("checklist"); fetchGuidance(item); }}
                      />
                    ))}
                  </div>
                )}
                {done.length === 0 && (
                  <div style={{ marginTop: 6, fontSize: 10, color: C.muted, fontStyle: "italic" }}>No completed items yet</div>
                )}
              </div>
            </div>
          );
        })()}

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
                          }}
                        >
                          <td style={{ padding: "6px", fontWeight: 700, color: C.accent, whiteSpace: "nowrap" }}>
                            {item.itemId}
                            {item.isAiGenerated && (
                              <span style={{
                                marginLeft: 4, fontSize: 8, padding: "1px 4px", borderRadius: 3,
                                background: C.warning + "22", color: C.warning, fontWeight: 700,
                              }}>AI</span>
                            )}
                            {(item.notes?.length ?? 0) > 0 && (
                              <span style={{
                                marginLeft: 3, fontSize: 8, padding: "1px 4px", borderRadius: 3,
                                background: C.success + "22", color: C.success, fontWeight: 700,
                              }} title={`${item.notes.length} note${item.notes.length !== 1 ? "s" : ""}`}>
                                {item.notes.length}✎
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "6px", color: C.textMuted, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{item.workstream.split(" ")[0]}</td>
                          <td style={{ padding: "6px", maxWidth: 280 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</div>
                            {item.status === "blocked" && item.blockedReason && (
                              <div style={{ fontSize: 9, color: C.danger, marginTop: 2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                ⚠ {item.blockedReason}
                              </div>
                            )}
                          </td>
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
                          <td style={{ padding: "6px" }} onClick={(e) => e.stopPropagation()}>
                            <select
                              value={item.ownerId ?? ""}
                              onChange={(e) => onUpdateOwner(item.id, e.target.value || undefined)}
                              style={{
                                background: "transparent", border: "none",
                                color: item.ownerId ? C.text : C.muted,
                                fontSize: 9, cursor: "pointer",
                                fontFamily: "inherit", maxWidth: 100,
                              }}
                            >
                              <option value="">— Unassigned</option>
                              {deal.teamMembers.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
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
              {selectedItemLive && (
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.accent}33`, position: "sticky", top: 80, maxHeight: "80vh", overflowY: "auto" }}>
                  <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    AI Guidance
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 4 }}>{selectedItemLive.itemId}</div>
                  <div style={{ fontSize: 11, color: C.text, marginBottom: 12, lineHeight: 1.5 }}>{selectedItemLive.description}</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.accent + "22", color: C.accent }}>{selectedItemLive.workstream}</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.warning + "22", color: C.warning }}>{PHASE_LABELS[selectedItemLive.phase]}</span>
                    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: (selectedItemLive.status === "complete" ? C.success : selectedItemLive.status === "blocked" ? C.danger : selectedItemLive.status === "in_progress" ? C.accent : C.muted) + "22", color: selectedItemLive.status === "complete" ? C.success : selectedItemLive.status === "blocked" ? C.danger : selectedItemLive.status === "in_progress" ? C.accent : C.muted }}>{selectedItemLive.status.replace(/_/g, " ")}</span>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    {guidanceLoading ? (
                      <div style={{ fontSize: 11, color: C.textMuted }}>Generating AI guidance…</div>
                    ) : guidanceText && !guidanceText.includes("ANTHROPIC_API_KEY not set") ? (
                      <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{guidanceText}</div>
                    ) : guidanceText && guidanceText.includes("ANTHROPIC_API_KEY not set") ? (
                      <div style={{ fontSize: 10, color: C.warning, padding: "8px 10px", borderRadius: 4, background: C.warning + "11", border: `1px solid ${C.warning}33` }}>
                        AI guidance unavailable — add <strong>ANTHROPIC_API_KEY</strong> to Vercel project settings (Settings → Environment Variables).
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: C.textMuted }}>Click &quot;AI →&quot; on any row or click a row to load guidance.</div>
                    )}
                  </div>
                  {selectedItemLive.dependencies.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                      <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                        Prerequisites ({selectedItemLive.dependencies.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {selectedItemLive.dependencies.map((depId) => {
                          const dep = itemByItemId.get(depId);
                          const depColor = !dep ? C.muted : dep.status === "complete" ? C.success : dep.status === "blocked" ? C.danger : dep.status === "in_progress" ? C.accent : C.muted;
                          const depLabel = !dep ? "N/A" : dep.status === "complete" ? "✓ complete" : dep.status.replace("_", " ");
                          return (
                            <div key={depId} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: depColor, display: "inline-block", flexShrink: 0, marginTop: 3 }} />
                              <div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: depColor }}>{depId}</span>
                                <span style={{ fontSize: 9, color: depColor, marginLeft: 4 }}>({depLabel})</span>
                                {dep && <div style={{ fontSize: 9, color: C.textMuted, lineHeight: 1.4 }}>{dep.description.slice(0, 80)}{dep.description.length > 80 ? "…" : ""}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Notes / Comments section */}
                  <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                      Notes {selectedItemLive.notes.length > 0 ? `(${selectedItemLive.notes.length})` : ""}
                    </div>
                    {selectedItemLive.notes.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                        {selectedItemLive.notes.map((note, idx) => (
                          <div key={idx} style={{ padding: "6px 8px", borderRadius: 4, background: C.deepBlue, border: `1px solid ${C.border}`, fontSize: 10, color: C.text, lineHeight: 1.5 }}>
                            {note}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && noteInput.trim()) {
                            onAddNote(selectedItemLive!.id, noteInput.trim());
                            setNoteInput("");
                          }
                        }}
                        placeholder="Add a note…"
                        style={{
                          flex: 1, padding: "5px 8px", borderRadius: 4,
                          border: `1px solid ${noteInput.trim() ? C.accent + "66" : C.border}`,
                          background: C.deepBlue, color: C.text, fontSize: 10,
                          fontFamily: "inherit", outline: "none",
                        }}
                      />
                      <button
                        onClick={() => {
                          if (!noteInput.trim()) return;
                          onAddNote(selectedItemLive!.id, noteInput.trim());
                          setNoteInput("");
                        }}
                        style={{
                          padding: "5px 10px", borderRadius: 4, border: "none",
                          background: noteInput.trim() ? C.accent : C.muted,
                          color: "#fff", fontSize: 9, fontWeight: 700,
                          cursor: noteInput.trim() ? "pointer" : "default", fontFamily: "inherit",
                        }}
                      >+ Add</button>
                    </div>
                  </div>
                  {itemSuggestions.length > 0 && (
                    <div style={{ marginTop: 14, borderTop: `1px solid ${C.warning}44`, paddingTop: 12 }}>
                      <div style={{ fontSize: 9, color: C.warning, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                        Consider Adding to Workstream ({itemSuggestions.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {itemSuggestions.map((s) => (
                          <SuggestionCard
                            key={s.id}
                            suggestion={s}
                            compact
                            onAccept={() => {
                              onAcceptSuggestion(s.id);
                              setItemSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                            }}
                            onDismiss={() => {
                              onDismissSuggestion(s.id);
                              setItemSuggestions((prev) => prev.filter((x) => x.id !== s.id));
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setSelectedItem(null); setItemSuggestions([]); setNoteInput(""); }} style={{ marginTop: 12, fontSize: 10, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
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
            {/* Heat Map */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: C.textMuted }}>
                Risk Heat Map
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
                {Object.entries(RISK_LABELS).map(([key, label]) => {
                  const alert = riskAlerts.find(r => r.category === key);
                  const level = alert ? (alert.severity === "critical" ? 3 : alert.severity === "high" ? 2 : 1) : 0;
                  const levelColors = ["#1E293B", C.accent, C.warning, C.danger];
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 160, fontSize: 11, color: level > 0 ? C.text : C.textMuted, flexShrink: 0 }}>{label}</div>
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
                      <div style={{ width: 60, textAlign: "right" }}>
                        {alert ? <SeverityBadge severity={alert.severity} /> : <span style={{ fontSize: 10, color: C.muted }}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active risk cards with inline mitigations */}
            {riskAlerts.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 12 }}>
                {riskAlerts.map((r) => (
                  <RiskDetailCard key={r.id} risk={r} onUpdateRisk={onUpdateRisk} />
                ))}
              </div>
            ) : (
              <div style={{ padding: 24, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 13, color: C.success }}>No material risks detected</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>No risk triggers fired for this deal profile.</div>
              </div>
            )}
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

        {/* ─── REPORT TAB ─── */}
        {activeTab === "report" && (() => {
          const active = checklistItems.filter((i) => i.status !== "na");
          const totalActive = active.length;
          const complete = active.filter((i) => i.status === "complete").length;
          const inProgress = active.filter((i) => i.status === "in_progress").length;
          const blocked = active.filter((i) => i.status === "blocked").length;
          const notStarted = active.filter((i) => i.status === "not_started").length;
          const pctComplete = totalActive ? Math.round((complete / totalActive) * 100) : 0;
          const criticalRisks = riskAlerts.filter((r) => r.severity === "critical").length;
          const highRisks = riskAlerts.filter((r) => r.severity === "high").length;
          const openRisks = riskAlerts.filter((r) => r.status === "open").length;
          const aiItemCount = checklistItems.filter((i) => i.isAiGenerated).length;
          const itemsWithNotes = checklistItems.filter((i) => (i.notes?.length ?? 0) > 0).length;

          const phases = ["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"] as const;

          const topPriority = active
            .filter((i) => (i.priority === "critical" || i.priority === "high") && (i.status === "blocked" || i.status === "not_started" || i.status === "in_progress"))
            .sort((a, b) => {
              if (a.status === "blocked" && b.status !== "blocked") return -1;
              if (b.status === "blocked" && a.status !== "blocked") return 1;
              const pOrd: Record<string, number> = { critical: 0, high: 1 };
              return (pOrd[a.priority] ?? 2) - (pOrd[b.priority] ?? 2);
            })
            .slice(0, 8);

          const rag = getDealRag(kpis, riskAlerts);
          const ragColors: Record<string, string> = { red: C.danger, amber: C.warning, green: C.success };
          const ragLabels: Record<string, string> = { red: "RED — Immediate Action Required", amber: "AMBER — Monitor Closely", green: "GREEN — On Track" };
          const ragColor = ragColors[rag];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 20px", borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>Executive Integration Summary</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>{intake.dealName}</div>
                  <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.textMuted, flexWrap: "wrap" }}>
                    <span>{STRUCTURE_LABELS[intake.dealStructure]}</span>
                    <span>·</span>
                    <span>{MODEL_LABELS[intake.integrationModel]}</span>
                    <span>·</span>
                    <span>Close: {intake.closeDate || "TBD"}</span>
                    {intake.dealValueRange && <><span>·</span><span>{intake.dealValueRange}</span></>}
                    {intake.industrySector && <><span>·</span><span>{intake.industrySector}</span></>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>Deal Status</div>
                    <div style={{
                      padding: "4px 12px", borderRadius: 5,
                      background: ragColor + "22", border: `1px solid ${ragColor}55`,
                      fontSize: 10, fontWeight: 800, color: ragColor, letterSpacing: 0.5,
                    }}>{ragLabels[rag]}</div>
                  </div>
                  <button
                    onClick={() => window.print()}
                    style={{
                      padding: "6px 14px", borderRadius: 4, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.textMuted, fontSize: 10,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >Print / PDF</button>
                </div>
              </div>

              {/* KPI Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
                {[
                  { label: "Total Items", value: totalActive, color: C.textMuted },
                  { label: "Complete", value: complete, color: C.success },
                  { label: "In Progress", value: inProgress, color: C.accent },
                  { label: "Blocked", value: blocked, color: blocked > 0 ? C.danger : C.textMuted },
                  { label: "Not Started", value: notStarted, color: C.textMuted },
                  { label: "AI-Generated", value: aiItemCount, color: C.warning },
                  { label: "Open Risks", value: openRisks, color: openRisks > 0 ? C.danger : C.textMuted },
                ].map((kpi, i) => (
                  <div key={i} style={{ padding: "12px", borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                    <div style={{ fontSize: 9, color: C.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{kpi.label}</div>
                  </div>
                ))}
              </div>

              {/* Overall Progress Bar */}
              <div style={{ padding: "14px 16px", borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 10 }}>
                  <span style={{ color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, fontSize: 9 }}>Overall Completion</span>
                  <span style={{ fontWeight: 800, color: ragColor, fontSize: 14 }}>{pctComplete}%</span>
                </div>
                <div style={{ width: "100%", height: 10, background: C.deepBlue, borderRadius: 5 }}>
                  <div style={{ width: `${pctComplete}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${C.accent}, ${ragColor})`, transition: "width 0.5s" }} />
                </div>
                <div style={{ display: "flex", gap: 20, marginTop: 8, fontSize: 9, color: C.textMuted }}>
                  <span style={{ color: C.success }}>■ Complete {complete}</span>
                  <span style={{ color: C.accent }}>■ In Progress {inProgress}</span>
                  <span style={{ color: blocked > 0 ? C.danger : C.textMuted }}>■ Blocked {blocked}</span>
                  <span>■ Not Started {notStarted}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Workstream Health Table */}
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                    Workstream Health
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                        {["Workstream", "Total", "Done", "Active", "Blocked", "%", "RAG"].map((h) => (
                          <th key={h} style={{ padding: "4px 6px", textAlign: h === "Workstream" ? "left" : "center", color: C.textMuted, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(wsStats.entries()).map(([ws, stats]) => {
                        const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
                        const wsRagVal = wsRag.get(ws) ?? "amber";
                        const wsRagColor = wsRagVal === "red" ? C.danger : wsRagVal === "green" ? C.success : C.warning;
                        return (
                          <tr key={ws} style={{ borderBottom: `1px solid ${C.border}22` }}>
                            <td style={{ padding: "5px 6px", fontSize: 9, color: C.text }}>{ws.split(" ")[0]}&nbsp;<span style={{ color: C.textMuted, fontSize: 8 }}>{ws.split(" ").slice(1, 3).join(" ")}</span></td>
                            <td style={{ padding: "5px 6px", textAlign: "center", color: C.textMuted }}>{stats.total}</td>
                            <td style={{ padding: "5px 6px", textAlign: "center", color: C.success }}>{stats.complete}</td>
                            <td style={{ padding: "5px 6px", textAlign: "center", color: C.accent }}>{stats.inProgress}</td>
                            <td style={{ padding: "5px 6px", textAlign: "center", color: stats.blocked > 0 ? C.danger : C.textMuted }}>{stats.blocked}</td>
                            <td style={{ padding: "5px 6px", textAlign: "center", fontWeight: 700, color: wsRagColor }}>{pct}%</td>
                            <td style={{ padding: "5px 6px", textAlign: "center" }}>
                              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: wsRagColor }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phase Breakdown + Risk Summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Phase Progress */}
                  <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                      Progress by Phase
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                      {phases.map((ph) => {
                        const phItems = active.filter((i) => i.phase === ph);
                        const phComplete = phItems.filter((i) => i.status === "complete").length;
                        const phPct = phItems.length ? Math.round((phComplete / phItems.length) * 100) : 0;
                        const phColor = phPct === 100 ? C.success : phPct > 50 ? C.accent : phItems.some((i) => i.status === "blocked") ? C.danger : C.warning;
                        return (
                          <div key={ph}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: 9 }}>
                              <span style={{ color: C.text, fontWeight: 600 }}>{PHASE_LABELS[ph]}</span>
                              <span style={{ color: phColor, fontWeight: 700 }}>{phComplete}/{phItems.length} ({phPct}%)</span>
                            </div>
                            <div style={{ width: "100%", height: 6, background: C.deepBlue, borderRadius: 3 }}>
                              <div style={{ width: `${phPct}%`, height: "100%", borderRadius: 3, background: phColor, transition: "width 0.5s" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Risk Summary */}
                  <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${criticalRisks > 0 ? C.danger + "44" : C.border}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, color: C.textMuted }}>
                      Risk Summary
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
                      {[
                        { label: "Critical", count: criticalRisks, color: C.danger },
                        { label: "High", count: highRisks, color: C.warning },
                        { label: "Open", count: openRisks, color: C.accent },
                      ].map((r) => (
                        <div key={r.label} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 5, background: r.count > 0 ? r.color + "11" : C.deepBlue, border: `1px solid ${r.count > 0 ? r.color + "33" : C.border}` }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: r.count > 0 ? r.color : C.textMuted }}>{r.count}</div>
                          <div style={{ fontSize: 8, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8 }}>{r.label}</div>
                        </div>
                      ))}
                    </div>
                    {riskAlerts.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {riskAlerts.slice(0, 4).map((r) => (
                          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 9 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: r.severity === "critical" ? C.danger : r.severity === "high" ? C.warning : C.accent, display: "inline-block", flexShrink: 0 }} />
                            <span style={{ color: C.text }}>{RISK_LABELS[r.category]}</span>
                            <span style={{ color: C.textMuted, marginLeft: "auto" }}>{r.status}</span>
                          </div>
                        ))}
                        {riskAlerts.length > 4 && (
                          <div style={{ fontSize: 9, color: C.textMuted, fontStyle: "italic" }}>+{riskAlerts.length - 4} more risks — see Risks tab</div>
                        )}
                      </div>
                    )}
                    {riskAlerts.length === 0 && (
                      <div style={{ fontSize: 10, color: C.success }}>✓ No material risks detected</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Critical Actions + Team */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Top Priority Actions */}
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${blocked > 0 ? C.danger + "33" : C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                    Priority Actions Requiring Attention
                  </div>
                  {topPriority.length === 0 ? (
                    <div style={{ fontSize: 10, color: C.success }}>✓ No critical or high priority items requiring immediate attention</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {topPriority.map((item) => {
                        const itemColor = item.status === "blocked" ? C.danger : item.priority === "critical" ? C.danger : C.warning;
                        const owner = deal.teamMembers.find((m) => m.id === item.ownerId);
                        return (
                          <div key={item.id} style={{ padding: "8px 10px", borderRadius: 5, background: C.deepBlue, border: `1px solid ${itemColor}22` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: C.accent }}>{item.itemId}</span>
                              <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: itemColor + "22", color: itemColor, fontWeight: 700, textTransform: "uppercase" }}>
                                {item.status === "blocked" ? "BLOCKED" : item.priority}
                              </span>
                              <span style={{ fontSize: 8, color: C.textMuted }}>{PHASE_LABELS[item.phase]}</span>
                              {owner && <span style={{ fontSize: 8, color: C.textMuted, marginLeft: "auto" }}>{owner.name}</span>}
                            </div>
                            <div style={{ fontSize: 10, color: C.text, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.description}
                            </div>
                            {item.status === "blocked" && item.blockedReason && (
                              <div style={{ fontSize: 9, color: C.danger, marginTop: 2, fontStyle: "italic" }}>⚠ {item.blockedReason}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Team Coverage */}
                <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                    Team Coverage — {deal.teamMembers.length} member{deal.teamMembers.length !== 1 ? "s" : ""}
                  </div>
                  {deal.teamMembers.length === 0 ? (
                    <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>No team members added — go to Overview tab to add members</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {deal.teamMembers.map((m) => {
                        const owned = checklistItems.filter((i) => i.ownerId === m.id && i.status !== "na");
                        const ownedComplete = owned.filter((i) => i.status === "complete").length;
                        const ownedBlocked = owned.filter((i) => i.status === "blocked").length;
                        const ownedPct = owned.length ? Math.round((ownedComplete / owned.length) * 100) : 0;
                        const roleColor = m.role ? ROLE_COLORS[m.role] : C.accent;
                        return (
                          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `linear-gradient(135deg, ${roleColor}, ${roleColor}BB)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{m.name}</span>
                                {m.role && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: roleColor + "22", color: roleColor, fontWeight: 700 }}>{m.role}</span>}
                                {ownedBlocked > 0 && <span style={{ fontSize: 8, color: C.danger, fontWeight: 700 }}>{ownedBlocked} blocked</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, height: 4, background: C.deepBlue, borderRadius: 2 }}>
                                  <div style={{ width: `${ownedPct}%`, height: "100%", borderRadius: 2, background: roleColor }} />
                                </div>
                                <span style={{ fontSize: 9, color: C.textMuted, whiteSpace: "nowrap" }}>{ownedComplete}/{owned.length} items ({ownedPct}%)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {itemsWithNotes > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 9, color: C.textMuted }}>
                      {itemsWithNotes} item{itemsWithNotes !== 1 ? "s" : ""} have notes — see Checklist tab to review
                    </div>
                  )}
                </div>
              </div>

              {/* Milestones row */}
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                  Integration Milestones
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {milestones.map((ms, i) => {
                    const msDate = new Date(ms.date);
                    const daysOut = closeDate ? Math.round((msDate.getTime() - now.getTime()) / 86400000) : ms.daysFromClose;
                    const isPast = daysOut < 0;
                    const msColor = isPast ? C.success : daysOut < 30 ? C.warning : C.textMuted;
                    return (
                      <div key={i} style={{ flex: "1 1 140px", padding: "10px 12px", borderRadius: 6, background: C.deepBlue, border: `1px solid ${msColor}33`, textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: msColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>{ms.label}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: msColor }}>{isPast ? "Complete" : `${daysOut}d`}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{ms.date}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer note */}
              <div style={{ fontSize: 9, color: C.muted, textAlign: "center" }}>
                Report generated {new Date().toLocaleString()} · {intake.dealName} · M&A Integration Engine
              </div>
            </div>
          );
        })()}

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

const PHASE_LABELS_SHORT: Record<string, string> = {
  pre_close: "Pre-Close",
  day_1: "Day 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  year_1: "Year 1",
};

function ActionItemRow({
  item,
  members,
  onUpdateStatus,
  onUpdateOwner,
  onClickGuidance,
}: {
  item: ChecklistItem;
  members: { id: string; name: string }[];
  onUpdateStatus: (id: string, status: ItemStatus) => void;
  onUpdateOwner: (id: string, ownerId: string | undefined) => void;
  onClickGuidance: () => void;
}) {
  const priorityColor =
    item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.textMuted;
  const statusColor =
    item.status === "complete" ? C.success :
    item.status === "in_progress" ? C.accent :
    item.status === "blocked" ? C.danger : C.muted;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "8px 70px 1fr auto auto auto",
      gap: 10,
      alignItems: "center",
      padding: "7px 10px",
      borderRadius: 5,
      background: item.status === "blocked" ? C.danger + "0A" : item.status === "complete" ? C.success + "0A" : "transparent",
      border: `1px solid ${item.status === "blocked" ? C.danger + "33" : C.border + "66"}`,
    }}>
      {/* priority dot */}
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor, display: "inline-block", flexShrink: 0 }} />
      {/* ID + badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, whiteSpace: "nowrap" }}>{item.itemId}</span>
        {item.isAiGenerated && (
          <span style={{ fontSize: 8, padding: "0px 3px", borderRadius: 2, background: C.warning + "22", color: C.warning, fontWeight: 700 }}>AI</span>
        )}
        {(item.notes?.length ?? 0) > 0 && (
          <span style={{ fontSize: 8, padding: "0px 3px", borderRadius: 2, background: C.success + "22", color: C.success, fontWeight: 700 }} title={`${item.notes.length} note${item.notes.length !== 1 ? "s" : ""}`}>{item.notes.length}✎</span>
        )}
      </div>
      {/* description + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: item.status === "complete" ? C.textMuted : C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          textDecoration: item.status === "complete" ? "line-through" : "none" }}>
          {item.description}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, color: C.textMuted }}>{item.workstream.split(" ")[0]}</span>
          <span style={{ fontSize: 9, padding: "0px 5px", borderRadius: 3, background: item.phase === "day_1" ? C.warning + "22" : C.deepBlue, color: item.phase === "day_1" ? C.warning : C.textMuted }}>
            {PHASE_LABELS[item.phase]}
          </span>
          {item.status === "blocked" && item.blockedReason && (
            <span style={{ fontSize: 9, color: C.danger, fontStyle: "italic" }}>⚠ {item.blockedReason}</span>
          )}
        </div>
      </div>
      {/* owner */}
      <select
        value={item.ownerId ?? ""}
        onChange={(e) => onUpdateOwner(item.id, e.target.value || undefined)}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "transparent", border: "none",
          color: item.ownerId ? C.text : C.muted,
          fontSize: 9, cursor: "pointer", fontFamily: "inherit", maxWidth: 90,
        }}
      >
        <option value="">— owner</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {/* status */}
      <select
        value={item.status}
        onChange={(e) => onUpdateStatus(item.id, e.target.value as ItemStatus)}
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
      {/* AI guidance shortcut */}
      <button
        onClick={onClickGuidance}
        style={{ background: "transparent", border: "none", color: C.accent, fontSize: 9, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
      >AI →</button>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  compact = false,
  onAccept,
  onDismiss,
}: {
  suggestion: AISuggestion;
  compact?: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor =
    suggestion.priority === "critical"
      ? C.danger
      : suggestion.priority === "high"
      ? C.warning
      : C.accent;

  return (
    <div style={{
      padding: compact ? "8px 10px" : "10px 12px",
      borderRadius: 6,
      background: C.deepBlue,
      border: `1px solid ${C.warning}33`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: C.text }}>{suggestion.description}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 9, color: C.textMuted }}>{suggestion.workstream.split(" ")[0]}</span>
            <span style={{ fontSize: 9, color: priorityColor, fontWeight: 700, textTransform: "uppercase" }}>{suggestion.priority}</span>
            <span style={{ fontSize: 9, color: C.textMuted }}>{PHASE_LABELS_SHORT[suggestion.phase]}</span>
            {suggestion.source === "item_update" && suggestion.triggerItemId && (
              <span style={{ fontSize: 9, color: C.muted }}>← {suggestion.triggerItemId}</span>
            )}
          </div>
          {expanded && (
            <div style={{ marginTop: 6, fontSize: 10, color: C.textMuted, lineHeight: 1.5, fontStyle: "italic" }}>
              {suggestion.rationale}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.border}`,
              background: "transparent", color: C.textMuted, fontSize: 9, cursor: "pointer",
            }}
            title="Show rationale"
          >
            {expanded ? "▲" : "Why?"}
          </button>
          <button
            onClick={onAccept}
            style={{
              padding: "2px 8px", borderRadius: 3, border: "none",
              background: C.success + "22", color: C.success,
              fontSize: 9, fontWeight: 700, cursor: "pointer",
            }}
          >
            + Add
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: "2px 6px", borderRadius: 3, border: "none",
              background: "transparent", color: C.muted,
              fontSize: 9, cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockedItemCard({
  item,
  onUpdateReason,
}: {
  item: ChecklistItem;
  onUpdateReason: (reason: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.blockedReason ?? "");

  const priorityColor =
    item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.accent;

  return (
    <div style={{
      padding: "10px 12px", borderRadius: 6, background: C.deepBlue,
      border: `1px solid ${C.danger}33`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.accent }}>{item.itemId}</span>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: priorityColor + "22", color: priorityColor, fontWeight: 700, textTransform: "uppercase" }}>{item.priority}</span>
            <span style={{ fontSize: 9, color: C.textMuted }}>{item.workstream.split(" ")[0]}</span>
            <span style={{ fontSize: 9, color: C.textMuted }}>{PHASE_LABELS[item.phase]}</span>
          </div>
          <div style={{ fontSize: 11, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>{item.description}</div>
          {editing ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdateReason(draft); setEditing(false); }
                  if (e.key === "Escape") { setDraft(item.blockedReason ?? ""); setEditing(false); }
                }}
                placeholder="Describe what's blocking this item…"
                style={{
                  flex: 1, padding: "4px 8px", borderRadius: 4,
                  border: `1px solid ${C.accent}66`, background: C.navy,
                  color: C.text, fontSize: 10, fontFamily: "inherit", outline: "none",
                }}
              />
              <button
                onClick={() => { onUpdateReason(draft); setEditing(false); }}
                style={{ padding: "3px 8px", borderRadius: 3, border: "none", background: C.accent, color: "#fff", fontSize: 9, cursor: "pointer" }}
              >Save</button>
              <button
                onClick={() => { setDraft(item.blockedReason ?? ""); setEditing(false); }}
                style={{ padding: "3px 6px", borderRadius: 3, border: "none", background: "transparent", color: C.muted, fontSize: 9, cursor: "pointer" }}
              >✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: item.blockedReason ? C.danger : C.muted, fontStyle: item.blockedReason ? "normal" : "italic" }}>
                {item.blockedReason ? `⚠ ${item.blockedReason}` : "No reason recorded"}
              </span>
              <button
                onClick={() => setEditing(true)}
                style={{ fontSize: 9, color: C.textMuted, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px", cursor: "pointer" }}
              >{item.blockedReason ? "Edit" : "+ Add reason"}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskDetailCard({ risk, onUpdateRisk }: { risk: RiskAlert; onUpdateRisk: (riskId: string, field: "severity" | "status", newValue: string, reason: string) => void }) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideField, setOverrideField] = useState<"severity" | "status">("severity");
  const [overrideValue, setOverrideValue] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);

  const hasOverrides = (risk.overrides ?? []).length > 0;
  const borderColor = risk.severity === "critical" ? C.danger + "55" : risk.severity === "high" ? C.warning + "44" : C.border;
  const headerColor = risk.severity === "critical" ? C.danger : risk.severity === "high" ? C.warning : C.accent;

  function submitOverride() {
    if (!overrideValue || !overrideReason.trim()) return;
    onUpdateRisk(risk.id, overrideField, overrideValue, overrideReason.trim());
    setOverrideOpen(false);
    setOverrideValue("");
    setOverrideReason("");
  }

  return (
    <div style={{ padding: 14, borderRadius: 8, background: C.cardBg, border: `1px solid ${borderColor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: headerColor }}>{RISK_LABELS[risk.category]}</span>
          {hasOverrides && (
            <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: C.warning + "22", color: C.warning, fontWeight: 700 }}>MODIFIED</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <SeverityBadge severity={risk.severity} />
          <span style={{
            fontSize: 9, padding: "2px 7px", borderRadius: 4,
            background: risk.status === "mitigated" || risk.status === "closed" ? C.success + "22" : risk.status === "acknowledged" ? C.accent + "22" : C.danger + "11",
            color: risk.status === "mitigated" || risk.status === "closed" ? C.success : risk.status === "acknowledged" ? C.accent : C.muted,
            fontWeight: 700, textTransform: "uppercase" as const,
          }}>{risk.status}</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5, marginBottom: 10 }}>{risk.description}</div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Mitigation</div>
        <div style={{ fontSize: 10, color: C.text, lineHeight: 1.6 }}>{risk.mitigation}</div>
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: C.textMuted }}>Affects:</span>
        {risk.affectedWorkstreams.map((ws) => (
          <span key={ws} style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: C.accent + "18", color: C.accent }}>{ws.split(" ")[0]}</span>
        ))}
      </div>

      {/* Override + Audit controls */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => { setOverrideOpen((o) => !o); setOverrideValue(""); setOverrideReason(""); }}
          style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 3, cursor: "pointer",
            background: overrideOpen ? C.warning + "22" : "transparent",
            border: `1px solid ${overrideOpen ? C.warning : C.border}`,
            color: overrideOpen ? C.warning : C.textMuted, fontFamily: "inherit",
          }}
        >
          {overrideOpen ? "Cancel Override" : "Override ↓"}
        </button>
        {hasOverrides && (
          <button
            onClick={() => setAuditOpen((o) => !o)}
            style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 3, cursor: "pointer",
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.textMuted, fontFamily: "inherit",
            }}
          >
            Audit Log ({risk.overrides!.length})
          </button>
        )}
      </div>

      {/* Override form */}
      {overrideOpen && (
        <div style={{
          marginTop: 10, padding: 10, borderRadius: 6,
          background: C.deepBlue, border: `1px solid ${C.warning}33`,
        }}>
          <div style={{ fontSize: 9, color: C.warning, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Manual Override
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <select
              value={overrideField}
              onChange={(e) => { setOverrideField(e.target.value as "severity" | "status"); setOverrideValue(""); }}
              style={{ padding: "4px 8px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.navy, color: C.text, fontSize: 10, fontFamily: "inherit" }}
            >
              <option value="severity">Severity</option>
              <option value="status">Status</option>
            </select>
            <select
              value={overrideValue}
              onChange={(e) => setOverrideValue(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.navy, color: C.text, fontSize: 10, fontFamily: "inherit" }}
            >
              <option value="">— Select new value</option>
              {overrideField === "severity"
                ? ["critical", "high", "medium", "low"].map((v) => (
                    <option key={v} value={v} disabled={v === risk.severity}>{v}{v === risk.severity ? " (current)" : ""}</option>
                  ))
                : ["open", "acknowledged", "mitigated", "closed"].map((v) => (
                    <option key={v} value={v} disabled={v === risk.status}>{v}{v === risk.status ? " (current)" : ""}</option>
                  ))
              }
            </select>
          </div>
          <input
            placeholder="Reason for override (required)"
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitOverride(); }}
            style={{
              width: "100%", padding: "5px 8px", borderRadius: 3,
              border: `1px solid ${overrideReason.trim() ? C.accent + "66" : C.border}`,
              background: C.navy, color: C.text, fontSize: 10,
              fontFamily: "inherit", outline: "none", boxSizing: "border-box" as const,
            }}
          />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={submitOverride}
              disabled={!overrideValue || !overrideReason.trim()}
              style={{
                padding: "4px 12px", borderRadius: 3, border: "none", cursor: "pointer",
                background: overrideValue && overrideReason.trim() ? C.warning : C.muted,
                color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "inherit",
                opacity: overrideValue && overrideReason.trim() ? 1 : 0.5,
              }}
            >Apply Override</button>
          </div>
        </div>
      )}

      {/* Audit log */}
      {auditOpen && hasOverrides && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: C.deepBlue, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Override Audit Log
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(risk.overrides ?? []).map((o: RiskOverride) => (
              <div key={o.id} style={{ padding: "6px 8px", borderRadius: 4, background: C.navy, fontSize: 9 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                  <span style={{ color: C.textMuted }}>{new Date(o.changedAt).toLocaleString()}</span>
                  <span style={{ color: C.accent, fontWeight: 700, textTransform: "uppercase" }}>{o.field}</span>
                  <span style={{ color: C.muted }}>{o.fromValue}</span>
                  <span style={{ color: C.textMuted }}>→</span>
                  <span style={{ color: C.warning, fontWeight: 700 }}>{o.toValue}</span>
                </div>
                <div style={{ color: C.text, fontStyle: "italic" }}>{o.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
