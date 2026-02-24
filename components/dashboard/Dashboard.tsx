"use client";

import { useState } from "react";
import type { GeneratedDeal, ChecklistItem, RiskAlert, ItemStatus, Phase } from "@/lib/types";
import { getKpis, getWorkstreamStats } from "@/lib/decision-tree";

const C = {
  bg: "#f0f4f0",
  card: "#ffffff",
  border: "#e2e8e2",
  text: "#111827",
  muted: "#6b7280",
  light: "#9ca3af",
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
  operational_cutover: "Operational Cutover / Migration",
};

const PHASE_LABELS: Record<string, string> = {
  pre_close: "Pre-Close",
  day_1: "Day 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  year_1: "Year 1",
};

const RAG_CFG = {
  red:     { label: "Red",    color: C.danger,  bg: C.dangerBg,  border: "#fecaca" },
  amber:   { label: "Amber",  color: C.warning, bg: C.warningBg, border: "#fde68a" },
  green:   { label: "Green",  color: C.green,   bg: C.greenBg,   border: C.greenBorder },
  not_set: { label: "—",      color: C.light,   bg: "#f9fafb",   border: C.border },
};

interface Props {
  deal: GeneratedDeal;
  activeTab: "overview" | "checklist" | "risks" | "timeline";
  onUpdateStatus: (itemId: string, status: ItemStatus) => void;
  onUpdateItem?: (itemId: string, updates: Partial<Pick<ChecklistItem, "status" | "notes" | "blockedReason" | "dependencies" | "phase">>) => void;
  onAddItem?: (item: Omit<ChecklistItem, "id">) => void;
  onReset: () => void;
  onTabChange: (tab: string) => void;
  onToast?: (msg: string, color?: string) => void;
}

export default function Dashboard({ deal, activeTab, onUpdateStatus, onUpdateItem, onAddItem, onReset, onTabChange, onToast }: Props) {
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [guidanceText, setGuidanceText] = useState<string>("");
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterWs, setFilterWs] = useState<string>("all");
  const [showExcluded, setShowExcluded] = useState(false);

  const { intake, checklistItems, riskAlerts, milestones } = deal;
  const kpis = getKpis(checklistItems);
  const wsStats = getWorkstreamStats(checklistItems);

  // Build item lookup map for dependency resolution
  const itemByItemId = new Map<string, ChecklistItem>();
  checklistItems.forEach(item => itemByItemId.set(item.itemId, item));

  // Open dependencies: active items whose upstream deps aren't all complete
  const openDepsItems = checklistItems.filter(item =>
    item.status !== "na" &&
    item.status !== "complete" &&
    item.dependencies.length > 0 &&
    item.dependencies.some(depId => {
      const dep = itemByItemId.get(depId);
      return dep && dep.status !== "complete" && dep.status !== "na";
    })
  );
  const openDepsCount = openDepsItems.length;

  // Latest comments across all items (parse timestamp from note format)
  const allComments: { ts: string; body: string; itemId: string; workstream: string }[] = [];
  checklistItems.forEach(item => {
    item.notes.forEach(note => {
      const sepIdx = note.indexOf(" — ");
      if (sepIdx > -1) {
        allComments.push({
          ts: note.slice(0, sepIdx),
          body: note.slice(sepIdx + 3),
          itemId: item.itemId,
          workstream: item.workstream,
        });
      }
    });
  });
  // Sort most-recent first (lexicographic on timestamp string is sufficient for display)
  const latestComments = allComments.reverse().slice(0, 8);

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

  const excludedItems = checklistItems.filter((item) => {
    if (item.status !== "na") return false;
    if (filterPhase !== "all" && item.phase !== filterPhase) return false;
    if (filterWs !== "all" && item.workstream !== filterWs) return false;
    return true;
  });

  const today = new Date();
  const closeDate = intake.closeDate ? new Date(intake.closeDate) : null;

  const pageTitles: Record<string, { title: string; sub: string }> = {
    overview: { title: "Dashboard", sub: "High-level status across all workstreams" },
    checklist: { title: "Checklist", sub: "Track integration tasks and completion status" },
    risks: { title: "Program Status", sub: "RAG health, workstream progress, and risk register" },
    timeline: { title: "Timeline", sub: "Integration phases and milestone dates" },
  };
  const { title, sub } = pageTitles[activeTab] || pageTitles.overview;

  // ─── Workstream stratification ──────────────────────────────────────────────
  const wsStratified = (() => {
    const critical: [string, ReturnType<typeof wsStats.get>][] = [];
    const high: [string, ReturnType<typeof wsStats.get>][] = [];
    const standard: [string, ReturnType<typeof wsStats.get>][] = [];
    wsStats.forEach((stats, ws) => {
      const entry: [string, typeof stats] = [ws, stats];
      if (stats.blocked > 0 || (stats.total > 0 && (stats.total - stats.complete - stats.notStarted) > stats.total * 0.3)) {
        critical.push(entry);
      } else {
        const wsSummary = deal.workstreamSummary.find(w => w.name === ws);
        if (wsSummary?.priority === "critical" || wsSummary?.priority === "high") {
          high.push(entry);
        } else {
          standard.push(entry);
        }
      }
    });
    return { critical, high, standard };
  })();

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
      {/* Page Header */}
      <div style={{ padding: "20px 32px 0", background: C.bg, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 2 }}>{title}</h1>
            <p style={{ fontSize: 13, color: C.muted }}>{sub}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ padding: "6px 12px", borderRadius: 6, background: C.greenBg, border: `1px solid ${C.greenBorder}`, fontSize: 12, fontWeight: 600, color: C.green }}>
              {intake.dealName}
            </div>
            <button onClick={onReset} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 12, cursor: "pointer" }}>
              ← New Deal
            </button>
          </div>
        </div>

        {/* Deal context pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            { label: STRUCTURE_LABELS[intake.dealStructure] },
            { label: MODEL_LABELS[intake.integrationModel] },
            { label: intake.closeDate ? `Close: ${intake.closeDate}` : "Close: TBD" },
            { label: intake.industrySector || "Sector: —" },
            { label: intake.dealValueRange || "Value: —" },
            { label: `${intake.targetEntities} ${intake.targetEntities === 1 ? "entity" : "entities"}` },
            { label: intake.crossBorder ? `Cross-Border (${intake.jurisdictions.join(", ")})` : "Domestic" },
            { label: `TSA: ${intake.tsaRequired.toUpperCase()}` },
          ].map((pill) => (
            <span key={pill.label} style={{ padding: "3px 10px", borderRadius: 20, background: C.card, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>{pill.label}</span>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        <div key={activeTab} style={{ animation: "fadeInUp 0.2s ease-out" }}>

        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards — 5-up grid */}
            <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Overall Progress", value: `${kpis.pctComplete}%`, sub: `${kpis.complete} of ${kpis.total} complete`, color: C.green, bg: C.greenBg, border: C.greenBorder },
                { label: "In Progress", value: kpis.inProgress, sub: "items actively worked", color: C.accent, bg: C.accentBg, border: "#bfdbfe" },
                { label: "Blocked", value: kpis.blocked, sub: "require escalation", color: C.danger, bg: C.dangerBg, border: "#fecaca" },
                { label: "Open Dependencies", value: openDepsCount, sub: "items awaiting upstream", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                { label: "Active Risks", value: riskAlerts.filter(r => r.status === "open").length, sub: `${riskAlerts.filter(r => r.severity === "critical").length} critical`, color: C.warning, bg: C.warningBg, border: "#fde68a" },
              ].map((kpi, i) => (
                <div key={i} style={{ padding: "16px 18px", borderRadius: 10, background: kpi.bg, border: `1px solid ${kpi.border}` }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 500, marginBottom: 8 }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 11, color: C.light, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* Main overview grid */}
            <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginBottom: 16 }}>
              {/* Workstream Progress */}
              <div style={{ padding: 20, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Workstream Progress</div>
                  <button onClick={() => onTabChange("workstreams")} style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid #bfdbfe`, borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>
                    Open Workstreams →
                  </button>
                </div>
                {wsStratified.critical.length > 0 && (
                  <WorkstreamTier label="Needs Attention" color={C.danger} bgColor={C.dangerBg} entries={wsStratified.critical} selectedWs={selectedWs} setSelectedWs={setSelectedWs} onOpen={() => onTabChange("workstreams")} deal={deal} />
                )}
                {wsStratified.high.length > 0 && (
                  <WorkstreamTier label="High Priority" color={C.warning} bgColor={C.warningBg} entries={wsStratified.high} selectedWs={selectedWs} setSelectedWs={setSelectedWs} onOpen={() => onTabChange("workstreams")} deal={deal} />
                )}
                {wsStratified.standard.length > 0 && (
                  <WorkstreamTier label="On Track" color={C.green} bgColor={C.greenBg} entries={wsStratified.standard} selectedWs={selectedWs} setSelectedWs={setSelectedWs} onOpen={() => onTabChange("workstreams")} deal={deal} />
                )}
              </div>

              {/* Right column: Risk + Milestones */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Risk Register — {riskAlerts.length} Active</div>
                  {riskAlerts.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.green }}>✓ No material risks detected</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {riskAlerts.map((r) => <RiskCard key={r.id} risk={r} />)}
                    </div>
                  )}
                </div>
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>Milestones</div>
                  {milestones.length === 0 && <div style={{ fontSize: 12, color: C.light }}>No close date set</div>}
                  {milestones.map((ms, i) => {
                    const msDate = new Date(ms.date);
                    const daysOut = closeDate ? Math.round((msDate.getTime() - today.getTime()) / 86400000) : ms.daysFromClose;
                    const isPast = daysOut < 0;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isPast ? C.green : daysOut < 30 ? C.warning : "#d1d5db" }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{ms.label}</div>
                          <div style={{ fontSize: 10, color: C.light }}>{ms.date}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: isPast ? C.greenBg : daysOut < 30 ? C.warningBg : "#f9fafb", color: isPast ? C.green : daysOut < 30 ? C.warning : C.light }}>
                          {isPast ? "Done" : `${daysOut}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ─── Program Status by Workstream ─── */}
            <ProgramStatusPanel deal={deal} wsStats={wsStats} openDepsItems={openDepsItems} onOpenWorkstreams={() => onTabChange("workstreams")} />

            {/* ─── Latest Activity ─── */}
            {latestComments.length > 0 && (
              <div style={{ padding: 20, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
                  Latest Activity
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {latestComments.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, padding: "8px 10px", borderRadius: 6, background: "#fafafa", border: `1px solid ${C.border}` }}>
                      <div style={{ flexShrink: 0, paddingTop: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: C.accent }}>{c.itemId}</span>
                          <span style={{ fontSize: 11, color: C.light }}>{c.workstream.split(" ").slice(0, 2).join(" ")}</span>
                          <span style={{ fontSize: 10, color: C.light, marginLeft: "auto" }}>{c.ts}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{c.body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Open Dependencies Monitor ─── */}
            {openDepsCount > 0 && (
              <div style={{ padding: 20, borderRadius: 10, background: C.card, border: `1px solid #ddd6fe`, marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
                  Open Dependency Monitor — {openDepsCount} items blocked by upstream
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {openDepsItems.slice(0, 10).map(item => {
                    const blockerDeps = item.dependencies
                      .map(d => itemByItemId.get(d))
                      .filter(d => d && d.status !== "complete" && d.status !== "na") as ChecklistItem[];
                    return (
                      <div key={item.id} style={{ padding: "8px 12px", borderRadius: 6, background: "#f5f3ff", border: `1px solid #ddd6fe`, display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", minWidth: 72 }}>{item.itemId}</span>
                        <span style={{ flex: 1, fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</span>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          {blockerDeps.slice(0, 3).map(d => (
                            <span key={d.id} style={{ fontSize: 10, color: d.status === "blocked" ? C.danger : C.warning, background: d.status === "blocked" ? C.dangerBg : C.warningBg, padding: "1px 6px", borderRadius: 3, border: `1px solid ${d.status === "blocked" ? "#fecaca" : "#fde68a"}` }}>
                              {d.itemId}
                            </span>
                          ))}
                          {blockerDeps.length > 3 && <span style={{ fontSize: 10, color: C.light }}>+{blockerDeps.length - 3}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {openDepsCount > 10 && <div style={{ fontSize: 11, color: C.light, paddingLeft: 12 }}>+{openDepsCount - 10} more items with open dependencies</div>}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── CHECKLIST ─── */}
        {activeTab === "checklist" && (
          <div>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <select value={filterPhase} onChange={(e) => setFilterPhase(e.target.value)} style={selectStyle}>
                <option value="all">All Phases</option>
                {["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"].map(p => (
                  <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                ))}
              </select>
              <select value={filterWs} onChange={(e) => setFilterWs(e.target.value)} style={selectStyle}>
                <option value="all">All Workstreams</option>
                {Array.from(wsStats.keys()).map(ws => (
                  <option key={ws} value={ws}>{ws}</option>
                ))}
              </select>
              {/* Show excluded toggle */}
              <button
                onClick={() => setShowExcluded(v => !v)}
                style={{
                  padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 12,
                  border: showExcluded ? `1px solid ${C.warning}` : `1px solid ${C.border}`,
                  background: showExcluded ? C.warningBg : C.card,
                  color: showExcluded ? C.warning : C.muted, fontWeight: showExcluded ? 600 : 400,
                }}
              >
                {showExcluded ? "▼ Excluded Items" : "▶ Show Excluded Items"} ({excludedItems.length})
              </button>
              <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>{visibleItems.length} active items</div>
            </div>

            <div className="checklist-grid" style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 340px" : "1fr", gap: 16 }}>
              <div>
                {/* Active items table */}
                <div style={{ borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, overflowX: "auto", marginBottom: 16 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                        {["ID", "Workstream", "Task", "Phase", "Priority", "Status", ""].map((h) => (
                          <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.muted, fontSize: 11, fontWeight: 600, background: "#f9fafb" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleItems.map((item) => {
                        const statusColor = item.status === "complete" ? C.green : item.status === "in_progress" ? C.accent : item.status === "blocked" ? C.danger : C.light;
                        const isSelected = selectedItem?.id === item.id;
                        const hasOpenDep = openDepsItems.some(d => d.id === item.id);
                        return (
                          <tr key={item.id} onClick={() => fetchGuidance(item)} style={{ borderBottom: `1px solid ${C.border}`, background: isSelected ? "#f0fdf4" : "transparent", cursor: "pointer" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: C.accent, whiteSpace: "nowrap", fontSize: 11 }}>
                              {item.itemId}
                              {hasOpenDep && <span style={{ marginLeft: 4, fontSize: 9, color: "#7c3aed" }}>⬡</span>}
                            </td>
                            <td style={{ padding: "8px 12px", color: C.muted, whiteSpace: "nowrap", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis" }}>{item.workstream.split(" ")[0]}</td>
                            <td style={{ padding: "8px 12px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>{item.description}</td>
                            <td style={{ padding: "8px 12px" }} onClick={e => e.stopPropagation()}>
                              <select
                                value={item.phase}
                                onClick={e => e.stopPropagation()}
                                onChange={e => { e.stopPropagation(); onUpdateItem?.(item.id, { phase: e.target.value as Phase }); }}
                                style={{ padding: "2px 7px", borderRadius: 4, fontSize: 11, border: `1px solid ${C.border}`, background: item.phase === "day_1" ? C.warningBg : "#f9fafb", color: item.phase === "day_1" ? C.warning : C.muted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
                              >
                                <option value="pre_close">Pre-Close</option>
                                <option value="day_1">Day 1</option>
                                <option value="day_30">Day 30</option>
                                <option value="day_60">Day 60</option>
                                <option value="day_90">Day 90</option>
                                <option value="year_1">Year 1</option>
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ color: item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.muted, fontWeight: 600, fontSize: 11, textTransform: "capitalize" }}>
                                {item.priority}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <select value={item.status} onChange={(e) => { e.stopPropagation(); onUpdateStatus(item.id, e.target.value as ItemStatus); }} onClick={(e) => e.stopPropagation()}
                                style={{ background: "transparent", border: "none", color: statusColor, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="blocked">Blocked</option>
                                <option value="complete">Complete</option>
                              </select>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <button onClick={(e) => { e.stopPropagation(); fetchGuidance(item); }}
                                style={{ background: C.accentBg, border: `1px solid #bfdbfe`, color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer", borderRadius: 4, padding: "2px 8px" }}>
                                AI
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Excluded / N/A items section */}
                {showExcluded && (
                  <div style={{ borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", background: C.warningBg, borderBottom: `1px solid #fde68a`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.warning }}>Excluded Items (N/A)</span>
                        <span style={{ fontSize: 11, color: C.warning, marginLeft: 8 }}>{excludedItems.length} items excluded from in-scope plan</span>
                      </div>
                      <span style={{ fontSize: 11, color: C.warning }}>Click "Include" to add back to active plan</span>
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          {["ID", "Workstream", "Task", "Phase", "Reason", ""].map((h) => (
                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.light, fontSize: 11, fontWeight: 600, background: "#fffdf0" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excludedItems.map((item) => (
                          <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}`, opacity: 0.8 }}>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: C.light, fontSize: 11 }}>{item.itemId}</td>
                            <td style={{ padding: "8px 12px", color: C.light, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.workstream.split(" ")[0]}</td>
                            <td style={{ padding: "8px 12px", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.light }}>{item.description}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 11, background: "#f9fafb", color: C.light }}>{PHASE_LABELS[item.phase]}</span>
                            </td>
                            <td style={{ padding: "8px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <span style={{ fontSize: 11, color: C.light, fontStyle: "italic" }}>{item.naJustification || "Excluded from scope"}</span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <button
                                onClick={() => { onUpdateStatus(item.id, "not_started"); onToast?.(`${item.itemId} added to active plan`, C.green); }}
                                style={{ fontSize: 11, fontWeight: 600, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}
                              >
                                Include
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* AI Guidance Panel */}
              {selectedItem && (
                <div style={{ padding: 18, borderRadius: 10, background: C.card, border: `1px solid ${C.greenBorder}`, position: "sticky", top: 0, maxHeight: "75vh", overflowY: "auto" }}>
                  <div style={{ fontSize: 11, color: C.green, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>AI Guidance</div>
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
                          <div key={i} style={{ height: 10, borderRadius: 4, background: "#e5e7eb", width: `${w}%`, marginBottom: 10, animation: `skeletonPulse 1.5s ${i * 0.12}s ease-in-out infinite` }} />
                        ))}
                        <div style={{ fontSize: 11, color: C.light, marginTop: 4 }}>Claude is generating guidance…</div>
                      </div>
                    ) : guidanceText ? (
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{guidanceText}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.light }}>Click a row or the AI button to load guidance.</div>
                    )}
                  </div>
                  <button onClick={() => setSelectedItem(null)} style={{ marginTop: 12, fontSize: 11, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}>
                    ✕ Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── PROGRAM STATUS ─── */}
        {activeTab === "risks" && (
          <ProgramStatusDashboard
            deal={deal}
            kpis={kpis}
            wsStats={wsStats}
            riskAlerts={riskAlerts}
            openDepsItems={openDepsItems}
            checklistItems={checklistItems}
            onOpenWorkstreams={() => onTabChange("workstreams")}
          />
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
                { phase: "Pre-Close", period: "Now → Close", color: C.accent, items: checklistItems.filter(i => i.phase === "pre_close" && i.status !== "na").map(i => i.description.slice(0, 50)) },
                { phase: "Day 1", period: intake.closeDate || "Close Date", color: C.warning, items: checklistItems.filter(i => i.phase === "day_1" && i.status !== "na" && i.priority === "critical").slice(0, 5).map(i => i.description.slice(0, 50)) },
                { phase: "Day 1–30", period: "+30 days", color: C.green, items: checklistItems.filter(i => i.phase === "day_30" && i.status !== "na").slice(0, 5).map(i => i.description.slice(0, 50)) },
                { phase: "Day 30–60", period: "+60 days", color: C.green, items: checklistItems.filter(i => i.phase === "day_60" && i.status !== "na").slice(0, 4).map(i => i.description.slice(0, 50)) },
                { phase: "Day 60–90", period: "+90 days", color: C.green, items: checklistItems.filter(i => i.phase === "day_90" && i.status !== "na").slice(0, 4).map(i => i.description.slice(0, 50)) },
                { phase: "Year 1", period: "+365 days", color: C.light, items: checklistItems.filter(i => i.phase === "year_1" && i.status !== "na").slice(0, 3).map(i => i.description.slice(0, 50)) },
              ].map((phaseData, i) => (
                <div key={i} style={{ display: "flex", marginBottom: 28, position: "relative" }}>
                  <div style={{ width: 120, textAlign: "right", paddingRight: 24, paddingTop: 2 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: phaseData.color }}>{phaseData.phase}</div>
                    <div style={{ fontSize: 11, color: C.light }}>{phaseData.period}</div>
                  </div>
                  <div style={{ position: "absolute", left: 130, top: 4, width: 14, height: 14, borderRadius: "50%", background: C.card, border: `3px solid ${phaseData.color}`, zIndex: 1 }} />
                  <div style={{ flex: 1, paddingLeft: 24 }}>
                    {phaseData.items.length === 0 ? (
                      <span style={{ fontSize: 12, color: C.light }}>No items for this phase</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {phaseData.items.map((item, j) => (
                          <span key={j} style={{
                            padding: "3px 10px", borderRadius: 4, fontSize: 12,
                            background: phaseData.color === C.warning ? C.warningBg : phaseData.color === C.accent ? C.accentBg : C.greenBg,
                            color: phaseData.color,
                            border: `1px solid ${phaseData.color === C.warning ? "#fde68a" : phaseData.color === C.accent ? "#bfdbfe" : C.greenBorder}`,
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
        <div style={{ marginTop: 24, padding: "12px 0", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", fontSize: 11, color: C.light }}>
          <span>DealMapper · Generated {new Date(deal.generatedAt).toLocaleString()}</span>
          <span>{checklistItems.filter(i => i.status !== "na").length} active items · Powered by Claude AI</span>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Program Status Dashboard (full visual tab) ──────────────────────────────

function ProgramStatusDashboard({
  deal,
  kpis,
  wsStats,
  riskAlerts,
  openDepsItems,
  checklistItems,
  onOpenWorkstreams,
}: {
  deal: GeneratedDeal;
  kpis: ReturnType<typeof getKpis>;
  wsStats: ReturnType<typeof getWorkstreamStats>;
  riskAlerts: RiskAlert[];
  openDepsItems: ChecklistItem[];
  checklistItems: ChecklistItem[];
  onOpenWorkstreams: () => void;
}) {
  const [viewMode, setViewMode] = useState<"visual" | "report">("visual");
  const [drillWs, setDrillWs] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const workstreams = Array.from(wsStats.keys());

  // Item lookup for dependency resolution
  const itemMap = new Map<string, ChecklistItem>();
  checklistItems.forEach(i => itemMap.set(i.itemId, i));

  // RAG counts
  const ragCounts = { red: 0, amber: 0, green: 0, not_set: 0 };
  workstreams.forEach(ws => { ragCounts[deal.workstreamUpdates?.[ws]?.ragStatus ?? "not_set"]++; });
  const totalWs = workstreams.length;

  // Phase stats
  const phases = ["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"] as const;
  const phaseLabels: Record<string, string> = { pre_close: "Pre-Close", day_1: "Day 1", day_30: "Day 30", day_60: "Day 60", day_90: "Day 90", year_1: "Year 1" };
  const phaseStats = phases.map(p => {
    const items = checklistItems.filter(i => i.phase === p && i.status !== "na");
    const complete = items.filter(i => i.status === "complete").length;
    const inProg = items.filter(i => i.status === "in_progress").length;
    const blocked = items.filter(i => i.status === "blocked").length;
    return { phase: p, label: phaseLabels[p], total: items.length, complete, inProg, blocked, pct: items.length ? Math.round((complete / items.length) * 100) : 0 };
  });

  // Workstream rows sorted: blocked first, then % asc
  const wsRows = workstreams.map(ws => {
    const s = wsStats.get(ws)!;
    const pct = s.total ? Math.round((s.complete / s.total) * 100) : 0;
    const rag = deal.workstreamUpdates?.[ws]?.ragStatus ?? "not_set";
    const update = deal.workstreamUpdates?.[ws];
    const openDeps = openDepsItems.filter(i => i.workstream === ws).length;
    return { ws, s, pct, rag, update, openDeps };
  }).sort((a, b) => b.s.blocked !== a.s.blocked ? b.s.blocked - a.s.blocked : a.pct - b.pct);

  // Open dependencies register
  const depsWithBlockers = checklistItems.filter(item =>
    item.status !== "na" && item.dependencies.length > 0 &&
    item.dependencies.some(dId => { const d = itemMap.get(dId); return d && d.status !== "complete" && d.status !== "na"; })
  );
  const wsDepCounts = new Map<string, number>();
  depsWithBlockers.forEach(i => wsDepCounts.set(i.workstream, (wsDepCounts.get(i.workstream) ?? 0) + 1));

  // Donut
  const SIZE = 100; const R = 36; const CIRC = 2 * Math.PI * R; const center = SIZE / 2;
  function DonutSegments() {
    const t = kpis.total || 1;
    const c = (kpis.complete / t) * CIRC;
    const ip = (kpis.inProgress / t) * CIRC;
    const bl = (kpis.blocked / t) * CIRC;
    const ns = CIRC - c - ip - bl;
    return (
      <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
        {[{ pct: c, color: C.green, off: 0 }, { pct: ip, color: C.accent, off: c }, { pct: bl, color: C.danger, off: c + ip }, { pct: ns, color: "#e5e7eb", off: c + ip + bl }].map((s, i) => (
          <circle key={i} cx={center} cy={center} r={R} fill="none" stroke={s.color} strokeWidth={14} strokeDasharray={`${s.pct} ${CIRC - s.pct}`} strokeDashoffset={-s.off} strokeLinecap="butt" />
        ))}
      </svg>
    );
  }

  // CSV export
  function handleExport() {
    const esc = (v: string | number | undefined) => { const s = String(v ?? ""); return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g, '""')}"` : s; };
    const row = (cells: (string | number | undefined)[]) => cells.map(esc).join(",");
    const L: string[] = [];
    L.push(row(["DealMapper — Program Status Export"]));
    L.push(row([deal.intake.dealName, `Exported: ${new Date().toLocaleString()}`]));
    L.push("");
    L.push(row(["=== KPI SUMMARY ==="]));
    L.push(row(["Metric", "Value"]));
    [["Overall Progress", `${kpis.pctComplete}%`], ["Total Active Items", kpis.total], ["Complete", kpis.complete], ["In Progress", kpis.inProgress], ["Blocked", kpis.blocked], ["Not Started", kpis.notStarted], ["Open Dependencies", depsWithBlockers.length], ["Active Risks", riskAlerts.length], ["Critical Risks", riskAlerts.filter(r => r.severity === "critical").length]].forEach(r => L.push(row(r)));
    L.push(""); L.push(row(["=== WORKSTREAM STATUS ==="]));
    L.push(row(["Workstream", "RAG", "% Complete", "Complete", "In Progress", "Blocked", "Not Started", "Open Deps", "Update", "Updated At"]));
    wsRows.forEach(({ ws, s, pct, rag, update, openDeps }) => L.push(row([ws, rag === "not_set" ? "No Update" : rag, `${pct}%`, s.complete, s.inProgress, s.blocked, s.notStarted, openDeps, update?.updateText ?? "", update?.updatedAt ?? ""])));
    L.push(""); L.push(row(["=== RISK REGISTER ==="]));
    L.push(row(["Risk Category", "Severity", "Description", "Mitigation", "Affected Workstreams"]));
    riskAlerts.forEach(r => L.push(row([RISK_LABELS[r.category] ?? r.category, r.severity, r.description, r.mitigation, r.affectedWorkstreams.join("; ")])));
    L.push(""); L.push(row(["=== OPEN DEPENDENCIES ==="]));
    L.push(row(["Item ID", "Workstream", "Description", "Status", "Waiting On"]));
    depsWithBlockers.forEach(item => { const bl = item.dependencies.filter(dId => { const d = itemMap.get(dId); return d && d.status !== "complete" && d.status !== "na"; }); L.push(row([item.itemId, item.workstream, item.description, item.status, bl.join("; ")])); });
    L.push(""); L.push(row(["=== FULL CHECKLIST ==="]));
    L.push(row(["ID", "Workstream", "Description", "Phase", "Priority", "Status", "Notes"]));
    checklistItems.filter(i => i.status !== "na").forEach(item => L.push(row([item.itemId, item.workstream, item.description, item.phase, item.priority, item.status, item.notes.join(" || ")])));
    const blob = new Blob(["\ufeff" + L.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${deal.intake.dealName.replace(/[^a-z0-9]/gi, "-")}-program-status-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const weekStr = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const drillItems = drillWs ? checklistItems.filter(i => i.workstream === drillWs && i.status !== "na") : [];
  const CELLS_DEF = [
    { label: "R", match: "critical" as const, color: C.danger, bg: C.dangerBg, border: "#fecaca" },
    { label: "A", match: "high" as const, color: C.warning, bg: C.warningBg, border: "#fde68a" },
    { label: "G", match: "medium" as const, color: C.green, bg: C.greenBg, border: C.greenBorder },
  ];

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>

        {/* Action bar: date + view toggle + export */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, fontSize: 11, color: C.muted }}>As of {weekStr}</div>
          <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 7, padding: 2, gap: 1 }}>
            {(["visual", "report"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)} style={{ padding: "5px 14px", borderRadius: 5, border: "none", background: viewMode === m ? C.card : "transparent", color: viewMode === m ? C.text : C.muted, fontSize: 11, fontWeight: viewMode === m ? 700 : 400, cursor: "pointer", boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>
                {m === "visual" ? "📊 Visual" : "📋 Weekly Report"}
              </button>
            ))}
          </div>
          <button onClick={handleExport} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.muted, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
            ⬇ Export CSV
          </button>
        </div>

        {/* ── VISUAL MODE ── */}
        {viewMode === "visual" && (
          <>
            {/* Row 1: 3 equal summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>

              {/* Overall Completion donut */}
              <div style={{ padding: "16px 18px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted, marginBottom: 12 }}>Overall Completion</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
                  <div style={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
                    <DonutSegments />
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1 }}>{kpis.pctComplete}%</div>
                      <div style={{ fontSize: 9, color: C.muted }}>complete</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[{ color: C.green, label: "Done", value: kpis.complete }, { color: C.accent, label: "Active", value: kpis.inProgress }, { color: C.danger, label: "Blocked", value: kpis.blocked }, { color: "#d1d5db", label: "Pending", value: kpis.notStarted }].map(l => (
                      <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: C.muted, minWidth: 42 }}>{l.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: l.color }}>{l.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RAG Distribution */}
              <div style={{ padding: "16px 18px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted, marginBottom: 12 }}>RAG Distribution</div>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[{ rag: "red" as const, label: "Red", color: C.danger, bg: C.dangerBg, border: "#fecaca", count: ragCounts.red }, { rag: "amber" as const, label: "Amber", color: C.warning, bg: C.warningBg, border: "#fde68a", count: ragCounts.amber }, { rag: "green" as const, label: "Green", color: C.green, bg: C.greenBg, border: C.greenBorder, count: ragCounts.green }, { rag: "not_set" as const, label: "None", color: C.light, bg: "#f9fafb", border: C.border, count: ragCounts.not_set }].map(s => (
                    <div key={s.rag} style={{ flex: 1, padding: "10px 6px", borderRadius: 7, background: s.bg, border: `1px solid ${s.border}`, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
                      <div style={{ fontSize: 9, color: s.color, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ height: 8, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                  {[{ w: (ragCounts.red / totalWs) * 100, color: C.danger }, { w: (ragCounts.amber / totalWs) * 100, color: C.warning }, { w: (ragCounts.green / totalWs) * 100, color: C.green }, { w: (ragCounts.not_set / totalWs) * 100, color: "#d1d5db" }].filter(s => s.w > 0).map((s, i) => (
                    <div key={i} style={{ width: `${s.w}%`, background: s.color }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: C.light }}>
                  <span>{totalWs} workstreams</span>
                  <span>{Object.keys(deal.workstreamUpdates || {}).length} updated</span>
                </div>
              </div>

              {/* Risk & Dep Health */}
              <div style={{ padding: "16px 18px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted, marginBottom: 12 }}>Risk &amp; Dependency Health</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[{ label: "Critical Risks", value: riskAlerts.filter(r => r.severity === "critical").length, color: C.danger, bg: C.dangerBg }, { label: "High Risks", value: riskAlerts.filter(r => r.severity === "high").length, color: C.warning, bg: C.warningBg }, { label: "Open Deps", value: depsWithBlockers.length, color: "#7c3aed", bg: "#f5f3ff" }, { label: "Blocked Items", value: kpis.blocked, color: C.danger, bg: C.dangerBg }].map(m => (
                    <div key={m.label} style={{ padding: "9px 10px", borderRadius: 6, background: m.bg, textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                      <div style={{ fontSize: 9, color: m.color, marginTop: 2 }}>{m.label}</div>
                    </div>
                  ))}
                </div>
                {riskAlerts.length > 0 && (
                  <div style={{ height: 6, borderRadius: 3, overflow: "hidden", display: "flex" }}>
                    {[{ w: (riskAlerts.filter(r => r.severity === "critical").length / riskAlerts.length) * 100, color: C.danger }, { w: (riskAlerts.filter(r => r.severity === "high").length / riskAlerts.length) * 100, color: C.warning }, { w: (riskAlerts.filter(r => r.severity === "medium").length / riskAlerts.length) * 100, color: C.accent }].filter(s => s.w > 0).map((s, i) => <div key={i} style={{ width: `${s.w}%`, background: s.color }} />)}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Compact Workstream Status Table — click row for drill-through */}
            <div style={{ borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: "#f9fafb" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted }}>Workstream Status</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {[{ color: C.green, label: "Complete" }, { color: C.accent, label: "In Progress" }, { color: C.danger, label: "Blocked" }, { color: "#e5e7eb", label: "Not Started" }].map(l => (
                    <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 1, background: l.color }} />
                      <span style={{ fontSize: 10, color: C.muted }}>{l.label}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: 10, color: C.light, borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>Click row to drill →</span>
                  <button onClick={onOpenWorkstreams} style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid #bfdbfe`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontWeight: 600 }}>Open →</button>
                </div>
              </div>
              {wsRows.map(({ ws, s, pct, rag, update, openDeps }, idx) => {
                const ragC = RAG_CFG[rag];
                const pC = s.total ? (s.complete / s.total) * 100 : 0;
                const pI = s.total ? (s.inProgress / s.total) * 100 : 0;
                const pB = s.total ? (s.blocked / s.total) * 100 : 0;
                const pN = s.total ? (s.notStarted / s.total) * 100 : 0;
                const isSel = drillWs === ws;
                return (
                  <div key={ws} onClick={() => setDrillWs(isSel ? null : ws)}
                    style={{ display: "grid", gridTemplateColumns: "12px 178px 1fr 44px 110px 150px", alignItems: "center", gap: 10, padding: "7px 16px", borderBottom: idx < wsRows.length - 1 ? `1px solid ${C.border}` : "none", cursor: "pointer", background: isSel ? C.accentBg : "transparent", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                  >
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: ragC.color }} title={`RAG: ${ragC.label}`} />
                    <div style={{ fontSize: 12, color: C.text, fontWeight: s.blocked > 0 ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ws}</div>
                    <div style={{ height: 18, borderRadius: 3, overflow: "hidden", display: "flex", background: "#f3f4f6" }}>
                      {pC > 0 && <div style={{ width: `${pC}%`, background: C.green }} />}
                      {pI > 0 && <div style={{ width: `${pI}%`, background: C.accent }} />}
                      {pB > 0 && <div style={{ width: `${pB}%`, background: C.danger }} />}
                      {pN > 0 && <div style={{ width: `${pN}%`, background: "#e5e7eb" }} />}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: s.blocked > 0 ? C.danger : pct > 50 ? C.green : C.accent, textAlign: "right" }}>{pct}%</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {s.blocked > 0 && <span style={{ fontSize: 10, color: C.danger, background: C.dangerBg, border: "1px solid #fecaca", borderRadius: 3, padding: "1px 5px" }}>{s.blocked}✕</span>}
                      {openDeps > 0 && <span style={{ fontSize: 10, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 3, padding: "1px 5px" }}>⬡{openDeps}</span>}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>
                      {update?.updateText ? `"${update.updateText.slice(0, 32)}${update.updateText.length > 32 ? "…" : ""}"` : <span style={{ color: "#d1d5db" }}>No update</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Row 3: Phase Completion + Risk Heat Map */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: "16px 18px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted, marginBottom: 14 }}>Phase Completion</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {phaseStats.map(p => {
                    const bc = p.blocked > 0 ? C.danger : p.pct === 100 ? C.green : p.pct > 0 ? C.accent : "#e5e7eb";
                    return (
                      <div key={p.phase}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{p.label}</span>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {p.blocked > 0 && <span style={{ fontSize: 10, color: C.danger, fontWeight: 600 }}>{p.blocked} blocked</span>}
                            <span style={{ fontSize: 12, fontWeight: 700, color: bc }}>{p.pct}%</span>
                            <span style={{ fontSize: 10, color: C.light }}>{p.complete}/{p.total}</span>
                          </div>
                        </div>
                        <div style={{ height: 12, borderRadius: 3, overflow: "hidden", display: "flex", background: "#f3f4f6" }}>
                          {p.complete > 0 && <div style={{ width: `${(p.complete / p.total) * 100}%`, background: C.green }} />}
                          {p.inProg   > 0 && <div style={{ width: `${(p.inProg / p.total) * 100}%`, background: C.accent }} />}
                          {p.blocked  > 0 && <div style={{ width: `${(p.blocked / p.total) * 100}%`, background: C.danger }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "16px 18px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted, marginBottom: 8 }}>Risk Heat Map</div>
                <div style={{ display: "flex", gap: 3, justifyContent: "flex-end", marginBottom: 6 }}>
                  {[{ label: "R", color: C.danger }, { label: "A", color: C.warning }, { label: "G", color: C.green }].map(h => (
                    <div key={h.label} style={{ width: 28, fontSize: 9, fontWeight: 700, textAlign: "center", color: h.color }}>{h.label}</div>
                  ))}
                  <div style={{ width: 60 }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Object.entries(RISK_LABELS).map(([key, label]) => {
                    const alert = riskAlerts.find(r => r.category === key);
                    const sev = alert?.severity;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, fontSize: 11, color: C.text }}>{label}</div>
                        <div style={{ display: "flex", gap: 3 }}>
                          {CELLS_DEF.map(cell => {
                            const isLit = sev === cell.match;
                            return <div key={cell.label} style={{ width: 28, height: 16, borderRadius: 3, background: isLit ? cell.bg : "#f3f4f6", border: `1px solid ${isLit ? cell.border : "#e5e7eb"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: isLit ? cell.color : "#d1d5db" }}>{cell.label}</div>;
                          })}
                        </div>
                        <div style={{ width: 60, textAlign: "right" }}>
                          {alert ? <SeverityBadge severity={alert.severity} /> : <span style={{ fontSize: 10, color: "#d1d5db" }}>—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Row 4: Weekly Dependencies Summary */}
            {depsWithBlockers.length > 0 && (
              <div style={{ borderRadius: 10, background: C.card, border: `1px solid #ddd6fe`, overflow: "hidden" }}>
                <div style={{ padding: "10px 16px", background: "#f5f3ff", borderBottom: `1px solid #ddd6fe`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: "#7c3aed" }}>Weekly Dependencies Summary</span>
                    <span style={{ fontSize: 11, color: "#7c3aed", marginLeft: 10 }}>{depsWithBlockers.length} items awaiting upstream</span>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {Array.from(wsDepCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([ws, count]) => (
                      <span key={ws} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: "#ede9fe", color: "#7c3aed", border: "1px solid #ddd6fe", fontWeight: 600 }}>
                        {ws.split(" ")[0]}: {count}
                      </span>
                    ))}
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Item ID", "Workstream", "Description", "Status", "Waiting On"].map(h => (
                        <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.muted, background: "#fafafa" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {depsWithBlockers.slice(0, 12).map(item => {
                      const blockers = item.dependencies.map(dId => itemMap.get(dId)).filter(d => d && d.status !== "complete" && d.status !== "na") as ChecklistItem[];
                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: "6px 12px", fontWeight: 700, color: "#7c3aed", fontSize: 11 }}>{item.itemId}</td>
                          <td style={{ padding: "6px 12px", color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{item.workstream.split(" ").slice(0, 2).join(" ")}</td>
                          <td style={{ padding: "6px 12px", color: C.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</td>
                          <td style={{ padding: "6px 12px" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: item.status === "blocked" ? C.danger : C.warning, background: item.status === "blocked" ? C.dangerBg : C.warningBg, padding: "1px 6px", borderRadius: 3 }}>{item.status.replace("_", " ")}</span>
                          </td>
                          <td style={{ padding: "6px 12px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {blockers.slice(0, 3).map(d => <span key={d.id} style={{ fontSize: 10, color: d.status === "blocked" ? C.danger : C.muted, background: d.status === "blocked" ? C.dangerBg : "#f9fafb", padding: "1px 6px", borderRadius: 3, border: `1px solid ${d.status === "blocked" ? "#fecaca" : C.border}` }}>{d.itemId}</span>)}
                              {blockers.length > 3 && <span style={{ fontSize: 10, color: C.light }}>+{blockers.length - 3}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {depsWithBlockers.length > 12 && <div style={{ padding: "7px 12px", fontSize: 11, color: C.light, borderTop: `1px solid ${C.border}` }}>+{depsWithBlockers.length - 12} more with open dependencies</div>}
              </div>
            )}

            {/* Row 5: Active Risk Cards */}
            {riskAlerts.length > 0 && (
              <div style={{ padding: "16px 18px", borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9, color: C.muted, marginBottom: 12 }}>Active Risk Alerts — {riskAlerts.length} open</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                  {riskAlerts.map(r => {
                    const isExp = expandedRisk === r.id;
                    const bc = r.severity === "critical" ? C.danger : r.severity === "high" ? C.warning : C.accent;
                    const bg = r.severity === "critical" ? C.dangerBg : r.severity === "high" ? C.warningBg : C.accentBg;
                    return (
                      <div key={r.id} onClick={() => setExpandedRisk(isExp ? null : r.id)} style={{ padding: "12px 14px", borderRadius: 8, background: bg, border: `1px solid ${bc}44`, borderLeft: `4px solid ${bc}`, cursor: "pointer" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3 }}>{RISK_LABELS[r.category]}</div>
                            <SeverityBadge severity={r.severity} />
                          </div>
                          <span style={{ fontSize: 10, color: C.light }}>{isExp ? "▲" : "▼"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: isExp ? 8 : 0 }}>
                          {r.affectedWorkstreams.map(ws => <span key={ws} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "rgba(255,255,255,0.6)", color: C.text, border: `1px solid ${bc}33` }}>{ws.split(" ")[0]}</span>)}
                        </div>
                        {isExp && (
                          <div>
                            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 8 }}>{r.description}</div>
                            <div style={{ borderTop: `1px solid ${bc}33`, paddingTop: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Mitigation</div>
                              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{r.mitigation}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {riskAlerts.length === 0 && (
              <div style={{ padding: 22, borderRadius: 10, background: C.greenBg, border: `1px solid ${C.greenBorder}`, textAlign: "center" }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>✓</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.green }}>No material risks detected</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>The decision tree found no risk triggers for this deal profile.</div>
              </div>
            )}
          </>
        )}

        {/* ── WEEKLY REPORT MODE ── */}
        {viewMode === "report" && (
          <WeeklyReportView
            deal={deal} kpis={kpis} wsRows={wsRows} riskAlerts={riskAlerts}
            depsWithBlockers={depsWithBlockers} itemMap={itemMap} weekStr={weekStr}
          />
        )}
      </div>

      {/* ── Drill-through panel ── */}
      {drillWs && (
        <div style={{ width: 340, flexShrink: 0, borderRadius: 10, background: C.card, border: `1px solid ${C.border}`, overflow: "hidden", position: "sticky", top: 0, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, background: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 270 }}>{drillWs}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Drill-through · {drillItems.length} items</div>
            </div>
            <button onClick={() => setDrillWs(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.light, lineHeight: 1, padding: "2px 4px" }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
            {(["blocked", "in_progress", "not_started", "complete"] as const).map(status => {
              const items = drillItems.filter(i => i.status === status);
              if (items.length === 0) return null;
              const sc: Record<string, { color: string; bg: string }> = {
                blocked: { color: C.danger, bg: C.dangerBg }, in_progress: { color: C.accent, bg: C.accentBg },
                not_started: { color: C.light, bg: "#f9fafb" }, complete: { color: C.green, bg: C.greenBg },
              };
              const c = sc[status];
              const lbl = { blocked: "Blocked", in_progress: "In Progress", not_started: "Not Started", complete: "Complete" }[status];
              return (
                <div key={status} style={{ marginBottom: 10, padding: "0 12px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 }}>{lbl} ({items.length})</div>
                  {items.slice(0, 7).map(item => (
                    <div key={item.id} style={{ padding: "6px 8px", marginBottom: 3, borderRadius: 5, background: c.bg, border: `1px solid ${c.color}22` }}>
                      <div style={{ display: "flex", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: c.color, flexShrink: 0 }}>{item.itemId}</span>
                        <span style={{ fontSize: 10, color: C.light }}>{PHASE_LABELS[item.phase] ?? item.phase}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.text, lineHeight: 1.3 }}>{item.description}</div>
                      {item.blockedReason && <div style={{ fontSize: 10, color: C.danger, marginTop: 3, fontStyle: "italic" }}>⚠ {item.blockedReason}</div>}
                    </div>
                  ))}
                  {items.length > 7 && <div style={{ fontSize: 10, color: C.light, paddingLeft: 4, marginTop: 2 }}>+{items.length - 7} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Weekly Report View ───────────────────────────────────────────────────────

function WeeklyReportView({
  deal, kpis, wsRows, riskAlerts, depsWithBlockers, itemMap, weekStr,
}: {
  deal: GeneratedDeal;
  kpis: ReturnType<typeof getKpis>;
  wsRows: { ws: string; s: { complete: number; inProgress: number; blocked: number; notStarted: number; total: number }; pct: number; rag: string; update: { ragStatus: string; updateText: string; updatedAt: string } | undefined; openDeps: number }[];
  riskAlerts: RiskAlert[];
  depsWithBlockers: ChecklistItem[];
  itemMap: Map<string, ChecklistItem>;
  weekStr: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Report header */}
      <div style={{ padding: "20px 24px", borderRadius: 10, background: "linear-gradient(135deg, #192819, #2e4a2e)", color: "#f0fdf4" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>Program Status — Weekly Report</div>
        <div style={{ fontSize: 11, color: "#86efac", marginBottom: 16 }}>{deal.intake.dealName} · {weekStr}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Overall Progress", value: `${kpis.pctComplete}%`, sub: `${kpis.complete} / ${kpis.total} items` },
            { label: "Blocked", value: kpis.blocked, sub: "items need attention", warn: true },
            { label: "Active Risks", value: riskAlerts.length, sub: `${riskAlerts.filter(r => r.severity === "critical").length} critical` },
            { label: "Open Dependencies", value: depsWithBlockers.length, sub: "awaiting upstream" },
          ].map(m => (
            <div key={m.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: m.warn && Number(m.value) > 0 ? "#fca5a5" : "#86efac", lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 10, color: "#86efac", marginTop: 3 }}>{m.label}</div>
              <div style={{ fontSize: 9, color: "#4ade8044", marginTop: 1 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Workstream RAG status table */}
      <div style={{ borderRadius: 10, background: "#fff", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ padding: "10px 14px", background: "#f9fafb", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.9 }}>Workstream RAG Status</div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: "#f9fafb" }}>
              {["RAG", "Workstream", "Done %", "✓", "→", "✕", "○", "Status Update"].map(h => (
                <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.muted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {wsRows.map(({ ws, s, pct, rag, update }) => {
              const ragC = RAG_CFG[rag as keyof typeof RAG_CFG];
              return (
                <tr key={ws} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: ragC.color }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: ragC.color }}>{ragC.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: "7px 12px", fontWeight: 600, color: C.text }}>{ws}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <span style={{ fontWeight: 700, color: pct === 100 ? C.green : pct > 50 ? C.green : pct > 0 ? C.accent : C.light }}>{pct}%</span>
                  </td>
                  <td style={{ padding: "7px 12px", color: C.green, fontWeight: 600 }}>{s.complete}</td>
                  <td style={{ padding: "7px 12px", color: C.accent }}>{s.inProgress}</td>
                  <td style={{ padding: "7px 12px", color: s.blocked > 0 ? C.danger : C.light, fontWeight: s.blocked > 0 ? 700 : 400 }}>{s.blocked}</td>
                  <td style={{ padding: "7px 12px", color: C.light }}>{s.notStarted}</td>
                  <td style={{ padding: "7px 12px", maxWidth: 220 }}>
                    {update?.updateText ? (
                      <div>
                        <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{update.updateText}</div>
                        {update.updatedAt && <div style={{ fontSize: 9, color: C.light, marginTop: 1 }}>{update.updatedAt}</div>}
                      </div>
                    ) : <span style={{ fontSize: 11, color: "#d1d5db", fontStyle: "italic" }}>No update logged</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dependency Register */}
      {depsWithBlockers.length > 0 && (
        <div style={{ borderRadius: 10, background: "#fff", border: `1px solid #ddd6fe`, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#f5f3ff", borderBottom: `1px solid #ddd6fe` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.9 }}>
              Dependency Register — {depsWithBlockers.length} Open Items
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Item ID", "Workstream", "Description", "Status", "Waiting On"].map(h => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.muted, background: "#fafafa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depsWithBlockers.map(item => {
                const blockers = item.dependencies.map(dId => itemMap.get(dId)).filter(d => d && d.status !== "complete" && d.status !== "na") as ChecklistItem[];
                return (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "7px 12px", fontWeight: 700, color: "#7c3aed", fontSize: 11 }}>{item.itemId}</td>
                    <td style={{ padding: "7px 12px", color: C.muted, fontSize: 11 }}>{item.workstream.split(" ").slice(0, 2).join(" ")}</td>
                    <td style={{ padding: "7px 12px", color: C.text, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description}</td>
                    <td style={{ padding: "7px 12px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: item.status === "blocked" ? C.danger : C.warning, background: item.status === "blocked" ? C.dangerBg : C.warningBg, padding: "1px 6px", borderRadius: 3 }}>{item.status.replace("_", " ")}</span>
                    </td>
                    <td style={{ padding: "7px 12px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {blockers.map(d => <span key={d.id} style={{ fontSize: 10, color: d.status === "blocked" ? C.danger : C.muted, background: d.status === "blocked" ? C.dangerBg : "#f9fafb", padding: "1px 6px", borderRadius: 3, border: `1px solid ${d.status === "blocked" ? "#fecaca" : C.border}` }}>{d.itemId}</span>)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Risk Register */}
      {riskAlerts.length > 0 && (
        <div style={{ borderRadius: 10, background: "#fff", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "#f9fafb", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.9 }}>
              Risk Register — {riskAlerts.length} Active
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Risk Category", "Severity", "Description", "Mitigation", "Workstreams"].map(h => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.muted, background: "#fafafa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {riskAlerts.map(r => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 12px", fontWeight: 600, color: C.text }}>{RISK_LABELS[r.category]}</td>
                  <td style={{ padding: "7px 12px" }}><SeverityBadge severity={r.severity} /></td>
                  <td style={{ padding: "7px 12px", color: C.muted, maxWidth: 200, fontSize: 11, lineHeight: 1.4 }}>{r.description}</td>
                  <td style={{ padding: "7px 12px", color: C.muted, maxWidth: 180, fontSize: 11, lineHeight: 1.4 }}>{r.mitigation}</td>
                  <td style={{ padding: "7px 12px" }}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {r.affectedWorkstreams.map(ws => <span key={ws} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: C.accentBg, color: C.accent, border: "1px solid #bfdbfe" }}>{ws.split(" ")[0]}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ─── Program Status Panel ─────────────────────────────────────────────────────

function ProgramStatusPanel({
  deal,
  wsStats,
  openDepsItems,
  onOpenWorkstreams,
  compact = false,
}: {
  deal: GeneratedDeal;
  wsStats: ReturnType<typeof getWorkstreamStats>;
  openDepsItems: ChecklistItem[];
  onOpenWorkstreams: () => void;
  compact?: boolean;
}) {
  const workstreams = Array.from(wsStats.keys());
  const updatesCount = Object.keys(deal.workstreamUpdates || {}).length;

  return (
    <div style={{ padding: compact ? 14 : 20, borderRadius: 10, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Program Status — by In-Scope Workstream
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.light }}>{updatesCount}/{workstreams.length} updated</span>
          <button onClick={onOpenWorkstreams} style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid #bfdbfe`, borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontWeight: 600 }}>
            Update →
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 8 }}>
        {workstreams.map(ws => {
          const stats = wsStats.get(ws);
          if (!stats) return null;
          const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
          const update = deal.workstreamUpdates?.[ws];
          const rag = update?.ragStatus ?? "not_set";
          const ragC = RAG_CFG[rag];
          const openDepsForWs = openDepsItems.filter(i => i.workstream === ws).length;
          const barColor = stats.blocked > 0 ? C.danger : pct > 50 ? C.green : C.accent;

          return (
            <div key={ws} style={{
              padding: "10px 12px", borderRadius: 8, border: `1px solid ${rag !== "not_set" ? ragC.border : C.border}`,
              background: rag !== "not_set" ? ragC.bg : "#fafafa",
              borderLeft: `3px solid ${ragC.color}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ragC.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text, flex: 1 }}>{ws}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pct}%</span>
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", height: 3, background: "#e5e7eb", borderRadius: 2, marginBottom: 6 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 2 }} />
              </div>

              <div style={{ display: "flex", gap: 10, fontSize: 10, color: C.light, marginBottom: update?.updateText ? 6 : 0 }}>
                <span style={{ color: C.green }}>✓ {stats.complete}</span>
                <span style={{ color: C.accent }}>→ {stats.inProgress}</span>
                {stats.blocked > 0 && <span style={{ color: C.danger, fontWeight: 700 }}>✕ {stats.blocked} blocked</span>}
                {openDepsForWs > 0 && <span style={{ color: "#7c3aed" }}>⬡ {openDepsForWs} dep{openDepsForWs > 1 ? "s" : ""}</span>}
                {update?.updatedAt && <span style={{ marginLeft: "auto" }}>{update.updatedAt}</span>}
              </div>

              {update?.updateText && (
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, borderTop: `1px solid ${ragC.border}`, paddingTop: 6, marginTop: 4 }}>
                  {update.updateText.length > 120 ? update.updateText.slice(0, 120) + "…" : update.updateText}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Workstream Tier Section ──────────────────────────────────────────────────

function WorkstreamTier({
  label, color, bgColor, entries, selectedWs, setSelectedWs, onOpen, deal,
}: {
  label: string;
  color: string;
  bgColor: string;
  entries: [string, { complete: number; inProgress: number; blocked: number; notStarted: number; total: number } | undefined][];
  selectedWs: string | null;
  setSelectedWs: (ws: string | null) => void;
  onOpen: (ws: string) => void;
  deal: GeneratedDeal;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color }}>{label}</div>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 10, color: C.light }}>{entries.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.map(([ws, stats]) => {
          if (!stats) return null;
          const pct = stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
          const barColor = stats.blocked > 0 ? C.danger : pct > 50 ? C.green : C.accent;
          const isSelected = selectedWs === ws;
          const wsUpdate = deal.workstreamUpdates?.[ws];
          const rag = wsUpdate?.ragStatus ?? "not_set";
          const ragC = RAG_CFG[rag];
          return (
            <div key={ws} onClick={() => setSelectedWs(isSelected ? null : ws)}
              style={{
                cursor: "pointer", padding: "10px 12px", borderRadius: 8,
                background: isSelected ? bgColor : "transparent",
                border: `1px solid ${isSelected ? color + "55" : "transparent"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {rag !== "not_set" && <div style={{ width: 7, height: 7, borderRadius: "50%", background: ragC.color, flexShrink: 0 }} title={`Status: ${ragC.label}`} />}
                  <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{ws}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {stats.blocked > 0 && <span style={{ fontSize: 11, color: C.danger, fontWeight: 600 }}>{stats.blocked} blocked</span>}
                  <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{pct}%</span>
                </div>
              </div>
              <div style={{ width: "100%", height: 4, background: "#f3f4f6", borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
              {isSelected && (
                <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ color: C.green }}>✓ {stats.complete}</span>
                  <span style={{ color: C.accent }}>→ {stats.inProgress}</span>
                  <span style={{ color: C.danger }}>✕ {stats.blocked}</span>
                  <span style={{ color: C.light }}>○ {stats.notStarted}</span>
                  {wsUpdate?.updateText && (
                    <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      "{wsUpdate.updateText.slice(0, 60)}{wsUpdate.updateText.length > 60 ? "…" : ""}"
                    </span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); onOpen(ws); }}
                    style={{ marginLeft: "auto", fontSize: 10, color: C.accent, background: C.accentBg, border: `1px solid #bfdbfe`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>
                    Open →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: RiskAlert }) {
  const [expanded, setExpanded] = useState(false);
  const borderColor = risk.severity === "critical" ? "#fecaca" : risk.severity === "high" ? "#fde68a" : "#bfdbfe";
  const textColor = risk.severity === "critical" ? C.danger : risk.severity === "high" ? C.warning : C.accent;
  return (
    <div style={{ padding: "10px 12px", borderRadius: 7, background: "#fafafa", border: `1px solid ${borderColor}`, cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{RISK_LABELS[risk.category]}</span>
        <SeverityBadge severity={risk.severity} />
      </div>
      {expanded && <div style={{ marginTop: 8, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{risk.description}</div>}
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
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
      {severity}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 12px", borderRadius: 7,
  border: "1px solid #e2e8e2", background: "#fff",
  color: "#374151", fontSize: 12, outline: "none", cursor: "pointer",
};
