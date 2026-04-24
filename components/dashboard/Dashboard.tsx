"use client";

import { useState, useEffect, useRef } from "react";
import type { GeneratedDeal, ChecklistItem, RiskAlert, ItemStatus, Priority } from "@/lib/types";
import { useAgentContext } from "@/lib/agent-context";
import { getKpis, getWorkstreamStats } from "@/lib/decision-tree";
import { generateSnapshot, getCurrentPeriodEnd, computeProgramRAG } from "@/lib/progress";
import BowlerTable from "./BowlerTable";
import HelpDrawer from "./HelpDrawer";
import ReportDrafter from "./ReportDrafter";
import SlidePreview from "./SlidePreview";
import AgentAdminTab from "@/components/agent-admin/AgentAdminTab";
import { MustHaveWarningModal } from "@/components/checklist/MustHaveWarningModal";

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
    status?: string;
    ownerId?: string;
  }) => void;
  onUpdateItem: (itemId: string, updates: Partial<Pick<ChecklistItem, "description" | "workstream" | "phase" | "section" | "priority" | "status" | "ownerId">>) => void;
  onAddPerson: (name: string, role?: string, email?: string) => void;
  onAssignOwner: (itemId: string, ownerId: string | undefined) => void;
  onAddNote: (itemId: string, text: string) => void;
  onAddAttachment: (itemId: string, name: string, url?: string) => void;
  onSaveSnapshot: (snapshot: any) => void;
  onUpdateNarrative: (snapshotId: string, workstream: string, updates: any) => void;
  onSaveFilter: (name: string, filters: any) => void;
  onDeleteFilter: (filterId: string) => void;
  onBulkAssign: (itemIds: string[], ownerId: string) => void;
  onAddRisk: (risk: { category: string; severity: string; description: string; mitigation?: string; linkedItemIds?: string[]; source?: string }) => void;
  onUpdateRisk: (riskId: string, updates: { status?: string; notes?: string; linkedItemIds?: string[] }) => void;
  onAddDependency: (itemId: string, dependsOnId: string, depType?: string, detail?: string) => void;
  onRemoveDependency: (itemId: string, dependsOnId: string) => void;
  onUpdateRagOverride: (workstream: string, rag: "red" | "amber" | "green" | undefined) => void;
  onUpdateDeal?: (updates: Partial<import("@/lib/types").GeneratedDeal>) => void;
  onUpdatePerson?: (personId: string, updates: Partial<import("@/lib/types").Person>) => void;
  onUpdateWorkstreamOverride?: (workstream: string, patch: Partial<import("@/lib/types").WorkstreamContextOverride> & { action?: "reactivate" | "priority_bump" | "priority_reduce" }) => void;
  onForceSave?: () => Promise<void>;
  lastSavedAt?: string;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

function ProgressChart({ workstreams }: { workstreams: Array<{ workstream: string; completed: number; inProgress: number; blocked: number; total: number; pctComplete: number; ragStatus: string; ragOverride?: string }> }) {
  const barHeight = 22;
  const labelWidth = 140;
  const chartWidth = 500;
  const h = workstreams.length * (barHeight + 6) + 30;
  return (
    <svg width="100%" viewBox={`0 0 ${labelWidth + chartWidth + 60} ${h}`} style={{ fontFamily: "system-ui, sans-serif" }}>
      <text x={labelWidth} y={14} fontSize={9} fill="#94A3B8" fontWeight={700}>WORKSTREAM PROGRESS</text>
      {workstreams.map((ws, i) => {
        const y = 26 + i * (barHeight + 6);
        const maxW = chartWidth;
        const compW = ws.total ? (ws.completed / ws.total) * maxW : 0;
        const ipW = ws.total ? (ws.inProgress / ws.total) * maxW : 0;
        const blkW = ws.total ? (ws.blocked / ws.total) * maxW : 0;
        const rag = ws.ragOverride || ws.ragStatus;
        const ragColor = rag === "red" ? "#EF4444" : rag === "amber" ? "#F59E0B" : "#10B981";
        return (
          <g key={ws.workstream}>
            <circle cx={10} cy={y + barHeight / 2} r={5} fill={ragColor} />
            <text x={22} y={y + barHeight / 2 + 4} fontSize={10} fill="#E2E8F0" fontWeight={500}>{ws.workstream.length > 20 ? ws.workstream.substring(0, 20) + "…" : ws.workstream}</text>
            <rect x={labelWidth} y={y} width={maxW} height={barHeight} rx={3} fill="#1E293B" />
            <rect x={labelWidth} y={y} width={compW} height={barHeight} rx={3} fill="#10B981" />
            <rect x={labelWidth + compW} y={y} width={ipW} height={barHeight} fill="#3B82F6" />
            <rect x={labelWidth + compW + ipW} y={y} width={blkW} height={barHeight} fill="#EF4444" />
            <text x={labelWidth + maxW + 8} y={y + barHeight / 2 + 4} fontSize={10} fill="#94A3B8" fontWeight={700}>{ws.pctComplete}%</text>
          </g>
        );
      })}
      {/* Legend */}
      <g transform={`translate(${labelWidth}, ${h - 14})`}>
        <rect x={0} y={0} width={10} height={10} rx={2} fill="#10B981" /><text x={14} y={9} fontSize={8} fill="#94A3B8">Complete</text>
        <rect x={70} y={0} width={10} height={10} rx={2} fill="#3B82F6" /><text x={84} y={9} fontSize={8} fill="#94A3B8">In Progress</text>
        <rect x={150} y={0} width={10} height={10} rx={2} fill="#EF4444" /><text x={164} y={9} fontSize={8} fill="#94A3B8">Blocked</text>
      </g>
    </svg>
  );
}

function RAGTrend({ snapshots, workstream }: { snapshots: Array<{ workstreams: Array<{ workstream: string; ragStatus: string; ragOverride?: string }> }>; workstream: string }) {
  const dots = snapshots.slice(-8).map(snap => {
    const ws = snap.workstreams.find(w => w.workstream === workstream);
    return ws?.ragOverride || ws?.ragStatus || "green";
  });
  if (dots.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {dots.map((rag, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: rag === "red" ? "#EF4444" : rag === "amber" ? "#F59E0B" : "#10B981",
          opacity: 0.4 + (i / dots.length) * 0.6,
        }} />
      ))}
    </div>
  );
}


function DependencyMatrix({ items }: { items: Array<{ itemId: string; workstream: string; dependencies: string[] }> }) {
  // Build workstream-to-workstream dependency counts
  const wsSet = new Set(items.map(i => i.workstream));
  const wsNames = Array.from(wsSet).sort();
  const matrix: Record<string, Record<string, number>> = {};
  wsNames.forEach(ws => { matrix[ws] = {}; wsNames.forEach(ws2 => { matrix[ws][ws2] = 0; }); });

  const itemWsMap = new Map(items.map(i => [i.itemId, i.workstream]));
  items.forEach(item => {
    (item.dependencies || []).forEach(depId => {
      const depWs = itemWsMap.get(depId);
      if (depWs && depWs !== item.workstream) {
        matrix[item.workstream][depWs] = (matrix[item.workstream][depWs] || 0) + 1;
      }
    });
  });

  // Only show workstreams with cross-workstream deps
  const activeWs = wsNames.filter(ws =>
    wsNames.some(ws2 => ws !== ws2 && (matrix[ws][ws2] > 0 || matrix[ws2][ws] > 0))
  );
  if (activeWs.length === 0) return <div style={{ fontSize: 11, color: "#94A3B8", padding: 8 }}>No cross-workstream dependencies detected</div>;

  const cellSize = 32;
  const labelW = 140;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 9 }}>
        <thead>
          <tr>
            <th style={{ width: labelW, padding: 4, textAlign: "left", color: "#94A3B8", fontSize: 8 }}>DEPENDS ON →</th>
            {activeWs.map(ws => (
              <th key={ws} style={{ width: cellSize, padding: 2, textAlign: "center", color: "#94A3B8", fontSize: 7, writingMode: "vertical-lr", transform: "rotate(180deg)", height: 80 }}>
                {ws.length > 18 ? ws.substring(0, 18) + "…" : ws}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeWs.map(ws => (
            <tr key={ws}>
              <td style={{ padding: "2px 4px", fontSize: 9, fontWeight: 600, color: "#E2E8F0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: labelW }}>
                {ws}
              </td>
              {activeWs.map(ws2 => {
                const count = matrix[ws][ws2];
                const bg = ws === ws2 ? "#0F1B2D" : count > 3 ? "#EF444444" : count > 0 ? "#3B82F622" : "transparent";
                const color = count > 3 ? "#EF4444" : count > 0 ? "#3B82F6" : "#334155";
                return (
                  <td key={ws2} style={{
                    width: cellSize, height: cellSize, textAlign: "center", padding: 0,
                    background: bg, border: "1px solid #1E293B", fontWeight: count > 0 ? 700 : 400,
                    color, fontSize: 10,
                  }}>
                    {ws === ws2 ? "—" : count > 0 ? count : "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function BurndownChart({ snapshots, totalItems }: { snapshots: Array<{ periodEnd: string; summary: { completed: number; totalActive: number } }>; totalItems: number }) {
  if (snapshots.length < 2) return (
    <div style={{ fontSize: 10, color: '#94A3B8', padding: 12, textAlign: 'center' }}>
      Capture 2+ snapshots to see burndown trend. Each snapshot records progress at a point in time.
    </div>
  );

  const w = 600;
  const h = 180;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const maxItems = Math.max(totalItems, ...snapshots.map(s => s.summary.totalActive));
  const points = snapshots.map((s, i) => ({
    x: padL + (i / (snapshots.length - 1)) * chartW,
    yComplete: padT + chartH - (s.summary.completed / maxItems) * chartH,
    yRemaining: padT + chartH - ((s.summary.totalActive - s.summary.completed) / maxItems) * chartH,
    label: s.periodEnd.slice(5),
    completed: s.summary.completed,
    remaining: s.summary.totalActive - s.summary.completed,
  }));

  const completeLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yComplete}`).join(" ");
  const remainingLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yRemaining}`).join(" ");

  const idealStart = padT + chartH - (maxItems / maxItems) * chartH;
  const idealEnd = padT + chartH;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ fontFamily: "system-ui, sans-serif" }}>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padT + chartH * (1 - pct);
        return (
          <g key={pct}>
            <line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke='#334155' strokeDasharray='4,4' />
            <text x={padL - 8} y={y + 3} textAnchor='end' fontSize={8} fill='#64748B'>{Math.round(maxItems * pct)}</text>
          </g>
        );
      })}
      <line x1={points[0].x} y1={idealStart} x2={points[points.length - 1].x} y2={idealEnd} stroke='#64748B' strokeDasharray='6,4' strokeWidth={1} />
      <path d={remainingLine} fill='none' stroke='#F59E0B' strokeWidth={2} />
      <path d={completeLine} fill='none' stroke='#10B981' strokeWidth={2} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.yComplete} r={3} fill='#10B981' />
          <circle cx={p.x} cy={p.yRemaining} r={3} fill='#F59E0B' />
          <text x={p.x} y={h - 8} textAnchor='middle' fontSize={8} fill='#64748B'>{p.label}</text>
        </g>
      ))}
      <g transform={`translate(${padL + 10}, ${padT})`}>
        <line x1={0} y1={0} x2={16} y2={0} stroke='#10B981' strokeWidth={2} />
        <text x={20} y={3} fontSize={8} fill='#94A3B8'>Completed</text>
        <line x1={80} y1={0} x2={96} y2={0} stroke='#F59E0B' strokeWidth={2} />
        <text x={100} y={3} fontSize={8} fill='#94A3B8'>Remaining</text>
        <line x1={170} y1={0} x2={186} y2={0} stroke='#64748B' strokeWidth={1} strokeDasharray='4,4' />
        <text x={190} y={3} fontSize={8} fill='#64748B'>Ideal</text>
      </g>
    </svg>
  );
}

export default function Dashboard({
  deal,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateBlockedReason,
  onReset,
  onAddTask,
  onUpdateItem,
  onAddPerson,
  onAssignOwner,
  onAddNote,
  onAddAttachment,
  onSaveSnapshot,
  onUpdateNarrative,
  onSaveFilter,
  onDeleteFilter,
  onBulkAssign,
  onAddRisk,
  onUpdateRisk,
  onAddDependency,
  onRemoveDependency,
  onUpdateRagOverride,
  onUpdateDeal,
  onUpdatePerson,
  onUpdateWorkstreamOverride,
  onForceSave,
  lastSavedAt,
  saveStatus = "idle",
}: Props) {
  const [activeTab, setActiveTab] = useState<"live_status" | "checklist" | "team" | "risks" | "timeline" | "steerco" | "admin" | "agent">("live_status");
  const [showHelp, setShowHelp] = useState(false);
  const [selectedWs, setSelectedWs] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [editingItem, setEditingItem] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [editWs, setEditWs] = useState("");
  const [editCustomWs, setEditCustomWs] = useState("");
  const [editPhase, setEditPhase] = useState("");
  const [editSection, setEditSection] = useState("");

  // Keep selectedItem in sync with live data
  useEffect(() => {
    if (selectedItem) {
      const updated = deal.checklistItems.find(i => i.id === selectedItem.id);
      if (updated && updated !== selectedItem) {
        setSelectedItem(updated);
      }
    }
  }, [deal.checklistItems]);

  const [guidanceText, setGuidanceText] = useState<string>("");
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterWs, setFilterWs] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskWs, setNewTaskWs] = useState<string>("");
  const [newTaskCustomWs, setNewTaskCustomWs] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskSection, setNewTaskSection] = useState("");
  const [newTaskPhase, setNewTaskPhase] = useState<string>("day_30");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("medium");
  const [newTaskStatus, setNewTaskStatus] = useState<string>("not_started");
  const [newTaskOwner, setNewTaskOwner] = useState<string>("");
  // showSteerCo removed — SteerCo is now a full tab
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNaItems, setShowNaItems] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonRole, setNewPersonRole] = useState("");
  const [newPersonEmail, setNewPersonEmail] = useState("");
  const [bulkAssignWs, setBulkAssignWs] = useState("");
  const [bulkAssignPerson, setBulkAssignPerson] = useState("");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [newNoteText, setNewNoteText] = useState("");
  const [showAddAttachment, setShowAddAttachment] = useState(false);
  const [newAttName, setNewAttName] = useState("");
  const [newAttUrl, setNewAttUrl] = useState("");
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [editingNarrative, setEditingNarrative] = useState<string | null>(null);
  const [narrativeText, setNarrativeText] = useState("");
  const [narrativeRisks, setNarrativeRisks] = useState("");
  const [narrativeNext, setNarrativeNext] = useState("");
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortCol, setSortCol] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [newRiskCategory, setNewRiskCategory] = useState("regulatory_delay");
  const [newRiskSeverity, setNewRiskSeverity] = useState("medium");
  const [newRiskDesc, setNewRiskDesc] = useState("");
  const [newRiskMitigation, setNewRiskMitigation] = useState("");
  const [showAddDep, setShowAddDep] = useState<string | null>(null);
  const [newDepTarget, setNewDepTarget] = useState("");
  const [newDepType, setNewDepType] = useState("predecessor");
  const [newDepDetail, setNewDepDetail] = useState("");
  const [taskAddedFlash, setTaskAddedFlash] = useState(false);

  // SteerCo narrative sections
  const [scNarrative, setScNarrative] = useState<Record<string, string>>({
    overallStatus: "", keyIssues: "", keyDelays: "", keyFindings: "",
    materialImpacts: "", materialDependencies: "", materialOperationalImpacts: "",
    keyDecisionsEscalations: "", financialImpacts: "", overallBudget: "",
  });
  const [scSaving, setScSaving] = useState(false);
  const [scSaved, setScSaved] = useState(false);
  const [showReportDrafter, setShowReportDrafter] = useState(false);
  const [showSlidePreview, setShowSlidePreview] = useState(false);

  // Ref keeps agent getters pointing to the latest render's values without re-registering on every state change
  const agentStateRef = useRef({ deal, activeTab, filterWs, filterStatus, filterPriority, filterPhase, filterOwner });
  agentStateRef.current = { deal, activeTab, filterWs, filterStatus, filterPriority, filterPhase, filterOwner };

  // Register callbacks with the global agent context so the assistant can drive the app
  const { register, unregister } = useAgentContext();
  useEffect(() => {
    register({
      setActiveTab: (tab) => setActiveTab(tab as typeof activeTab),
      setFilterWs,
      setFilterStatus,
      setFilterPriority,
      setFilterPhase,
      setFilterOwner,
      setSearchText,
      onUpdateStatus,
      onAssignOwner,
      onBulkAssign,
      onSaveSnapshot,
      getDeal: () => agentStateRef.current.deal,
      getActiveTab: () => agentStateRef.current.activeTab,
      getFilterState: () => ({
        workstream: agentStateRef.current.filterWs,
        status: agentStateRef.current.filterStatus,
        priority: agentStateRef.current.filterPriority,
        phase: agentStateRef.current.filterPhase,
        owner: agentStateRef.current.filterOwner,
      }),
    });
    return () => unregister();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSteerCoNarrative = async () => {
    if (!deal.id) return;
    setScSaving(true);
    try {
      await fetch("/api/steerco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dealId: deal.id,
          periodLabel: getCurrentPeriodEnd(),
          ...scNarrative,
          pctComplete: kpis.pctComplete,
          status: "draft",
        }),
      });
      setScSaved(true);
      setTimeout(() => setScSaved(false), 2000);
    } catch (e) { console.warn("Failed to save narrative:", e); }
    finally { setScSaving(false); }
  };

  // Load existing narrative on SteerCo tab mount
  const loadSteerCoNarrative = async () => {
    if (!deal.id) return;
    try {
      const res = await fetch(`/api/steerco?dealId=${deal.id}`);
      const data = await res.json();
      if (data.narratives && data.narratives.length > 0) {
        const n = data.narratives[0];
        setScNarrative({
          overallStatus: n.overall_status || "",
          keyIssues: n.key_issues || "",
          keyDelays: n.key_delays || "",
          keyFindings: n.key_findings || "",
          materialImpacts: n.material_impacts || "",
          materialDependencies: n.material_dependencies || "",
          materialOperationalImpacts: n.material_operational_impacts || "",
          keyDecisionsEscalations: n.key_decisions_escalations || "",
          financialImpacts: n.financial_impacts || "",
          overallBudget: n.overall_budget || "",
        });
      }
    } catch {}
  };

  // Auto-load SteerCo narratives when deal loads from DB
  useEffect(() => {
    if (deal.id) loadSteerCoNarrative();
  }, [deal.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setEditingItem(false);
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
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      if (!item.description.toLowerCase().includes(q) && !item.itemId.toLowerCase().includes(q) && !item.workstream.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Sort visible items
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { blocked: 0, in_progress: 1, not_started: 2, complete: 3, na: 4 };
  const phaseOrder: Record<string, number> = { pre_close: 0, day_1: 1, day_30: 2, day_60: 3, day_90: 4, year_1: 5 };

  const sortedItems = [...visibleItems].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "id": cmp = a.itemId.localeCompare(b.itemId); break;
      case "workstream": cmp = a.workstream.localeCompare(b.workstream); break;
      case "task": cmp = a.description.localeCompare(b.description); break;
      case "phase": cmp = (phaseOrder[a.phase] ?? 9) - (phaseOrder[b.phase] ?? 9); break;
      case "priority": cmp = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9); break;
      case "status": cmp = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9); break;
      case "owner": {
        const aName = deal.people.find(p => p.id === a.ownerId)?.name || "zzz";
        const bName = deal.people.find(p => p.id === b.ownerId)?.name || "zzz";
        cmp = aName.localeCompare(bName);
        break;
      }
      default: cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const today = new Date();
  const closeDate = intake.closeDate ? new Date(intake.closeDate) : null;

  const selectStyle: React.CSSProperties = {
    background: C.cardBg, color: C.text, border: `1px solid ${C.border}`,
    borderRadius: 4, padding: "5px 8px", fontSize: 10, fontFamily: "inherit",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "5px 8px", borderRadius: 4, fontSize: 10,
    background: C.cardBg, color: C.text, border: `1px solid ${C.border}`,
    fontFamily: "inherit", boxSizing: "border-box" as const,
  };

  const TAB_CONFIG = [
    { id: "live_status", label: "Live Status" },
    { id: "checklist", label: "Checklist Maintenance" },
    { id: "team", label: "Team Assignments" },
    { id: "risks", label: "Risk & Dependencies" },
    { id: "timeline", label: "Timeline" },
    { id: "steerco", label: "SteerCo" },
    { id: "admin", label: "Admin" },
    { id: "agent", label: "✦ Agent" },
  ] as const;

  const TAB_ICONS: Record<string, string> = {
    live_status: "◉", checklist: "☰", team: "◈", risks: "⚡",
    timeline: "▦", steerco: "▤", admin: "⚙", agent: "✦",
  };

  // Admin tab local state
  const [genIntelOpen, setGenIntelOpen] = useState(false);
  const [genIntelLayer, setGenIntelLayer] = useState<string | null>(null);
  const [telemetryRows, setTelemetryRows] = useState<any[]>([]);
  const [telemetrySummary, setTelemetrySummary] = useState<any>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [overrideRows, setOverrideRows] = useState<any[]>([]);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<{ item: ChecklistItem; targetStatus: ItemStatus } | null>(null);
  const [wsNotesDraft, setWsNotesDraft] = useState<Record<string, string>>({});
  const [wsReactivateConfirm, setWsReactivateConfirm] = useState<string | null>(null);
  const [adminDealName, setAdminDealName] = useState(deal.intake.dealName);
  const [adminDealStatus, setAdminDealStatus] = useState<string>("active");
  const [adminCloseDate, setAdminCloseDate] = useState(deal.intake.closeDate || "");
  const [adminSettingsSaved, setAdminSettingsSaved] = useState(false);
  const [adminApiStatus, setAdminApiStatus] = useState<"unknown" | "ok" | "error">("unknown");
  const [adminApiChecking, setAdminApiChecking] = useState(false);
  const [adminImportError, setAdminImportError] = useState<string | null>(null);

  // ── Section J: Neon Branch Operations state ──────────────────────────────
  const [branchStatus, setBranchStatus]           = useState<any | null>(null);
  const [branchStatusLoading, setBranchStatusLoading] = useState(false);

  async function refreshBranchStatus() {
    if (!deal.id) return;
    setBranchStatusLoading(true);
    try {
      const res  = await fetch(`/api/admin/db-status?dealId=${deal.id}`);
      const data = await res.json();
      setBranchStatus(data);
    } catch {
      setBranchStatus({ error: "Failed to fetch branch status" });
    } finally {
      setBranchStatusLoading(false);
    }
  }

  async function checkApiStatus() {
    setAdminApiChecking(true);
    try {
      const res = await fetch("/api/ai-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: "PING",
          description: "ping",
          workstream: "Integration Management",
          status: "not_started",
          dealContext: {
            dealStructure: deal.intake.dealStructure,
            integrationModel: deal.intake.integrationModel,
            crossBorder: false,
            jurisdictions: [],
            tsaRequired: "no",
            industrySector: "test",
            targetGaap: "US GAAP",
          },
        }),
      });
      setAdminApiStatus(res.ok ? "ok" : "error");
    } catch {
      setAdminApiStatus("error");
    }
    setAdminApiChecking(false);
  }

  // Fetch telemetry + override log when Admin tab opens (lazy)
  const hasFetchedAdminData = useRef(false);
  useEffect(() => {
    if (activeTab !== "admin" || !deal.id || hasFetchedAdminData.current) return;
    hasFetchedAdminData.current = true;

    setTelemetryLoading(true);
    fetch(`/api/telemetry?dealId=${deal.id}&limit=100`)
      .then(r => r.json())
      .then(d => { setTelemetryRows(d.telemetry ?? []); setTelemetrySummary(d.summary ?? null); })
      .catch(() => {})
      .finally(() => setTelemetryLoading(false));

    setOverrideLoading(true);
    fetch(`/api/telemetry?dealId=${deal.id}&type=overrides&limit=100`)
      .then(r => r.json())
      .then(d => setOverrideRows(d.overrides ?? []))
      .catch(() => {})
      .finally(() => setOverrideLoading(false));
  }, [activeTab, deal.id]);

  function exportDealAsJson() {
    const blob = new Blob([JSON.stringify(deal, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deal.intake.dealName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function getLocalStorageSize(): string {
    try {
      let total = 0;
      for (const key of Object.keys(localStorage)) {
        total += (localStorage.getItem(key) || "").length * 2;
      }
      return (total / 1024).toFixed(1) + " KB";
    } catch {
      return "N/A";
    }
  }

  return (
    <div style={{
      background: `linear-gradient(160deg, #0C1222 0%, #162036 40%, ${C.navy} 100%)`,
      color: C.text, minHeight: "100vh",
    }}>
      <style>{`
        @media print {
          body { background: white !important; color: #1E293B !important; }
          * { color: #1E293B !important; background: white !important; border-color: #E2E8F0 !important; }
          nav, button, select, input, [data-no-print] { display: none !important; }
          svg text { fill: #1E293B !important; }
          svg rect[fill="#1E293B"] { fill: #F1F5F9 !important; }
        }
        @keyframes savePulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        select, input[type=text], input[type=date], input[type=email] { font-size: clamp(11px, 1vw, 13px) !important; }
        @media (max-width: 768px) { select, input[type=text], input[type=date], input[type=email] { font-size: 13px !important; } }
        .dm-sidebar { scrollbar-width: thin; scrollbar-color: #334155 transparent; }
        .dm-sidebar::-webkit-scrollbar { width: 4px; }
        .dm-sidebar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .dm-sidebar-btn:hover { background: rgba(59, 130, 246, 0.1) !important; color: #CBD5E1 !important; }
      `}</style>
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
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Autosave Status Indicator */}
          {saveStatus !== "idle" && (
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 600,
              color: saveStatus === "saved" ? C.success : saveStatus === "saving" ? C.accent : C.warning,
              display: "flex", alignItems: "center", gap: 4,
              animation: saveStatus === "saving" ? "savePulse 1.2s ease-in-out infinite" : "none",
              whiteSpace: "nowrap",
            }}>
              {saveStatus === "saved" && "✓ Saved"}
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "error" && "⚠ Save failed"}
            </span>
          )}
          <button onClick={() => { if (window.confirm("Starting a new deal will discard all current progress. Continue?")) onReset(); }} style={{
            marginLeft: 8, padding: "6px 14px", borderRadius: 6,
            border: `1px solid rgba(51, 65, 85, 0.5)`, background: "transparent",
            color: C.textMuted, fontSize: 11, cursor: "pointer", fontWeight: 500,
          }}>{"← Deal Portfolio"}</button>
          <button onClick={() => setShowHelp(!showHelp)} style={{
            width: 30, height: 30, borderRadius: "50%",
            border: `1px solid ${showHelp ? C.accent : "rgba(51, 65, 85, 0.5)"}`,
            background: showHelp ? C.accent + "22" : "transparent",
            color: showHelp ? C.accent : C.textMuted, fontSize: 14, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }} title="Help">?</button>
        </div>
      </div>
      {showHelp && <HelpDrawer activeTab={activeTab} onClose={() => setShowHelp(false)} />}

      {pendingOverride && (
        <MustHaveWarningModal
          item={pendingOverride.item}
          targetStatus={pendingOverride.targetStatus}
          dealId={deal.id ?? ""}
          onConfirm={(item, targetStatus) => {
            onUpdateStatus(item.id, targetStatus);
            setPendingOverride(null);
          }}
          onCancel={() => setPendingOverride(null)}
        />
      )}

      {/* ── App body: sidebar + main ── */}
      <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 57px)" }}>

        {/* ─── Left Sidebar Navigation ─── */}
        <nav className="dm-sidebar" style={{
          width: 210, flexShrink: 0,
          background: "rgba(8, 14, 28, 0.88)",
          borderRight: "1px solid rgba(51, 65, 85, 0.45)",
          display: "flex", flexDirection: "column",
          padding: "16px 8px 32px",
          gap: 2,
          position: "sticky", top: 57,
          height: "calc(100vh - 57px)",
          overflowY: "auto",
          zIndex: 5,
        }}>
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.id;
            const accent = tab.id === "steerco" ? "#22C55E" : tab.id === "agent" ? C.accentLight : C.accent;
            return (
              <button
                key={tab.id}
                className="dm-sidebar-btn"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 7,
                  border: "none", cursor: "pointer", outline: "none",
                  background: isActive ? accent + "1A" : "transparent",
                  color: isActive ? accent : C.textMuted,
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  letterSpacing: 0.2, textAlign: "left",
                  display: "flex", alignItems: "center", gap: 9,
                  transition: "all 0.15s ease",
                  borderLeft: `3px solid ${isActive ? accent : "transparent"}`,
                }}>
                <span style={{ fontSize: 13, lineHeight: 1, opacity: isActive ? 1 : 0.5 }}>
                  {TAB_ICONS[tab.id]}
                </span>
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ─── Main Content ─── */}
        <div style={{ flex: 1, padding: "20px 24px", maxWidth: "calc(1400px - 210px)", margin: "0 auto", minWidth: 0 }}>

        {/* Deal Context Bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12,
          padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`,
          marginBottom: 20
        }}>
          {[
            ["Structure", STRUCTURE_LABELS[intake.dealStructure]],
            ["Model", MODEL_LABELS[intake.integrationModel]],
            ["Close Date", intake.closeDate ? new Date(intake.closeDate).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" }) : "TBD"],
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

        {/* ─── LIVE STATUS TAB ─── */}
        {activeTab === "live_status" && (
          <>
            {/* Executive Summary */}
            <div style={{
              padding: 16, borderRadius: 8, marginBottom: 16,
              background: `linear-gradient(135deg, ${C.cardBg} 0%, #1B2A4A 100%)`,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>PROGRAM STATUS</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {(() => {
                      const totalActive = checklistItems.filter(i => i.status !== "na").length;
                      const complete = checklistItems.filter(i => i.status === "complete").length;
                      const blocked = checklistItems.filter(i => i.status === "blocked").length;
                      const pct = totalActive ? Math.round((complete / totalActive) * 100) : 0;
                      const inProgress = checklistItems.filter(i => i.status === "in_progress").length;
                      const health = blocked > totalActive * 0.1 ? "At Risk" :
                        pct >= 90 ? "Closing Out" :
                        pct >= 50 ? "On Track" :
                        (inProgress > 0 || pct >= 5) ? "Active" :
                        "Getting Started";
                      const healthColor = health === "At Risk" ? C.danger :
                        health === "Closing Out" ? C.accent :
                        health === "On Track" ? C.success :
                        health === "Active" ? C.warning : C.textMuted;
                      return (
                        <>
                          <span style={{
                            display: "inline-block", padding: "4px 12px", borderRadius: 4,
                            background: healthColor + "22", color: healthColor, fontSize: 13, fontWeight: 800,
                            letterSpacing: 0.5,
                          }}>{health}</span>
                          <span style={{ fontSize: 22, fontWeight: 800, color: C.text }}>{pct}%</span>
                          <span style={{ fontSize: 11, color: C.textMuted }}>complete</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.success }}>{checklistItems.filter(i => i.status === "complete").length}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>Done</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{checklistItems.filter(i => i.status === "in_progress").length}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>Active</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.danger }}>{checklistItems.filter(i => i.status === "blocked").length}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>Blocked</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.warning }}>{overdueCount}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>Overdue</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.textMuted }}>{checklistItems.filter(i => !i.ownerId && i.status !== "na").length}</div>
                    <div style={{ fontSize: 9, color: C.textMuted }}>Unassigned</div>
                  </div>
                </div>
              </div>
            </div>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Overall Progress", value: `${kpis.pctComplete}%`, sub: `${kpis.complete} of ${kpis.total} items`, color: C.accent, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("all"); } },
                { label: "In Progress", value: kpis.inProgress, sub: "items actively being worked", color: C.accentLight, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("in_progress"); } },
                { label: "Blocked Items", value: kpis.blocked, sub: "require escalation", color: kpis.blocked > 3 ? C.danger : C.warning, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("blocked"); } },
                { label: "Overdue", value: overdueCount, sub: "past milestone date", color: overdueCount > 0 ? C.danger : C.success, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("overdue"); } },
                { label: "Active Risks", value: riskAlerts.filter(r => r.status === "open").length, sub: `${riskAlerts.filter(r => r.severity === "critical").length} critical`, color: C.danger, click: () => { setActiveTab("risks"); } },
                { label: "Unassigned", value: checklistItems.filter(i => i.status !== "na" && !i.ownerId).length, sub: "items need an owner", color: checklistItems.filter(i => i.status !== "na" && !i.ownerId).length > 20 ? C.warning : C.muted, click: () => { setActiveTab("checklist"); setFilterPhase("all"); setFilterWs("all"); setFilterPriority("all"); setFilterStatus("all"); setFilterOwner("unassigned"); } },
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

            {/* Recent Activity */}
            {(deal.changeLog || []).length > 0 && (
              <div style={{ padding: 12, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, color: C.textMuted }}>
                  Recent Activity
                </div>
                <div style={{ maxHeight: 120, overflowY: "auto" }}>
                  {[...(deal.changeLog || [])].reverse().slice(0, 15).map((evt) => (
                    <div key={evt.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "3px 0", borderBottom: `1px solid ${C.border}11`, fontSize: 10 }}>
                      <span style={{ color: C.muted, fontSize: 9, minWidth: 55 }}>{new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span style={{ color: C.accentLight, fontWeight: 600 }}>{evt.itemId}</span>
                      <span style={{ color: C.textMuted }}>{evt.field}</span>
                      <span style={{ color: C.muted }}>→</span>
                      <span style={{
                        color: evt.newValue === "complete" ? C.success : evt.newValue === "blocked" ? C.danger : evt.newValue === "in_progress" ? C.accent : C.text,
                        fontWeight: 600,
                      }}>{evt.newValue}</span>
                    </div>
                  ))}
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
                  {(() => {
                    const manualCats = new Set(riskAlerts.filter(r => r.source === "manual").map(r => r.category));
                    const dedupedRisks = riskAlerts.filter(r => !(r.source === "auto" && manualCats.has(r.category)));
                    return (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                          Risk Register — {dedupedRisks.length} Active
                        </div>
                        {dedupedRisks.length === 0 ? (
                          <div style={{ fontSize: 11, color: C.success, padding: 8 }}>✓ No material risks detected for this deal profile</div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {dedupedRisks.map((r) => (
                              <RiskCard key={r.id} risk={r} />
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
              <div>
                <span style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>Search </span>
                <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search items..."
                  style={{ padding: "5px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11, width: 180 }} />
              </div>
              <div style={{ marginLeft: "auto", fontSize: 10, color: C.textMuted, alignSelf: "center" }}>
                {visibleItems.length} items shown{overdueCount > 0 && <span style={{ color: C.danger, marginLeft: 8 }}>{overdueCount} overdue</span>}
              </div>
              <button onClick={() => {
                const headers = ["ID", "Workstream", "Section", "Description", "Phase", "Priority", "Status", "Owner", "Dependencies", "Milestone Date"];
                const rows = sortedItems.map(item => [
                  item.itemId,
                  item.workstream,
                  item.section || "",
                  `"${item.description.replace(/"/g, '""')}"`,
                  item.phase,
                  item.priority,
                  item.status,
                  deal.people.find(p => p.id === item.ownerId)?.name || "Unassigned",
                  item.dependencies.join("; "),
                  item.milestoneDate || "",
                ]);
                const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `${intake.dealName.replace(/\s+/g, "_")}_checklist_${new Date().toISOString().split("T")[0]}.csv`;
                a.click(); URL.revokeObjectURL(url);
              }} style={{
                padding: "5px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                background: C.deepBlue, color: C.textMuted, border: `1px solid ${C.border}`,
                cursor: "pointer",
              }}>📥 Export CSV</button>
              <button
                onClick={() => setShowAddTask(!showAddTask)}
                style={{
                  padding: "4px 12px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                  background: taskAddedFlash ? C.success : showAddTask ? C.danger + "22" : C.accent + "22",
                  color: taskAddedFlash ? "#fff" : showAddTask ? C.danger : C.accent,
                  border: `1px solid ${taskAddedFlash ? C.success : showAddTask ? C.danger + "44" : C.accent + "44"}`,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "background 0.2s, color 0.2s, border-color 0.2s",
                }}
              >
                {taskAddedFlash ? "✓ Added!" : showAddTask ? "Cancel" : "+ New Task"}
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.textMuted, cursor: "pointer" }}>
                <input type="checkbox" checked={showNaItems} onChange={(e) => setShowNaItems(e.target.checked)} />
                Show N/A
              </label>
            </div>

            {/* Saved Filter Chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {(deal.savedFilters || []).map((sf) => {
                const isActive = sf.filters.phase === filterPhase && sf.filters.workstream === filterWs && sf.filters.priority === filterPriority && sf.filters.status === filterStatus && sf.filters.owner === filterOwner;
                return (
                  <button key={sf.id} onClick={() => {
                    setFilterPhase(sf.filters.phase); setFilterWs(sf.filters.workstream);
                    setFilterPriority(sf.filters.priority); setFilterStatus(sf.filters.status);
                    setFilterOwner(sf.filters.owner || "all");
                  }} style={{
                    padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                    background: isActive ? C.accent : C.deepBlue, color: isActive ? "#fff" : C.textMuted,
                    border: `1px solid ${isActive ? C.accent : C.border}`, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    {sf.name}
                    {!sf.isPreset && (
                      <span onClick={(e) => { e.stopPropagation(); onDeleteFilter(sf.id); }} style={{ marginLeft: 2, cursor: "pointer", opacity: 0.6 }}>×</span>
                    )}
                  </button>
                );
              })}
              {showSaveFilter ? (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input value={newFilterName} onChange={(e) => setNewFilterName(e.target.value)} placeholder="Filter name..." style={{
                    padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue,
                    color: C.text, fontSize: 10, width: 120,
                  }} onKeyDown={(e) => {
                    if (e.key === "Enter" && newFilterName.trim()) {
                      onSaveFilter(newFilterName.trim(), { phase: filterPhase, workstream: filterWs, priority: filterPriority, status: filterStatus, owner: filterOwner });
                      setNewFilterName(""); setShowSaveFilter(false);
                    }
                  }} autoFocus />
                  <button onClick={() => setShowSaveFilter(false)} style={{ fontSize: 10, background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowSaveFilter(true)} style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 500,
                  background: "transparent", color: C.textMuted, border: `1px dashed ${C.border}`, cursor: "pointer",
                }}>+ Save View</button>
              )}
            </div>

            {showAddTask && (
              <div style={{
                padding: 14, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.accent}44`,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                  New Checklist Item
                </div>
                {/* Row 1: Description */}
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Description *</div>
                  <textarea
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="Describe the task or deliverable…"
                    rows={2}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 4, fontSize: 11, background: C.cardBg, color: C.text, border: `1px solid ${C.border}`, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                {/* Row 2: Workstream + Section */}
                <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 200px" }}>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Workstream *</div>
                    <select
                      value={newTaskWs}
                      onChange={(e) => { setNewTaskWs(e.target.value); if (e.target.value !== "__custom__") setNewTaskCustomWs(""); }}
                      style={selectStyle}
                    >
                      <option value="">Select…</option>
                      {Array.from(wsStats.keys()).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                      <option value="R&D">R&D</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Supply Chain">Supply Chain</option>
                      <option value="Customer Success">Customer Success</option>
                      <option value="__custom__">+ Custom workstream…</option>
                    </select>
                    {newTaskWs === "__custom__" && (
                      <input
                        value={newTaskCustomWs}
                        onChange={(e) => setNewTaskCustomWs(e.target.value)}
                        placeholder="Workstream name…"
                        autoFocus
                        style={{ ...inputStyle, marginTop: 4 }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Section / Category</div>
                    <input
                      value={newTaskSection}
                      onChange={(e) => setNewTaskSection(e.target.value)}
                      placeholder="e.g. Planning, Execution…"
                      style={inputStyle}
                    />
                  </div>
                </div>
                {/* Row 3: Phase + Priority + Status + Owner */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Phase</div>
                    <select value={newTaskPhase} onChange={(e) => setNewTaskPhase(e.target.value)} style={selectStyle}>
                      {["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"].map(p => (
                        <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Priority</div>
                    <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)} style={selectStyle}>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Status</div>
                    <select value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)} style={selectStyle}>
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="blocked">Blocked</option>
                      <option value="complete">Complete</option>
                      <option value="na">N/A</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Owner</div>
                    <select value={newTaskOwner} onChange={(e) => setNewTaskOwner(e.target.value)} style={selectStyle}>
                      <option value="">Unassigned</option>
                      {deal.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const ws = newTaskWs === "__custom__" ? newTaskCustomWs.trim() : newTaskWs;
                      if (!ws || !newTaskDesc.trim()) return;
                      onAddTask({
                        workstream: ws, description: newTaskDesc.trim(),
                        phase: newTaskPhase, priority: newTaskPriority,
                        section: newTaskSection.trim() || "Custom",
                        status: newTaskStatus,
                        ownerId: newTaskOwner || undefined,
                      });
                      setNewTaskDesc(""); setNewTaskSection(""); setNewTaskWs(""); setNewTaskCustomWs("");
                      setNewTaskStatus("not_started"); setNewTaskOwner(""); setNewTaskPhase("day_30"); setNewTaskPriority("medium");
                      setShowAddTask(false); setTaskAddedFlash(true);
                      setTimeout(() => setTaskAddedFlash(false), 2000);
                    }}
                    disabled={!(newTaskWs === "__custom__" ? newTaskCustomWs.trim() : newTaskWs) || !newTaskDesc.trim()}
                    style={{
                      padding: "6px 18px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                      background: C.accent, color: "#fff", border: "none",
                      cursor: "pointer", fontFamily: "inherit", opacity: (!(newTaskWs === "__custom__" ? newTaskCustomWs.trim() : newTaskWs) || !newTaskDesc.trim()) ? 0.5 : 1,
                    }}
                  >
                    Add Item
                  </button>
                  <button
                    onClick={() => { setShowAddTask(false); setNewTaskDesc(""); setNewTaskWs(""); setNewTaskCustomWs(""); setNewTaskSection(""); setNewTaskStatus("not_started"); setNewTaskOwner(""); setNewTaskPhase("day_30"); setNewTaskPriority("medium"); }}
                    style={{ padding: "6px 14px", borderRadius: 4, fontSize: 10, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Team Roster — empty state prompt */}
            {deal.people.length === 0 && !showAddTask && (
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
            {deal.people.length > 0 && (
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
                display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", marginBottom: 12,
                borderRadius: 6, background: C.accent + "11", border: `1px solid ${C.accent}44`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.accentLight }}>{selectedIds.size} selected</span>
                <span style={{ color: C.border }}>—</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>Change status to:</span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const newStatus = e.target.value as ItemStatus;
                    if (!newStatus) return;
                    selectedIds.forEach(id => {
                      const item = checklistItems.find(i => i.id === id);
                      if (item) onUpdateStatus(item.id, newStatus);
                    });
                    setSelectedIds(new Set());
                    e.target.value = "";
                  }}
                  style={{
                    padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: "pointer",
                    background: C.deepBlue, color: C.text, border: `1px solid ${C.accent}66`,
                  }}
                >
                  <option value="" disabled>Select status…</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                  <option value="blocked">Blocked</option>
                </select>
                <button onClick={() => setSelectedIds(new Set())} style={{
                  marginLeft: "auto", padding: "3px 8px", borderRadius: 4, fontSize: 10,
                  background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer",
                }}>Clear Selection</button>
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
                      {[
                        { label: "ID", key: "id" },
                        { label: "Workstream", key: "workstream" },
                        { label: "Task", key: "task" },
                        { label: "Phase", key: "phase" },
                        { label: "Priority", key: "priority" },
                        { label: "Status", key: "status" },
                        { label: "Owner", key: "owner" },
                        { label: "", key: "" },
                      ].map((h) => (
                        <th key={h.label || "ai"} onClick={() => h.key && toggleSort(h.key)} style={{
                          padding: "6px", textAlign: "left", color: sortCol === h.key ? C.accentLight : C.textMuted,
                          fontSize: 9, textTransform: "uppercase", letterSpacing: 1,
                          cursor: h.key ? "pointer" : "default", userSelect: "none",
                          transition: "color 0.15s",
                        }}>
                          {h.label}
                          {h.key && sortCol === h.key && (
                            <span style={{ marginLeft: 3, fontSize: 8 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
                          )}
                          {h.key && sortCol !== h.key && (
                            <span style={{ marginLeft: 3, fontSize: 8, opacity: 0.3 }}>⇅</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item) => {
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
                                const newStatus = e.target.value as ItemStatus;
                                const mustHaveAlertSet = new Set((deal.mustHaveAlerts ?? []).map(a => a.itemId));
                                if (newStatus === "na" && mustHaveAlertSet.has(item.itemId)) {
                                  const alert = (deal.mustHaveAlerts ?? []).find(a => a.itemId === item.itemId);
                                  const itemWithReason = alert ? { ...item, naJustification: alert.reason } : item;
                                  setPendingOverride({ item: itemWithReason, targetStatus: newStatus });
                                } else {
                                  onUpdateStatus(item.id, newStatus);
                                }
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
                              <option value="na">N/A</option>
                            </select>
                            {item.status === "na" && item.naJustification && (
                              <div style={{ fontSize: 8, color: C.muted, fontStyle: "italic", marginTop: 2, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                title={item.naJustification}>
                                N/A: {item.naJustification}
                              </div>
                            )}
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
                  {/* Item header + edit toggle */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
                    <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                      {selectedItem.itemId}
                    </div>
                    <button
                      onClick={() => {
                        if (!editingItem) {
                          setEditDesc(selectedItem.description);
                          setEditWs(selectedItem.workstream);
                          setEditCustomWs("");
                          setEditPhase(selectedItem.phase);
                          setEditSection(selectedItem.section || "");
                        }
                        setEditingItem(!editingItem);
                      }}
                      style={{
                        padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600,
                        background: editingItem ? C.warning + "22" : C.accent + "22",
                        color: editingItem ? C.warning : C.accent,
                        border: `1px solid ${editingItem ? C.warning + "44" : C.accent + "44"}`,
                        cursor: "pointer", flexShrink: 0,
                      }}
                    >
                      {editingItem ? "Cancel" : "✎ Edit"}
                    </button>
                  </div>

                  {editingItem ? (
                    /* ── Edit mode ── */
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Description</div>
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          rows={3}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 4, fontSize: 11, background: C.deepBlue, color: C.text, border: `1px solid ${C.border}`, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Workstream</div>
                        <select
                          value={editWs}
                          onChange={(e) => { setEditWs(e.target.value); if (e.target.value !== "__custom__") setEditCustomWs(""); }}
                          style={{ ...selectStyle, width: "100%" }}
                        >
                          {Array.from(wsStats.keys()).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                          <option value="R&D">R&D</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Supply Chain">Supply Chain</option>
                          <option value="Customer Success">Customer Success</option>
                          <option value="__custom__">+ Custom workstream…</option>
                        </select>
                        {editWs === "__custom__" && (
                          <input
                            value={editCustomWs}
                            onChange={(e) => setEditCustomWs(e.target.value)}
                            placeholder="Workstream name…"
                            autoFocus
                            style={{ ...inputStyle, marginTop: 4 }}
                          />
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Phase</div>
                          <select value={editPhase} onChange={(e) => setEditPhase(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                            {["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"].map(p => (
                              <option key={p} value={p}>{PHASE_LABELS[p]}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Section</div>
                          <input
                            value={editSection}
                            onChange={(e) => setEditSection(e.target.value)}
                            placeholder="e.g. Planning…"
                            style={{ ...inputStyle }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => {
                            const ws = editWs === "__custom__" ? editCustomWs.trim() : editWs;
                            if (!ws || !editDesc.trim()) return;
                            onUpdateItem(selectedItem.id, {
                              description: editDesc.trim(),
                              workstream: ws as any,
                              phase: editPhase as any,
                              section: editSection.trim() || selectedItem.section,
                            });
                            setEditingItem(false);
                          }}
                          style={{ padding: "5px 14px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: C.accent, color: "#fff", border: "none", cursor: "pointer" }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingItem(false)}
                          style={{ padding: "5px 10px", borderRadius: 4, fontSize: 10, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Read mode ── */
                    <>
                      <div style={{ fontSize: 11, color: C.text, marginBottom: 12, lineHeight: 1.5 }}>{selectedItem.description}</div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.accent + "22", color: C.accent }}>{selectedItem.workstream}</span>
                        <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.warning + "22", color: C.warning }}>{PHASE_LABELS[selectedItem.phase]}</span>
                        {selectedItem.section && selectedItem.section !== "Custom" && (
                          <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.border, color: C.textMuted }}>{selectedItem.section}</span>
                        )}
                      </div>
                    </>
                  )}

                  {!editingItem && <><div style={{ fontSize: 9, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    AI Guidance
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
                  {/* Notes Section */}
                  {selectedItem && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                        Notes ({selectedItem.notes.length})
                      </div>
                      <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 8 }}>
                        {selectedItem.notes.length === 0 ? (
                          <div style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>No notes yet</div>
                        ) : (
                          [...selectedItem.notes].reverse().map((note: any) => (
                            <div key={note.id || note} style={{ padding: "4px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 10, color: C.text }}>
                              <div>{typeof note === "string" ? note : note.text}</div>
                              {note.timestamp && <div style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>{new Date(note.timestamp).toLocaleString()}</div>}
                            </div>
                          ))
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder="Add a note — describe status, blockers, or context..."
                          rows={3}
                          style={{ flex: 1, padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10, resize: "vertical", fontFamily: "inherit", minHeight: 50 }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey && newNoteText.trim()) {
                              e.preventDefault();
                              onAddNote(selectedItem.itemId, newNoteText.trim());
                              setNewNoteText("");
                            }
                          }}
                        />
                        <button onClick={() => { if (newNoteText.trim()) { onAddNote(selectedItem.itemId, newNoteText.trim()); setNewNoteText(""); } }}
                          style={{ padding: "4px 8px", borderRadius: 4, background: C.accent, color: "#fff", border: "none", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>
                          Add
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attachments Section */}
                  {selectedItem && (
                    <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                        Attachments ({(selectedItem.attachments || []).length})
                      </div>
                      {(selectedItem.attachments || []).map((att: any) => (
                        <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10 }}>📎</span>
                          {att.url ? (
                            <a href={att.url} target="_blank" rel="noopener" style={{ fontSize: 10, color: C.accentLight }}>{att.name}</a>
                          ) : (
                            <span style={{ fontSize: 10, color: C.text }}>{att.name}</span>
                          )}
                          <span style={{ fontSize: 8, color: C.muted }}>{att.addedAt ? new Date(att.addedAt).toLocaleDateString() : ""}</span>
                        </div>
                      ))}
                      {showAddAttachment ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                          <input value={newAttName} onChange={(e) => setNewAttName(e.target.value)} placeholder="File name..." style={{
                            padding: "3px 6px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10,
                          }} />
                          <input value={newAttUrl} onChange={(e) => setNewAttUrl(e.target.value)} placeholder="URL (optional)..." style={{
                            padding: "3px 6px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10,
                          }} />
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => {
                              if (newAttName.trim()) { onAddAttachment(selectedItem.itemId, newAttName.trim(), newAttUrl.trim() || undefined); setNewAttName(""); setNewAttUrl(""); setShowAddAttachment(false); }
                            }} style={{ padding: "3px 8px", borderRadius: 3, background: C.accent, color: "#fff", border: "none", fontSize: 9, cursor: "pointer" }}>Attach</button>
                            <button onClick={() => setShowAddAttachment(false)} style={{ padding: "3px 8px", borderRadius: 3, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 9, cursor: "pointer" }}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddAttachment(true)} style={{
                          padding: "3px 8px", borderRadius: 3, fontSize: 9, background: "transparent", color: C.textMuted, border: `1px dashed ${C.border}`, cursor: "pointer", marginTop: 4,
                        }}>+ Add Link</button>
                      )}
                    </div>
                  )}

                  <button onClick={() => { setSelectedItem(null); setEditingItem(false); }} style={{ marginTop: 12, fontSize: 10, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>
                    ✕ Close
                  </button>
                  </> /* end !editingItem */ }
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TEAM TAB ─── */}
        {activeTab === "team" && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Team Assignments</h2>

            {/* Add Person */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Name</div>
                <input value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} placeholder="Full name"
                  style={{ padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11, width: 160 }} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Role</div>
                <input value={newPersonRole} onChange={(e) => setNewPersonRole(e.target.value)} placeholder="Workstream Lead"
                  style={{ padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11, width: 160 }} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Email</div>
                <input value={newPersonEmail} onChange={(e) => setNewPersonEmail(e.target.value)} placeholder="email@company.com"
                  style={{ padding: "6px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11, width: 200 }} />
              </div>
              <button onClick={() => {
                if (newPersonName.trim()) {
                  onAddPerson(newPersonName.trim(), newPersonRole.trim() || undefined, newPersonEmail.trim() || undefined);
                  setNewPersonName(""); setNewPersonRole(""); setNewPersonEmail("");
                }
              }} style={{
                padding: "6px 14px", borderRadius: 4, background: C.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}>+ Add Person</button>
            </div>

            {/* Person Roster */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                Team Roster — {deal.people.length} Members
              </div>
              {deal.people.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, padding: 8 }}>No team members added yet. Add people above.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ textAlign: "left", padding: 6, color: C.textMuted, fontSize: 9 }}>NAME</th>
                      <th style={{ textAlign: "left", padding: 6, color: C.textMuted, fontSize: 9 }}>ROLE</th>
                      <th style={{ textAlign: "left", padding: 6, color: C.textMuted, fontSize: 9 }}>EMAIL</th>
                      <th style={{ textAlign: "center", padding: 6, color: C.textMuted, fontSize: 9 }}>ASSIGNED</th>
                      <th style={{ textAlign: "center", padding: 6, color: C.textMuted, fontSize: 9 }}>COMPLETE</th>
                      <th style={{ textAlign: "center", padding: 6, color: C.textMuted, fontSize: 9 }}>BLOCKED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deal.people.map((p) => {
                      const items = checklistItems.filter(i => i.ownerId === p.id);
                      const assignedCount = items.length;
                      const workloadColor = assignedCount > 60 ? C.danger : assignedCount > 30 ? C.warning : C.success;
                      const workloadLabel = assignedCount > 60 ? "Overloaded" : assignedCount > 30 ? "Heavy" : "Manageable";
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                          <td style={{ padding: 6, fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: 6, color: C.textMuted }}>{p.role || "—"}</td>
                          <td style={{ padding: 6, color: C.accentLight }}>{p.email || "—"}</td>
                          <td style={{ padding: 6, textAlign: "center" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                              <span style={{ fontWeight: 600 }}>{assignedCount}</span>
                              <span
                                title={workloadLabel}
                                style={{
                                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                                  background: workloadColor, flexShrink: 0,
                                  boxShadow: `0 0 4px ${workloadColor}80`,
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: 6, textAlign: "center", color: C.success }}>{items.filter(i => i.status === "complete").length}</td>
                          <td style={{ padding: 6, textAlign: "center", color: items.filter(i => i.status === "blocked").length > 0 ? C.danger : C.muted }}>
                            {items.filter(i => i.status === "blocked").length}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bulk Assignment by Workstream */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                Bulk Assignment by Workstream
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Workstream</div>
                  <select value={bulkAssignWs} onChange={(e) => setBulkAssignWs(e.target.value)} style={{
                    padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11,
                  }}>
                    <option value="">Select workstream...</option>
                    {Array.from(wsStats.keys()).map(ws => <option key={ws} value={ws}>{ws}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Assign to</div>
                  <select value={bulkAssignPerson} onChange={(e) => setBulkAssignPerson(e.target.value)} style={{
                    padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11,
                  }}>
                    <option value="">Select person...</option>
                    {deal.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <button onClick={() => {
                  if (bulkAssignWs && bulkAssignPerson) {
                    const ids = checklistItems.filter(i => i.workstream === bulkAssignWs && !i.ownerId).map(i => i.itemId);
                    if (ids.length > 0) onBulkAssign(ids, bulkAssignPerson);
                    setBulkAssignWs(""); setBulkAssignPerson("");
                  }
                }} style={{
                  padding: "6px 14px", borderRadius: 4, background: C.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  opacity: bulkAssignWs && bulkAssignPerson ? 1 : 0.4,
                }} disabled={!bulkAssignWs || !bulkAssignPerson}>
                  Assign All Unassigned
                </button>
                {bulkAssignWs && bulkAssignPerson && (
                  <button onClick={() => {
                    const ids = checklistItems.filter(i => i.workstream === bulkAssignWs).map(i => i.itemId);
                    if (ids.length > 0 && window.confirm(`Reassign ALL ${ids.length} items in ${bulkAssignWs}?`)) {
                      onBulkAssign(ids, bulkAssignPerson);
                      setBulkAssignWs(""); setBulkAssignPerson("");
                    }
                  }} style={{
                    padding: "6px 14px", borderRadius: 4, background: C.warning + "33", color: C.warning, border: `1px solid ${C.warning}44`, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}>
                    Reassign All (incl. assigned)
                  </button>
                )}
              </div>
              {bulkAssignWs && (
                <div style={{ marginTop: 8, fontSize: 10, color: C.textMuted }}>
                  {checklistItems.filter(i => i.workstream === bulkAssignWs && !i.ownerId).length} unassigned / {checklistItems.filter(i => i.workstream === bulkAssignWs).length} total items in {bulkAssignWs}
                </div>
              )}
            </div>

            {/* Line-Item Assignment */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                Line-Item Assignment — {checklistItems.filter(i => !i.ownerId && i.status !== "na").length} Unassigned
              </div>
              {deal.people.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, padding: 8 }}>Add team members above before assigning items.</div>
              ) : (
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.cardBg }}>
                        <th style={{ padding: 4, textAlign: "left", color: C.textMuted, fontSize: 8 }}>ID</th>
                        <th style={{ padding: 4, textAlign: "left", color: C.textMuted, fontSize: 8 }}>WORKSTREAM</th>
                        <th style={{ padding: 4, textAlign: "left", color: C.textMuted, fontSize: 8 }}>TASK</th>
                        <th style={{ padding: 4, textAlign: "left", color: C.textMuted, fontSize: 8 }}>PRIORITY</th>
                        <th style={{ padding: 4, textAlign: "left", color: C.textMuted, fontSize: 8 }}>OWNER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checklistItems.filter(i => i.status !== "na").sort((a, b) => {
                        // Unassigned first, then by workstream
                        if (!a.ownerId && b.ownerId) return -1;
                        if (a.ownerId && !b.ownerId) return 1;
                        return a.workstream.localeCompare(b.workstream) || a.itemId.localeCompare(b.itemId);
                      }).slice(0, 100).map((item) => (
                        <tr key={item.itemId} style={{ borderBottom: `1px solid ${C.border}11` }}>
                          <td style={{ padding: "3px 4px", fontSize: 9, color: C.accentLight, fontWeight: 600 }}>{item.itemId}</td>
                          <td style={{ padding: "3px 4px", fontSize: 9, color: C.textMuted, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.workstream}</td>
                          <td style={{ padding: "3px 4px", fontSize: 9, maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.description}>{item.description}</td>
                          <td style={{ padding: "3px 4px" }}>
                            <span style={{
                              fontSize: 8, padding: "1px 4px", borderRadius: 3, fontWeight: 700,
                              color: item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.muted,
                              background: (item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.muted) + "22",
                            }}>{item.priority.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: "3px 4px" }}>
                            <select value={item.ownerId || ""} onChange={(e) => onAssignOwner(item.id, e.target.value || undefined)} style={{
                              padding: "2px 4px", borderRadius: 3, fontSize: 9, fontWeight: 500,
                              border: `1px solid ${item.ownerId ? C.success + "44" : C.warning + "44"}`,
                              background: item.ownerId ? C.success + "11" : C.deepBlue,
                              color: item.ownerId ? C.success : C.warning,
                              cursor: "pointer", minWidth: 100,
                            }}>
                              <option value="">— Unassigned —</option>
                              {deal.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {checklistItems.filter(i => i.status !== "na").length > 100 && (
                    <div style={{ padding: 8, fontSize: 10, color: C.textMuted, textAlign: "center" }}>
                      Showing first 100 items. Use Checklist Maintenance tab for full list.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── RISKS TAB ─── */}
        {activeTab === "risks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Risk & Dependency Management</h2>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {riskAlerts.filter(r => r.status === "open").length} open risks · {riskAlerts.filter(r => r.status === "mitigated").length} mitigated
                </div>
              </div>
              <button onClick={() => setShowAddRisk(!showAddRisk)} style={{
                padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: showAddRisk ? C.danger + "22" : C.accent, color: showAddRisk ? C.danger : "#fff",
                border: showAddRisk ? `1px solid ${C.danger}44` : "none", cursor: "pointer",
              }}>{showAddRisk ? "Cancel" : "+ Add Risk"}</button>
            </div>

            {/* Add Risk Form */}
            {showAddRisk && (
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.accent}44` }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: C.accentLight }}>New Risk Entry</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Category</div>
                    <select value={newRiskCategory} onChange={(e) => setNewRiskCategory(e.target.value)} style={{
                      width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11,
                    }}>
                      {Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Severity</div>
                    <select value={newRiskSeverity} onChange={(e) => setNewRiskSeverity(e.target.value)} style={{
                      width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11,
                    }}>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Description</div>
                  <textarea value={newRiskDesc} onChange={(e) => setNewRiskDesc(e.target.value)} placeholder="Describe the risk..."
                    style={{ width: "100%", padding: 8, borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11, minHeight: 50, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Mitigation Strategy</div>
                  <textarea value={newRiskMitigation} onChange={(e) => setNewRiskMitigation(e.target.value)} placeholder="Suggested mitigation..."
                    style={{ width: "100%", padding: 8, borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 11, minHeight: 40, resize: "vertical", fontFamily: "inherit" }} />
                </div>
                <button onClick={() => {
                  if (newRiskDesc.trim()) {
                    onAddRisk({ category: newRiskCategory, severity: newRiskSeverity, description: newRiskDesc.trim(), mitigation: newRiskMitigation.trim(), source: "manual" });
                    setNewRiskDesc(""); setNewRiskMitigation(""); setShowAddRisk(false);
                  }
                }} style={{
                  padding: "6px 16px", borderRadius: 4, background: C.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>Add Risk</button>
              </div>
            )}

            {/* Narrative-Extracted Risks */}
            {(() => {
              const narrativeRisks = (deal.progressSnapshots || []).flatMap(snap =>
                snap.workstreams.filter(ws => (ws.keyRisks || []).length > 0)
                  .map(ws => ({ workstream: ws.workstream, risk: (ws.keyRisks || []).join(", "), period: snap.periodEnd }))
              );
              const unresolvedNarrative = narrativeRisks.filter(nr =>
                !riskAlerts.some(r => r.description.includes(nr.risk.substring(0, 30)))
              );
              if (unresolvedNarrative.length === 0) return null;
              return (
                <div style={{ padding: 12, borderRadius: 8, background: C.warning + "11", border: `1px solid ${C.warning}33` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, marginBottom: 8 }}>
                    ⚠ Risks Captured in Narratives — Not Yet in Register
                  </div>
                  {unresolvedNarrative.slice(0, 5).map((nr, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: `1px solid ${C.border}22` }}>
                      <div>
                        <span style={{ fontSize: 10, color: C.text }}>{nr.risk.length > 80 ? nr.risk.substring(0, 80) + "…" : nr.risk}</span>
                        <span style={{ fontSize: 9, color: C.muted, marginLeft: 8 }}>({nr.workstream}, {nr.period})</span>
                      </div>
                      <button onClick={() => {
                        onAddRisk({ category: "regulatory_delay", severity: "medium", description: nr.risk, source: "narrative" });
                      }} style={{
                        padding: "2px 8px", borderRadius: 3, fontSize: 9, background: C.warning + "22", color: C.warning, border: `1px solid ${C.warning}44`, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                      }}>+ Add to Register</button>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Active Risk Cards */}
            {(() => {
              // Deduplicate: if a manual risk and an auto risk share the same category,
              // only show the manual one (it has a richer description). Mark source badges
              // so users can distinguish auto-detected from manual entries.
              const manualCategories = new Set(
                riskAlerts.filter(r => r.source === "manual").map(r => r.category)
              );
              const deduplicatedRisks = riskAlerts.filter(r =>
                !(r.source === "auto" && manualCategories.has(r.category))
              );
              return deduplicatedRisks.length === 0 ? (
              <div style={{ padding: 24, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, color: C.success }}>No risks in register</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Add risks manually or they will be auto-detected from your deal profile.</div>
              </div>
            ) : (
              deduplicatedRisks.map((r) => (
                <div key={r.id} style={{
                  padding: 16, borderRadius: 8, background: C.cardBg,
                  border: `1px solid ${r.severity === "critical" ? "#EF444444" : r.severity === "high" ? "#F59E0B44" : C.border}`,
                  borderLeft: `4px solid ${r.severity === "critical" ? C.danger : r.severity === "high" ? C.warning : C.accent}`,
                  opacity: r.status === "closed" || r.status === "mitigated" ? 0.6 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{RISK_LABELS[r.category] || r.category}</span>
                        <SeverityBadge severity={r.severity} />
                        {r.source && r.source !== "auto" && (
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: r.source === "narrative" ? C.warning + "22" : C.accent + "22", color: r.source === "narrative" ? C.warning : C.accent }}>{r.source.toUpperCase()}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(r.affectedWorkstreams || []).map((ws) => (
                          <span key={ws} style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: C.accent + "22", color: C.accent }}>{ws}</span>
                        ))}
                      </div>
                    </div>
                    <select value={r.status} onChange={(e) => onUpdateRisk(r.id, { status: e.target.value })} style={{
                      padding: "3px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: r.status === "open" ? C.danger + "22" : r.status === "mitigated" ? C.success + "22" : C.warning + "22",
                      color: r.status === "open" ? C.danger : r.status === "mitigated" ? C.success : C.warning,
                      border: "none", cursor: "pointer",
                    }}>
                      <option value="open">Open</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 8 }}>{r.description}</div>
                  {r.mitigation && (
                    <div style={{ fontSize: 10, color: C.success, lineHeight: 1.5, padding: "4px 8px", borderRadius: 4, background: C.success + "11", marginBottom: 8 }}>
                      💡 {r.mitigation}
                    </div>
                  )}
                  {/* Linked Items */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      Linked Items ({(r.linkedItemIds || []).length})
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                      {(r.linkedItemIds || []).map(itemId => {
                        const item = checklistItems.find(i => i.itemId === itemId);
                        return item ? (
                          <span key={itemId} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: C.deepBlue, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 3 }}>
                            <span style={{ color: C.accentLight, fontWeight: 600 }}>{itemId}</span>
                            <span style={{ color: C.muted }}>{item.description.substring(0, 30)}…</span>
                            <span onClick={() => onUpdateRisk(r.id, { linkedItemIds: (r.linkedItemIds || []).filter(id => id !== itemId) })} style={{ cursor: "pointer", color: C.danger, marginLeft: 2 }}>×</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <select onChange={(e) => {
                      if (e.target.value) {
                        onUpdateRisk(r.id, { linkedItemIds: [...(r.linkedItemIds || []), e.target.value] });
                        e.target.value = "";
                      }
                    }} style={{ padding: "2px 6px", borderRadius: 3, fontSize: 9, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, cursor: "pointer" }}>
                      <option value="">+ Link checklist item...</option>
                      {checklistItems.filter(i => i.status !== "na" && !(r.linkedItemIds || []).includes(i.itemId)).slice(0, 50).map(i => (
                        <option key={i.itemId} value={i.itemId}>{i.itemId} — {i.description.substring(0, 40)}</option>
                      ))}
                    </select>
                  </div>
                  {/* Notes */}
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 6, marginTop: 6 }}>
                    <input
                      defaultValue={r.notes || ""}
                      onBlur={(e) => onUpdateRisk(r.id, { notes: e.target.value })}
                      placeholder="Add management notes..."
                      style={{ width: "100%", padding: "4px 6px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10, fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              ))
            );
            })()}

            {/* Ad-Hoc Dependency Linking */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, color: C.textMuted }}>
                Ad-Hoc Dependency Linking
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>
                Link any checklist item to another with dependency classification. Flagged items surface on SteerCo for escalation review.
              </div>
              {/* Row 1: Item selectors */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Item (depends on...)</div>
                  <select value={showAddDep || ""} onChange={(e) => setShowAddDep(e.target.value || null)} style={{
                    width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10,
                  }}>
                    <option value="">Select item...</option>
                    {checklistItems.filter(i => i.status !== "na").slice(0, 200).map(i => (
                      <option key={i.itemId} value={i.itemId}>{i.itemId} — {i.description.substring(0, 50)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Depends on...</div>
                  <select value={newDepTarget} onChange={(e) => setNewDepTarget(e.target.value)} style={{
                    width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10,
                  }}>
                    <option value="">Select dependency target...</option>
                    {checklistItems.filter(i => i.status !== "na" && i.itemId !== showAddDep).slice(0, 200).map(i => (
                      <option key={i.itemId} value={i.itemId}>{i.itemId} — {i.description.substring(0, 50)}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Row 2: Dependency Type + Detail */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Dependency Type</div>
                  <select value={newDepType} onChange={(e) => setNewDepType(e.target.value)} style={{
                    width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10,
                  }}>
                    <option value="predecessor">Predecessor (must complete first)</option>
                    <option value="internal_analysis">Internal Analysis Required</option>
                    <option value="external_sme">External SME Analysis Required</option>
                    <option value="data_aggregation">Data Aggregation / Normalization</option>
                    <option value="validation_required">Validation Required</option>
                    <option value="key_decision">Key Decision Needed</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 9, color: C.textMuted, marginBottom: 2 }}>Details (free text)</div>
                  <input value={newDepDetail} onChange={(e) => setNewDepDetail(e.target.value)} placeholder="Describe the specific dependency, who is involved, timeline..."
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10 }} />
                </div>
                <button onClick={() => {
                  if (showAddDep && newDepTarget) {
                    onAddDependency(showAddDep, newDepTarget, newDepType, newDepDetail);
                    setNewDepTarget(""); setNewDepDetail(""); setNewDepType("predecessor");
                  }
                }} style={{
                  padding: "6px 14px", borderRadius: 4, background: C.accent, color: "#fff", border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  opacity: showAddDep && newDepTarget ? 1 : 0.4, whiteSpace: "nowrap",
                }} disabled={!showAddDep || !newDepTarget}>Link</button>
              </div>
              {/* Show existing classified dependencies */}
              {checklistItems.filter(i => (i.customDependencies || []).length > 0).length > 0 && (
                <div>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", marginBottom: 6 }}>Classified Dependencies ({checklistItems.reduce((a, i) => a + (i.customDependencies || []).length, 0)} total)</div>
                  {checklistItems.filter(i => (i.customDependencies || []).length > 0).map(item => (
                    <div key={item.itemId} style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: C.navy, border: `1px solid ${C.border}` }}>
                      <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: C.accentLight }}>{item.itemId}</span>
                        <span style={{ fontSize: 10, color: C.muted }}> — {item.description.substring(0, 60)}</span>
                      </div>
                      {(item.customDependencies || []).map((dep, idx) => {
                        const d = typeof dep === "string" ? { targetItemId: dep, dependencyType: "predecessor" as const, detail: undefined } : dep;
                        const TYPE_COLORS: Record<string, string> = {
                          predecessor: C.accent, internal_analysis: "#8B5CF6", external_sme: "#EC4899",
                          data_aggregation: "#06B6D4", validation_required: C.warning, key_decision: C.danger, other: C.muted,
                        };
                        const TYPE_SHORT: Record<string, string> = {
                          predecessor: "PRED", internal_analysis: "INT ANALYSIS", external_sme: "EXT SME",
                          data_aggregation: "DATA AGG", validation_required: "VALIDATION", key_decision: "KEY DECISION", other: "OTHER",
                        };
                        return (
                          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, paddingLeft: 12 }}>
                            <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: (TYPE_COLORS[d.dependencyType] || C.muted) + "22", color: TYPE_COLORS[d.dependencyType] || C.muted, fontWeight: 700, whiteSpace: "nowrap" }}>
                              {TYPE_SHORT[d.dependencyType] || d.dependencyType}
                            </span>
                            <span style={{ fontSize: 9, color: C.accent, fontWeight: 600 }}>{d.targetItemId}</span>
                            {d.detail && <span style={{ fontSize: 9, color: C.textMuted, fontStyle: "italic" }}>— {d.detail.substring(0, 80)}</span>}
                            <span onClick={() => onRemoveDependency(item.itemId, d.targetItemId)} style={{ cursor: "pointer", color: C.danger, fontSize: 8, marginLeft: "auto" }}>×</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Risk Heat Map */}
            <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: C.textMuted }}>
                Risk Heat Map — Section 6 Taxonomy
              </div>
              {Object.entries(RISK_LABELS).map(([key, label]) => {
                const alert = riskAlerts.find(r => r.category === key && r.status === "open");
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
          <>
          <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20, color: C.textMuted }}>
              Integration Timeline — Day 1 through Year 1
            </div>
            <div style={{ position: "relative", paddingLeft: 140 }}>
              <div style={{ position: "absolute", left: 136, top: 0, bottom: 0, width: 2, background: C.border }} />
              {[
                { phase: "Pre-Close", phaseKey: "pre_close", period: "Now → Close", color: C.accent, items: deal.checklistItems.filter(i => i.phase === "pre_close" && i.status !== "na") },
                { phase: "Day 1", phaseKey: "day_1", period: intake.closeDate || "Close Date", color: C.warning, items: deal.checklistItems.filter(i => i.phase === "day_1" && i.status !== "na" && i.priority === "critical").slice(0, 5) },
                { phase: "Day 1–30", phaseKey: "day_30", period: "+30 days", color: C.accentLight, items: deal.checklistItems.filter(i => i.phase === "day_30" && i.status !== "na").slice(0, 5) },
                { phase: "Day 30–60", phaseKey: "day_60", period: "+60 days", color: C.success, items: deal.checklistItems.filter(i => i.phase === "day_60" && i.status !== "na").slice(0, 4) },
                { phase: "Day 60–90", phaseKey: "day_90", period: "+90 days", color: C.success, items: deal.checklistItems.filter(i => i.phase === "day_90" && i.status !== "na").slice(0, 4) },
                { phase: "Year 1", phaseKey: "year_1", period: "+365 days", color: C.muted, items: deal.checklistItems.filter(i => i.phase === "year_1" && i.status !== "na").slice(0, 3) },
              ].map((phase, i) => (
                <div key={i} style={{ display: "flex", marginBottom: 24, position: "relative" }}>
                  <div style={{ width: 120, textAlign: "right", paddingRight: 24, paddingTop: 2 }}>
                    <div
                      style={{ fontSize: 11, fontWeight: 700, color: phase.color, cursor: "pointer", textDecoration: "underline dotted" }}
                      title={`View all ${phase.phase} items in Checklist`}
                      onClick={() => {
                        setActiveTab("checklist");
                        setFilterPhase(phase.phaseKey);
                        setFilterWs("all");
                        setFilterStatus("all");
                        setFilterPriority("all");
                      }}
                    >{phase.phase}</div>
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
                        {phase.items.map((item, j) => {
                          const label = item.description.slice(0, 50);
                          return (
                            <span
                              key={j}
                              title={`Go to "${item.description}" in Checklist`}
                              onClick={() => {
                                setActiveTab("checklist");
                                setFilterPhase(phase.phaseKey);
                                setFilterWs("all");
                                setFilterStatus("all");
                                setFilterPriority("all");
                                setSelectedItem(item);
                                setEditingItem(false);
                              }}
                              style={{
                                padding: "3px 8px", borderRadius: 4, fontSize: 10,
                                background: phase.color + "18", color: phase.color,
                                border: `1px solid ${phase.color}33`,
                                cursor: "pointer",
                              }}
                            >{label}{label.length === 50 ? "…" : ""}</span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Dependency Matrix */}
          <div style={{ marginTop: 20, padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
              Cross-Workstream Dependency Matrix
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 10 }}>
              Rows depend on columns. Numbers show cross-workstream dependency count. Red = high coupling.
            </div>
            <DependencyMatrix items={checklistItems.map(i => ({ itemId: i.itemId, workstream: i.workstream, dependencies: i.dependencies }))} />
          </div>
          </>
        )}

        {/* ─── STEERCO TAB ─── */}
        {activeTab === "steerco" && (
          <div>
            {/* SteerCo Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>SteerCo Report Dashboard</h2>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {intake.dealName} — Week ending {getCurrentPeriodEnd()}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={async () => {
                  const snapshot = generateSnapshot(deal, getCurrentPeriodEnd(), deal.ragOverrides);
                  onSaveSnapshot(snapshot);
                  // Also sync to DB bowler table
                  if (deal.id) {
                    try {
                      // Fetch the current reporting period's UUID
                      const pRes = await fetch(`/api/periods?dealId=${deal.id}`);
                      const pData = await pRes.json();
                      const periods: any[] = pData.periods || [];
                      const currentPeriod = periods.find((p: any) => p.is_current) || periods[periods.length - 1];
                      if (currentPeriod?.id) {
                        fetch("/api/bowler", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ dealId: deal.id, periodId: currentPeriod.id }),
                        }).catch(() => {}); // Best effort — don't block on failure
                      }
                    } catch {
                      // Best effort — localStorage snapshot already saved above
                    }
                  }
                }} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: C.success, color: "#fff", border: "none", cursor: "pointer",
                }}>📸 Capture Snapshot</button>
                <button onClick={() => window.print()} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: C.accent, color: "#fff", border: "none", cursor: "pointer",
                }}>🖨 Print / Export</button>
                <button onClick={() => {
                  const currentSnapshot = deal.progressSnapshots.length > 0
                    ? deal.progressSnapshots[deal.progressSnapshots.length - 1]
                    : generateSnapshot(deal, getCurrentPeriodEnd(), deal.ragOverrides);
                  const text = currentSnapshot.workstreams.map(ws => {
                    const rag = ((deal.ragOverrides?.[ws.workstream] || ws.ragOverride || ws.ragStatus)).toUpperCase();
                    return `${ws.workstream} [${rag}] — ${ws.pctComplete}% complete, ${ws.blocked} blocked\n${ws.narrative || "No narrative provided"}`;
                  }).join("\n\n");
                  navigator.clipboard.writeText(`Integration Status Report — ${intake.dealName}\nWeek ending ${getCurrentPeriodEnd()}\n\n${text}`);
                }} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: C.deepBlue, color: C.text, border: `1px solid ${C.border}`, cursor: "pointer",
                }}>📋 Copy Summary</button>
                <button onClick={() => setShowReportDrafter(!showReportDrafter)} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: showReportDrafter ? C.accent : C.deepBlue,
                  color: showReportDrafter ? "#fff" : C.text,
                  border: `1px solid ${showReportDrafter ? C.accent : C.border}`, cursor: "pointer",
                }}>🤖 AI Assistant</button>
                <button onClick={() => setShowSlidePreview(true)} style={{
                  padding: "6px 14px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: C.deepBlue, color: C.text, border: `1px solid ${C.border}`, cursor: "pointer",
                }}>📊 Slide Deck</button>
              </div>
            </div>

            {/* AI Report Drafter */}
            {showReportDrafter && (
              <ReportDrafter
                deal={deal}
                scNarrative={scNarrative}
                onUpdateNarrative={(key, value) => setScNarrative(prev => ({ ...prev, [key]: value }))}
                onUpdateAllNarratives={(narratives) => setScNarrative(prev => ({ ...prev, ...narratives }))}
              />
            )}

            {/* Slide Deck Preview Modal */}
            {showSlidePreview && (
              <SlidePreview
                deal={deal}
                scNarrative={scNarrative}
                onClose={() => setShowSlidePreview(false)}
              />
            )}

            {/* Bowler Table — Time-Phased RAG Grid */}
            {deal.id && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: C.text }}>Integration Bowler Table</h3>
                <BowlerTable dealId={deal.id} closeDate={intake.closeDate} />
              </div>
            )}
            {!deal.id && (
              <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 20, fontSize: 11, color: C.textMuted }}>
                Bowler table requires a saved deal. Save this deal to Neon DB first (auto-saves on next change).
              </div>
            )}

            {/* Program Health Summary */}
            {(() => {
              const currentSnapshot = deal.progressSnapshots.length > 0
                ? deal.progressSnapshots[deal.progressSnapshots.length - 1]
                : generateSnapshot(deal, getCurrentPeriodEnd(), deal.ragOverrides);
              // Apply persisted deal-level overrides on top of snapshot values
              const snapshotWithOverrides = {
                ...currentSnapshot,
                workstreams: currentSnapshot.workstreams.map(ws => ({
                  ...ws,
                  ragOverride: deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride,
                })),
              };
              const programRAG = computeProgramRAG(snapshotWithOverrides.workstreams);
              const ragColor = programRAG === "red" ? C.danger : programRAG === "amber" ? C.warning : C.success;

              return (
                <>
                  {/* Summary KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 16 }}>
                    <div style={{ padding: 12, borderRadius: 6, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: ragColor, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                        {programRAG === "green" ? "✓" : programRAG === "amber" ? "!" : "✕"}
                      </div>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase" }}>Program Health</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ragColor, textTransform: "uppercase" }}>{programRAG}</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 6, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: C.accent }}>{currentSnapshot.summary.totalActive}</div>
                      <div style={{ fontSize: 9, color: C.textMuted }}>Active Items</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 6, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: C.success }}>{currentSnapshot.summary.completed}</div>
                      <div style={{ fontSize: 9, color: C.textMuted }}>Completed</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 6, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: C.danger }}>{currentSnapshot.summary.newlyBlocked}</div>
                      <div style={{ fontSize: 9, color: C.textMuted }}>Blocked</div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 6, background: C.cardBg, border: `1px solid ${C.border}`, textAlign: "center" }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color: C.warning }}>{currentSnapshot.summary.pastDue}</div>
                      <div style={{ fontSize: 9, color: C.textMuted }}>Past Due</div>
                    </div>
                  </div>

                  {/* Workstream RAG Table with Narrative Editor */}
                  <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                      Workstream Status — {snapshotWithOverrides.workstreams.length} Workstreams
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                          <th style={{ textAlign: "left", padding: "6px 8px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>WORKSTREAM</th>
                          <th style={{ textAlign: "center", padding: "6px 4px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>RAG</th>
                          <th style={{ textAlign: "center", padding: "6px 4px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>% DONE</th>
                          <th style={{ textAlign: "center", padding: "6px 4px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>COMPLETE</th>
                          <th style={{ textAlign: "center", padding: "6px 4px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>ACTIVE</th>
                          <th style={{ textAlign: "center", padding: "6px 4px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>BLOCKED</th>
                          <th style={{ textAlign: "center", padding: "6px 4px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>PAST DUE</th>
                          <th style={{ textAlign: "left", padding: "6px 8px", color: C.textMuted, fontWeight: 600, fontSize: 9 }}>NARRATIVE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshotWithOverrides.workstreams.map((ws) => {
                          const persistedOverride = deal.ragOverrides?.[ws.workstream];
                          const effectiveRag = persistedOverride || ws.ragOverride || ws.ragStatus;
                          const ragColor2 = effectiveRag === "red" ? C.danger : effectiveRag === "amber" ? C.warning : C.success;
                          const isEditing = editingNarrative === ws.workstream;
                          return (
                            <tr key={ws.workstream} style={{ borderBottom: `1px solid ${C.border}22` }}>
                              <td style={{ padding: "8px 8px", fontWeight: 600, fontSize: 11 }}>{ws.workstream}</td>
                              <td style={{ padding: "8px 4px", textAlign: "center" }}>
                                <select value={persistedOverride || ws.ragOverride || ""} onChange={(e) => {
                                  const val = (e.target.value || undefined) as "red" | "amber" | "green" | undefined;
                                  onUpdateRagOverride(ws.workstream, val);
                                  onUpdateNarrative(snapshotWithOverrides.id, ws.workstream, { ragOverride: val });
                                }} style={{
                                  background: "transparent", border: `1px solid ${ragColor2}44`, borderRadius: 4,
                                  color: ragColor2, fontSize: 10, fontWeight: 700, padding: "2px 4px", cursor: "pointer",
                                  width: 52, textAlign: "center",
                                }}>
                                  <option value="">Auto</option>
                                  <option value="green">🟢</option>
                                  <option value="amber">🟡</option>
                                  <option value="red">🔴</option>
                                </select>
                                {deal.progressSnapshots.length > 1 && (
                                  <RAGTrend snapshots={deal.progressSnapshots} workstream={ws.workstream} />
                                )}
                              </td>
                              <td style={{ padding: "8px 4px", textAlign: "center", fontWeight: 700 }}>{ws.pctComplete}%</td>
                              <td style={{ padding: "8px 4px", textAlign: "center", color: C.success }}>{ws.completed}</td>
                              <td style={{ padding: "8px 4px", textAlign: "center", color: C.accent }}>{ws.inProgress}</td>
                              <td style={{ padding: "8px 4px", textAlign: "center", color: ws.blocked > 0 ? C.danger : C.muted }}>{ws.blocked}</td>
                              <td style={{ padding: "8px 4px", textAlign: "center", color: ws.pastDue > 0 ? C.warning : C.muted }}>{ws.pastDue}</td>
                              <td style={{ padding: "8px 8px" }}>
                                {isEditing ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    <textarea value={narrativeText} onChange={(e) => setNarrativeText(e.target.value)}
                                      placeholder="Status narrative — accomplishments, blockers, next steps..."
                                      style={{ width: "100%", padding: 6, borderRadius: 4, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10, minHeight: 50, resize: "vertical", fontFamily: "inherit" }} />
                                    <input value={narrativeRisks} onChange={(e) => setNarrativeRisks(e.target.value)} placeholder="Key risks..."
                                      style={{ padding: "3px 6px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10 }} />
                                    <input value={narrativeNext} onChange={(e) => setNarrativeNext(e.target.value)} placeholder="Next steps..."
                                      style={{ padding: "3px 6px", borderRadius: 3, border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 10 }} />
                                    <div style={{ display: "flex", gap: 4 }}>
                                      <button onClick={() => {
                                        onUpdateNarrative(snapshotWithOverrides.id, ws.workstream, { narrative: narrativeText, keyRisks: narrativeRisks, nextSteps: narrativeNext });
                                        setEditingNarrative(null);
                                      }} style={{ padding: "3px 10px", borderRadius: 3, background: C.success, color: "#fff", border: "none", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Save</button>
                                      <button onClick={() => setEditingNarrative(null)} style={{ padding: "3px 10px", borderRadius: 3, background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`, fontSize: 9, cursor: "pointer" }}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div onClick={() => {
                                    setEditingNarrative(ws.workstream);
                                    setNarrativeText(ws.narrative || "");
                                    setNarrativeRisks(typeof ws.keyRisks === "string" ? ws.keyRisks : (ws.keyRisks || []).join(", "));
                                    setNarrativeNext(typeof ws.nextSteps === "string" ? ws.nextSteps : (ws.nextSteps || []).join(", "));
                                  }} style={{ cursor: "pointer", fontSize: 10, color: ws.narrative ? C.text : C.muted, fontStyle: ws.narrative ? "normal" : "italic" }}>
                                    {ws.narrative ? (ws.narrative.length > 120 ? <span title={ws.narrative}>{ws.narrative.substring(0, 120)}…</span> : ws.narrative) : "Click to add narrative..."}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Owner Workload */}
                  <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                      Owner Workload
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                      {snapshotWithOverrides.owners.map((owner) => {
                        const pct = owner.total ? Math.round((owner.completed / owner.total) * 100) : 0;
                        return (
                          <div key={owner.ownerName} style={{ padding: 10, borderRadius: 6, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{owner.ownerName}</div>
                            <div style={{ display: "flex", gap: 8, fontSize: 9, color: C.textMuted }}>
                              <span style={{ color: C.success }}>✓{owner.completed}</span>
                              <span style={{ color: C.accent }}>→{owner.inProgress}</span>
                              <span style={{ color: C.danger }}>✕{owner.blocked}</span>
                              <span>Total: {owner.total}</span>
                            </div>
                            <div style={{ width: "100%", height: 4, background: C.cardBg, borderRadius: 2, marginTop: 6 }}>
                              <div style={{ width: `${pct}%`, height: "100%", background: C.success, borderRadius: 2 }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Progress Chart */}
                  <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                    <ProgressChart workstreams={snapshotWithOverrides.workstreams} />
                  </div>

                  {/* Burndown Chart */}
                  <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, color: C.textMuted }}>
                      Progress Burndown
                    </div>
                    <BurndownChart snapshots={deal.progressSnapshots} totalItems={checklistItems.filter(i => i.status !== "na").length} />
                  </div>

                  {/* Snapshot History */}
                  {deal.progressSnapshots.length > 1 && (
                    <div style={{ padding: 16, borderRadius: 8, background: C.cardBg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: C.textMuted }}>
                        Report History — {deal.progressSnapshots.length} Snapshots
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {deal.progressSnapshots.map((snap, idx) => {
                          const progRag = computeProgramRAG(snap.workstreams);
                          const rc = progRag === "red" ? C.danger : progRag === "amber" ? C.warning : C.success;
                          return (
                            <div key={snap.id} style={{
                              padding: "6px 10px", borderRadius: 6, background: C.deepBlue, border: `1px solid ${C.border}`,
                              fontSize: 10, display: "flex", alignItems: "center", gap: 6,
                            }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: rc, display: "inline-block" }} />
                              <span>Week {snap.periodEnd}</span>
                              <span style={{ color: C.muted }}>({snap.summary.completed} done, {snap.summary.newlyBlocked} blocked)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* ─── STEERCO NARRATIVE SECTIONS ─── */}
            <div style={{ marginTop: 20, padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>SteerCo Executive Narrative</h3>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                    Structured report sections for IMO leadership review and SteerCo presentation
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={loadSteerCoNarrative} style={{
                    padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.border}`, cursor: "pointer",
                    background: "transparent", color: C.textMuted, fontSize: 10, fontWeight: 500,
                  }}>Load Previous</button>
                  <button onClick={saveSteerCoNarrative} disabled={scSaving || !deal.id} style={{
                    padding: "5px 16px", borderRadius: 5, border: "none", cursor: "pointer",
                    background: scSaved ? C.success : C.accent, color: "#fff", fontSize: 10, fontWeight: 600,
                    opacity: scSaving || !deal.id ? 0.5 : 1,
                    transition: "background 0.2s",
                  }}>{scSaving ? "Saving..." : scSaved ? "✓ Saved!" : "💾 Save to DB"}</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { key: "overallStatus", label: "Overall Status", placeholder: "Summarize overall integration program status, key themes, and trajectory..." },
                  { key: "keyIssues", label: "Key Issues", placeholder: "List critical issues requiring attention or resolution..." },
                  { key: "keyDelays", label: "Key Delays", placeholder: "Identify timeline delays, root causes, and mitigation plans..." },
                  { key: "keyFindings", label: "Key Findings", placeholder: "Highlight important discoveries from workstream activities..." },
                  { key: "materialImpacts", label: "Material Impacts", placeholder: "Describe significant impacts to deal thesis, synergies, or operations..." },
                  { key: "materialDependencies", label: "Material Dependencies", placeholder: "List critical dependencies that could affect integration timeline..." },
                  { key: "materialOperationalImpacts", label: "Material Operational Impacts", placeholder: "Detail operational impacts to day-to-day business continuity..." },
                  { key: "keyDecisionsEscalations", label: "Key Decisions & Escalations", placeholder: "Document decisions needed from leadership and escalation items..." },
                  { key: "financialImpacts", label: "Financial Impacts", placeholder: "Quantify financial impacts: synergy tracking, cost overruns, one-time costs..." },
                  { key: "overallBudget", label: "Overall Budget & % Complete", placeholder: "Budget status, spend-to-date, forecast, and completion percentage..." },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {field.label}
                    </label>
                    <textarea
                      value={scNarrative[field.key] || ""}
                      onChange={e => setScNarrative(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      style={{
                        width: "100%", minHeight: 80, padding: 10, borderRadius: 6,
                        background: C.navy, border: `1px solid ${C.border}`, color: C.text,
                        fontSize: 11, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6,
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Auto-computed completion */}
              <div style={{ marginTop: 12, display: "flex", gap: 20, padding: "10px 12px", borderRadius: 6, background: C.navy, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  Auto-computed: <b style={{ color: C.accent }}>{kpis.pctComplete}%</b> items complete ({kpis.complete}/{kpis.total})
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  Blocked: <b style={{ color: kpis.blocked > 0 ? C.danger : C.success }}>{kpis.blocked}</b>
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  Active Risks: <b style={{ color: C.warning }}>{riskAlerts.filter(r => r.status === "open").length}</b>
                </div>
                <div style={{ fontSize: 10, color: C.textMuted }}>
                  Unassigned: <b style={{ color: C.warning }}>{checklistItems.filter(i => i.status !== "na" && !i.ownerId).length}</b>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── ADMIN TAB ─── */}
        {activeTab === "admin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Admin</h2>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Deal settings, permissions, database management, and audit log</div>
            </div>

            {/* ─ Section A: Deal Settings ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: C.textMuted }}>
                A. Deal Settings
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Deal Name</label>
                  <input
                    value={adminDealName}
                    onChange={e => setAdminDealName(e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 6,
                      border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 12,
                      fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Deal Status</label>
                  <select
                    value={adminDealStatus}
                    onChange={e => setAdminDealStatus(e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 6,
                      border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 12,
                      fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="pre_close">Pre-Close</option>
                    <option value="complete">Complete</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Close Date</label>
                  <input
                    type="date"
                    value={adminCloseDate}
                    onChange={e => setAdminCloseDate(e.target.value)}
                    style={{
                      width: "100%", padding: "7px 10px", borderRadius: 6,
                      border: `1px solid ${C.border}`, background: C.deepBlue, color: C.text, fontSize: 12,
                      fontFamily: "inherit", boxSizing: "border-box", colorScheme: "dark",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button onClick={() => {
                  if (onUpdateDeal) {
                    onUpdateDeal({ intake: { ...deal.intake, dealName: adminDealName, closeDate: adminCloseDate } });
                  }
                  setAdminSettingsSaved(true);
                  setTimeout(() => setAdminSettingsSaved(false), 2500);
                }} style={{
                  padding: "7px 20px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: adminSettingsSaved ? C.success : C.accent, color: "#fff",
                  fontSize: 11, fontWeight: 600, transition: "background 0.2s",
                }}>
                  {adminSettingsSaved ? "✓ Saved" : "Save Deal Settings"}
                </button>
                {!onUpdateDeal && (
                  <span style={{ fontSize: 10, color: C.warning }}>⚠ onUpdateDeal prop not connected — settings won&apos;t persist</span>
                )}
              </div>
            </div>

            {/* ─ Section B: Users & Permissions ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: C.textMuted }}>
                B. Users &amp; Permissions
              </div>
              {deal.people.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
                  No team members yet. Add people in the Team Assignments tab.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      {["Name", "Email", "Role", "Permission Level", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: C.textMuted, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deal.people.map(person => (
                      <tr key={person.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                        <td style={{ padding: "8px 8px", fontWeight: 600, color: C.text }}>{person.name}</td>
                        <td style={{ padding: "8px 8px", color: C.textMuted }}>{person.email || "—"}</td>
                        <td style={{ padding: "8px 8px", color: C.textMuted }}>{person.role || "—"}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <select
                            value={person.permissionLevel || "viewer"}
                            onChange={e => {
                              if (onUpdatePerson) onUpdatePerson(person.id, { permissionLevel: e.target.value as any });
                            }}
                            style={{
                              padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`,
                              background: C.deepBlue, color: C.text, fontSize: 10, cursor: "pointer",
                            }}
                          >
                            <option value="admin">Admin — Full access incl. Admin settings</option>
                            <option value="imo_lead">IMO Lead — Full access except Admin</option>
                            <option value="workstream_lead">Workstream Lead — Own WS + Team (view) + SteerCo (view)</option>
                            <option value="viewer">Viewer — Read-only all tabs</option>
                            <option value="external">External — Read-only SteerCo only</option>
                          </select>
                        </td>
                        <td style={{ padding: "8px 8px" }}>
                          <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10,
                            background: (person.permissionLevel === "admin" ? C.accent : person.permissionLevel === "imo_lead" ? C.success : C.muted) + "22",
                            color: person.permissionLevel === "admin" ? C.accentLight : person.permissionLevel === "imo_lead" ? C.success : C.textMuted,
                            fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            {person.permissionLevel || "viewer"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop: 10, fontSize: 10, color: C.muted }}>
                Note: Permission levels are stored as metadata only — no auth enforcement is active in this version.
              </div>
            </div>

            {/* ─ Section C: Database Management ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: C.textMuted }}>
                C. Database Management
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button onClick={async () => { if (onForceSave) await onForceSave(); }} disabled={!onForceSave} style={{
                  padding: "7px 16px", borderRadius: 6, border: "none", cursor: onForceSave ? "pointer" : "not-allowed",
                  background: C.accent, color: "#fff", fontSize: 11, fontWeight: 600,
                  opacity: onForceSave ? 1 : 0.5,
                }}>Force Save to DB</button>
                <button onClick={exportDealAsJson} style={{
                  padding: "7px 16px", borderRadius: 6, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.text, fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}>Export Deal as JSON</button>
                <label style={{
                  padding: "7px 16px", borderRadius: 6, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.text, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  display: "inline-block",
                }}>
                  Import Deal from JSON
                  <input type="file" accept=".json" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      try {
                        const parsed = JSON.parse(ev.target?.result as string);
                        if (!parsed.intake || !parsed.checklistItems) {
                          setAdminImportError("Invalid deal JSON — missing intake or checklistItems fields.");
                          return;
                        }
                        if (onUpdateDeal) onUpdateDeal(parsed);
                        setAdminImportError(null);
                      } catch {
                        setAdminImportError("Failed to parse JSON file. Please check the file format.");
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }} />
                </label>
              </div>
              {adminImportError && (
                <div style={{ fontSize: 10, color: C.danger, marginBottom: 10, padding: "6px 10px", borderRadius: 5, background: C.danger + "11", border: `1px solid ${C.danger}33` }}>
                  ⚠ {adminImportError}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Last DB Save</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{lastSavedAt ? new Date(lastSavedAt).toLocaleString() : "Unknown"}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Deal DB ID</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: C.accentLight, fontFamily: "monospace", wordBreak: "break-all" }}>{deal.id || "Not saved to DB yet"}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Checklist Items</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{deal.checklistItems.length}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{deal.checklistItems.filter(i => i.status !== "na").length} active</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Team Members</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>{deal.people.length}</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Risk Alerts</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: deal.riskAlerts.filter(r => r.status === "open").length > 0 ? C.danger : C.success }}>
                    {deal.riskAlerts.filter(r => r.status === "open").length}
                  </div>
                  <div style={{ fontSize: 9, color: C.muted }}>open of {deal.riskAlerts.length} total</div>
                </div>
              </div>
            </div>

            {/* ─ Section D: Audit Log ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: C.textMuted }}>
                D. Audit Log
              </div>
              {(deal.changeLog || []).length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No changes recorded yet.</div>
              ) : (
                <div style={{ maxHeight: 340, overflowY: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead style={{ position: "sticky", top: 0, background: C.deepBlue, zIndex: 1 }}>
                      <tr>
                        {["Timestamp", "Item", "Field", "Old Value", "New Value"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: C.textMuted, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...(deal.changeLog || [])].reverse().slice(0, 50).map(evt => (
                        <tr key={evt.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                          <td style={{ padding: "6px 10px", color: C.textMuted, whiteSpace: "nowrap" }}>
                            {new Date(evt.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: "6px 10px", fontWeight: 600, color: C.accent, whiteSpace: "nowrap" }}>{evt.itemId}</td>
                          <td style={{ padding: "6px 10px", color: C.text, textTransform: "capitalize" }}>{evt.field}</td>
                          <td style={{ padding: "6px 10px", color: C.danger, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{evt.oldValue}</td>
                          <td style={{ padding: "6px 10px", color: C.success, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{evt.newValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 10, color: C.muted }}>
                Showing last {Math.min((deal.changeLog || []).length, 50)} of {(deal.changeLog || []).length} entries.
              </div>
            </div>

            {/* ─ Section E: Generation Intelligence ─ */}
            {deal.generationLog && deal.generationLog.length > 0 && (() => {
              const log = deal.generationLog!;
              const signals = deal.parameterSignals ?? [];
              const mustHaveCount = (deal.mustHaveAlerts ?? []).length;
              const naCount = log.filter(e => e.layer === "filtering").reduce((acc, e) => acc + e.itemsAffected.length, 0);
              const elevatedCount = log.filter(e => e.layer === "priority" && e.rule.includes("elevat")).reduce((acc, e) => acc + e.itemsAffected.length, 0);
              const phaseCount = log.filter(e => e.layer === "timeline").reduce((acc, e) => acc + e.itemsAffected.length, 0);
              const layerIds = ["filtering", "priority", "parent_gap", "sector", "timeline"] as const;
              const layerLabels: Record<string, string> = {
                filtering: "Layer 1 — Enhanced Filtering",
                priority: "Layer 2 — Priority Calibration",
                parent_gap: "Layer 3 — Parent Profile Gap Analysis",
                sector: "Layer 4 — Sector Overlay",
                timeline: "Layer 5 — Timeline Adjustment",
              };
              const signalColors: Record<string, string> = {
                elevate: "#10B981", reduce: "#F59E0B", exclude: "#EF4444",
                extend: "#A78BFA", compress: "#60A5FA", activate: "#3B82F6",
              };
              return (
                <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  {/* Header row */}
                  <div
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}
                    onClick={() => setGenIntelOpen(o => !o)}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted, marginBottom: 4 }}>
                        E. Generation Intelligence
                      </div>
                      {/* Summary row */}
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {[
                          { label: "Items excluded", value: naCount, color: "#EF4444" },
                          { label: "Priority elevated", value: elevatedCount, color: "#10B981" },
                          { label: "Phase-adjusted", value: phaseCount, color: "#A78BFA" },
                          { label: "Must-haves protected", value: mustHaveCount, color: "#F59E0B" },
                          { label: "Signals detected", value: signals.length, color: "#60A5FA" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color }}>{value}</span>
                            <span style={{ fontSize: 10, color: C.textMuted }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          // Trigger methodology report generation via agent
                          const msg = new CustomEvent("agent:prompt", { detail: "generate methodology report" });
                          window.dispatchEvent(msg);
                        }}
                        style={{
                          padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`,
                          background: "transparent", color: C.textMuted, fontSize: 10, fontWeight: 600,
                          cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        ↓ Methodology Report
                      </button>
                      <span style={{ fontSize: 16, color: C.textMuted, transform: genIntelOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                    </div>
                  </div>

                  {genIntelOpen && (
                    <div style={{ marginTop: 16 }}>
                      {/* Parameter signals table */}
                      {signals.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, marginBottom: 8 }}>
                            Parameter Signals
                          </div>
                          <div style={{ borderRadius: 6, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                              <thead>
                                <tr style={{ background: C.deepBlue, borderBottom: `1px solid ${C.border}` }}>
                                  {["Parameter", "Value", "Signal", "Description"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: C.textMuted, fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {signals.map((s, i) => (
                                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}22` }}>
                                    <td style={{ padding: "6px 10px", color: C.textMuted, fontFamily: "monospace", fontSize: 9 }}>{s.parameter}</td>
                                    <td style={{ padding: "6px 10px", color: C.text, fontWeight: 600 }}>{s.value}</td>
                                    <td style={{ padding: "6px 10px" }}>
                                      <span style={{
                                        padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                                        background: (signalColors[s.signal] ?? C.accent) + "22",
                                        color: signalColors[s.signal] ?? C.accent,
                                        border: `1px solid ${(signalColors[s.signal] ?? C.accent)}44`,
                                      }}>{s.signal}</span>
                                    </td>
                                    <td style={{ padding: "6px 10px", color: C.textMuted, lineHeight: 1.5 }}>{s.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Layer accordion */}
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, marginBottom: 8 }}>
                        Layer Breakdown
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {layerIds.map(layerId => {
                          const entries = log.filter(e => e.layer === layerId);
                          if (entries.length === 0) return null;
                          const isOpen = genIntelLayer === layerId;
                          return (
                            <div key={layerId} style={{ borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                              <div
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: C.deepBlue, cursor: "pointer" }}
                                onClick={() => setGenIntelLayer(isOpen ? null : layerId)}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{layerLabels[layerId]}</span>
                                  <span style={{ fontSize: 9, color: C.textMuted }}>{entries.length} rule{entries.length !== 1 ? "s" : ""} fired</span>
                                </div>
                                <span style={{ fontSize: 12, color: C.textMuted, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                              </div>
                              {isOpen && (
                                <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 10, background: C.cardBg }}>
                                  {entries.map((entry, i) => (
                                    <div key={i} style={{ paddingBottom: 10, borderBottom: i < entries.length - 1 ? `1px solid ${C.border}22` : "none" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 9, fontFamily: "monospace", color: C.accent, background: C.accent + "18", padding: "1px 7px", borderRadius: 4 }}>{entry.rule}</span>
                                        <span style={{ fontSize: 9, color: C.textMuted }}>parameter: {entry.parameter}</span>
                                        <span style={{ fontSize: 9, color: C.textMuted }}>· {entry.itemsAffected.length} item{entry.itemsAffected.length !== 1 ? "s" : ""}</span>
                                      </div>
                                      <div style={{ fontSize: 10, color: C.text, lineHeight: 1.6, marginBottom: 4 }}>{entry.reasoning}</div>
                                      {entry.itemsAffected.length > 0 && (
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                          {entry.itemsAffected.slice(0, 12).map(id => (
                                            <span key={id} style={{ fontSize: 8, fontFamily: "monospace", color: C.textMuted, background: C.deepBlue, border: `1px solid ${C.border}`, borderRadius: 3, padding: "1px 5px" }}>{id}</span>
                                          ))}
                                          {entry.itemsAffected.length > 12 && (
                                            <span style={{ fontSize: 8, color: C.textMuted }}>+{entry.itemsAffected.length - 12} more</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ─ Section F: Workstream Context ─ */}
            {(() => {
              const activeWorkstreams = Array.from(
                new Set(deal.checklistItems.map(i => i.workstream))
              ).sort();
              return (
                <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, color: C.textMuted }}>
                    F. Workstream Context
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>
                    Per-workstream notes, priority adjustments, and re-activation of engine-excluded items.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeWorkstreams.map(ws => {
                      const wsItems = deal.checklistItems.filter(i => i.workstream === ws);
                      const activeCount = wsItems.filter(i => i.status !== "na").length;
                      const naCount = wsItems.filter(i => i.status === "na").length;
                      const reactivatableCount = wsItems.filter(i => i.status === "na" && i.naJustification).length;
                      const override = deal.workstreamOverrides?.[ws];
                      const notesDraft = wsNotesDraft[ws] ?? (override?.notes ?? "");
                      const isConfirming = wsReactivateConfirm === ws;

                      return (
                        <div key={ws} style={{ padding: "12px 14px", borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{ws}</span>
                              <span style={{ marginLeft: 10, fontSize: 10, color: C.textMuted }}>
                                {activeCount} active
                                {naCount > 0 && <span style={{ color: C.warning }}> · {naCount} N/A{reactivatableCount > 0 ? ` (${reactivatableCount} engine-excluded)` : ""}</span>}
                              </span>
                              {override?.reactivatedAt && (
                                <span style={{ marginLeft: 8, fontSize: 9, background: "#10B98122", color: "#10B981", border: "1px solid #10B98133", borderRadius: 4, padding: "1px 6px" }}>
                                  Reactivated {new Date(override.reactivatedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                              <button
                                onClick={() => onUpdateWorkstreamOverride?.(ws, { action: "priority_bump" })}
                                title="Elevate all active items +1 priority tier"
                                style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: "#10B981", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                              >↑ Elevate All</button>
                              <button
                                onClick={() => onUpdateWorkstreamOverride?.(ws, { action: "priority_reduce" })}
                                title="Reduce all active items -1 priority tier"
                                style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.warning, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                              >↓ Reduce All</button>
                              {reactivatableCount > 0 && (
                                isConfirming ? (
                                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                    <span style={{ fontSize: 10, color: C.warning }}>Re-activate {reactivatableCount} items?</span>
                                    <button
                                      onClick={() => { onUpdateWorkstreamOverride?.(ws, { action: "reactivate" }); setWsReactivateConfirm(null); }}
                                      style={{ padding: "3px 10px", borderRadius: 5, border: "none", background: "#EF4444", color: "#fff", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                                    >Confirm</button>
                                    <button
                                      onClick={() => setWsReactivateConfirm(null)}
                                      style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                                    >Cancel</button>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => setWsReactivateConfirm(ws)}
                                    style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid rgba(239,68,68,0.4)`, background: "transparent", color: "#EF4444", fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                                  >↺ Reactivate N/A</button>
                                )
                              )}
                            </div>
                          </div>
                          <textarea
                            value={notesDraft}
                            onChange={e => setWsNotesDraft(d => ({ ...d, [ws]: e.target.value }))}
                            onBlur={() => {
                              const notes = wsNotesDraft[ws] ?? "";
                              if (notes !== (override?.notes ?? "")) {
                                onUpdateWorkstreamOverride?.(ws, { notes });
                              }
                            }}
                            placeholder={`Deal-specific notes for ${ws}… (auto-saved on blur)`}
                            rows={2}
                            style={{
                              width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)",
                              border: `1px solid ${C.border}`, borderRadius: 6, padding: "7px 10px",
                              color: C.text, fontSize: 11, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5,
                            }}
                          />
                          {override?.notesUpdatedAt && (
                            <div style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>
                              Notes last updated {new Date(override.notesUpdatedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ─ Section G: Override Log ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted }}>
                    G. Override &amp; Adversarial Log
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    All deviations from engine baseline — must-have overrides, priority changes, workstream re-activations
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!deal.id) return;
                    setOverrideLoading(true);
                    fetch(`/api/telemetry?dealId=${deal.id}&type=overrides&limit=100`)
                      .then(r => r.json()).then(d => setOverrideRows(d.overrides ?? [])).catch(() => {})
                      .finally(() => setOverrideLoading(false));
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                >↻ Refresh</button>
              </div>
              {overrideLoading ? (
                <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>Loading override log…</div>
              ) : overrideRows.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No overrides recorded yet. Must-have N/A confirmations, priority changes, and workstream adjustments will appear here.</div>
              ) : (
                <div style={{ maxHeight: 360, overflowY: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead style={{ position: "sticky", top: 0, background: C.deepBlue, zIndex: 1 }}>
                      <tr>
                        {["Timestamp", "Type", "Item / Workstream", "Old → New", "Reason", "Adversarial?"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: C.textMuted, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {overrideRows.map((r: any) => {
                        const isAdversarial = r.override_type === "na_must_have";
                        return (
                          <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}22`, background: isAdversarial ? "rgba(239,68,68,0.04)" : "transparent" }}>
                            <td style={{ padding: "6px 10px", color: C.textMuted, whiteSpace: "nowrap", fontSize: 9 }}>
                              {new Date(r.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <span style={{
                                fontSize: 8, fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4,
                                background: isAdversarial ? "#EF444422" : "#3B82F622",
                                color: isAdversarial ? "#EF4444" : "#3B82F6",
                                border: `1px solid ${isAdversarial ? "#EF444444" : "#3B82F644"}`,
                              }}>{r.override_type?.replace(/_/g, " ")}</span>
                            </td>
                            <td style={{ padding: "6px 10px", color: C.text }}>
                              {r.item_id && <span style={{ fontFamily: "monospace", color: C.accent, marginRight: 4 }}>{r.item_id}</span>}
                              {r.workstream && <span style={{ color: C.textMuted }}>{r.workstream}</span>}
                              {r.item_description && <div style={{ color: C.muted, fontSize: 9, marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.item_description}</div>}
                            </td>
                            <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                              {r.previous_value && <><span style={{ color: "#EF4444" }}>{r.previous_value}</span><span style={{ color: C.muted }}> → </span></>}
                              {r.new_value && <span style={{ color: "#10B981" }}>{r.new_value}</span>}
                            </td>
                            <td style={{ padding: "6px 10px", color: C.textMuted, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9 }}>
                              {r.override_reason || "—"}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "center" }}>
                              {isAdversarial && <span style={{ fontSize: 14 }}>⚠</span>}
                              {r.warning_shown && <span style={{ fontSize: 9, color: C.warning, marginLeft: 2 }}>warned</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─ Section H: API Telemetry ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.textMuted }}>
                    H. API Telemetry
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    All Claude API calls — tokens consumed, latency, actions executed
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!deal.id) return;
                    setTelemetryLoading(true);
                    fetch(`/api/telemetry?dealId=${deal.id}&limit=100`)
                      .then(r => r.json()).then(d => { setTelemetryRows(d.telemetry ?? []); setTelemetrySummary(d.summary ?? null); }).catch(() => {})
                      .finally(() => setTelemetryLoading(false));
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}
                >↻ Refresh</button>
              </div>
              {telemetrySummary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  {[
                    { label: "Total Calls", value: telemetrySummary.totalCalls, color: C.accent },
                    { label: "Input Tokens", value: telemetrySummary.totalInputTokens?.toLocaleString(), color: C.accentLight },
                    { label: "Output Tokens", value: telemetrySummary.totalOutputTokens?.toLocaleString(), color: "#10B981" },
                    { label: "Avg Latency", value: `${telemetrySummary.avgLatency}ms`, color: C.warning },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: "10px 12px", borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color }}>{value ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}
              {telemetryLoading ? (
                <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>Loading telemetry…</div>
              ) : telemetryRows.length === 0 ? (
                <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>No API calls recorded yet. Assistant interactions and document synthesis will appear here.</div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <thead style={{ position: "sticky", top: 0, background: C.deepBlue, zIndex: 1 }}>
                      <tr>
                        {["Timestamp", "Type", "Model", "In Tokens", "Out Tokens", "Latency", "Actions", "Status"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: C.textMuted, fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.7, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {telemetryRows.map((r: any) => (
                        <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                          <td style={{ padding: "6px 10px", color: C.textMuted, whiteSpace: "nowrap", fontSize: 9 }}>{new Date(r.created_at).toLocaleString()}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: C.accent + "22", color: C.accentLight, border: `1px solid ${C.accent}33` }}>
                              {r.call_type}{r.doc_type ? `:${r.doc_type}` : ""}
                            </span>
                          </td>
                          <td style={{ padding: "6px 10px", color: C.textMuted, fontSize: 9 }}>{r.model ?? "—"}</td>
                          <td style={{ padding: "6px 10px", color: C.text, fontFamily: "monospace" }}>{r.input_tokens?.toLocaleString() ?? "—"}</td>
                          <td style={{ padding: "6px 10px", color: "#10B981", fontFamily: "monospace" }}>{r.output_tokens?.toLocaleString() ?? "—"}</td>
                          <td style={{ padding: "6px 10px", color: r.latency_ms > 3000 ? C.warning : C.textMuted, fontFamily: "monospace" }}>
                            {r.latency_ms ? `${r.latency_ms}ms` : "—"}
                          </td>
                          <td style={{ padding: "6px 10px", color: C.textMuted, fontSize: 9, maxWidth: 160 }}>
                            {(r.actions_taken as string[] ?? []).slice(0, 3).join(", ") || "—"}
                            {(r.actions_taken?.length ?? 0) > 3 && <span style={{ color: C.muted }}> +{r.actions_taken.length - 3}</span>}
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{ fontSize: 9, color: r.status === "ok" ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                              {r.status ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─ Section I: System Info ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: C.textMuted }}>
                F. System Info
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>App Version</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>v0.7.0</div>
                </div>
                <div style={{ padding: 14, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>API Status</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: adminApiStatus === "ok" ? C.success : adminApiStatus === "error" ? C.danger : C.muted,
                      display: "inline-block",
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: adminApiStatus === "ok" ? C.success : adminApiStatus === "error" ? C.danger : C.textMuted }}>
                      {adminApiStatus === "ok" ? "Configured" : adminApiStatus === "error" ? "Not configured / Error" : "Not checked"}
                    </span>
                    <button onClick={checkApiStatus} disabled={adminApiChecking} style={{
                      padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.textMuted, fontSize: 9, cursor: adminApiChecking ? "not-allowed" : "pointer",
                      opacity: adminApiChecking ? 0.5 : 1,
                    }}>{adminApiChecking ? "Checking..." : "Test"}</button>
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>Database</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: deal.id ? C.success : C.warning, display: "inline-block" }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: deal.id ? C.success : C.warning }}>
                      {deal.id ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                </div>
                <div style={{ padding: 14, borderRadius: 8, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>localStorage Usage</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{getLocalStorageSize()}</div>
                </div>
              </div>
            </div>

            {/* ─ Section J: Neon Branch Operations ─ */}
            <div style={{ padding: 20, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, color: C.textMuted }}>
                J. Neon Branch Operations
              </div>

              {/* J1 — Live Branch Status */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>Branch Status</div>
                  <button
                    onClick={refreshBranchStatus}
                    disabled={branchStatusLoading || !deal.id}
                    style={{
                      padding: "3px 10px", borderRadius: 4, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.textMuted, fontSize: 9, cursor: "pointer",
                      opacity: branchStatusLoading ? 0.5 : 1,
                    }}
                  >
                    {branchStatusLoading ? "Checking…" : "Refresh Status"}
                  </button>
                </div>
                {branchStatus && !branchStatus.error ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 8 }}>
                    {/* Tile: Branching Enabled */}
                    <div style={{ padding: 10, borderRadius: 7, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Branching Enabled</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: branchStatus.branchingEnabled ? C.success : C.warning }}>
                        {branchStatus.branchingEnabled ? "✅  Active" : "⚠  Not configured"}
                      </div>
                    </div>
                    {/* Tile: NEON_API_KEY */}
                    <div style={{ padding: 10, borderRadius: 7, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>NEON_API_KEY</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: branchStatus.neonApiKey === "configured" ? C.success : C.warning }}>
                        {branchStatus.neonApiKey === "configured" ? "✅  Set" : "⚠  Not set"}
                      </div>
                    </div>
                    {/* Tile: NEON_PROJECT_ID */}
                    <div style={{ padding: 10, borderRadius: 7, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>NEON_PROJECT_ID</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: branchStatus.neonProjectId === "configured" ? C.success : C.warning }}>
                        {branchStatus.neonProjectId === "configured" ? "✅  Set" : "⚠  Not set"}
                      </div>
                    </div>
                    {/* Tile: Branch ID */}
                    <div style={{ padding: 10, borderRadius: 7, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>This Deal's Branch</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: branchStatus.dealIsOnBranch ? C.success : C.textMuted, fontFamily: "monospace" }}>
                        {branchStatus.neonBranchId ?? "main (unbranched)"}
                      </div>
                    </div>
                    {/* Tile: Storage */}
                    <div style={{ padding: 10, borderRadius: 7, background: C.deepBlue, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 }}>Branch Storage</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: branchStatus.dealIsOnBranch ? C.success : C.textMuted }}>
                        {branchStatus.dealIsOnBranch ? "🔀  Isolated" : "📂  Shared (main)"}
                      </div>
                    </div>
                  </div>
                ) : branchStatus?.error ? (
                  <div style={{ fontSize: 10, color: C.danger, padding: "6px 10px", borderRadius: 5, background: C.danger + "11", border: `1px solid ${C.danger}33` }}>
                    ⚠ {branchStatus.error}
                  </div>
                ) : (
                  <div style={{ fontSize: 10, color: C.textMuted, fontStyle: "italic" }}>
                    Click "Refresh Status" to check current branch configuration.
                  </div>
                )}
              </div>

              {/* J2 — Architecture */}
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 6, background: C.accent + "10", borderLeft: `3px solid ${C.accent}`, fontSize: 10, lineHeight: 1.6, color: C.accentLight }}>
                <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 6 }}>ARCHITECTURE</span>
                Each new deal gets its own Neon branch forked from the main branch at creation time.
                Main holds <strong>master_catalogue</strong> (seeded baseline) and the deals registry.
                All deal-specific data — checklist items, risk alerts, SteerCo narratives, bowler tables — lives on the branch, fully isolated from every other deal.
              </div>

              {/* J3 — Cold Start */}
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 6, background: C.warning + "10", borderLeft: `3px solid ${C.warning}`, fontSize: 10, lineHeight: 1.6, color: "#FBBF24" }}>
                <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 6 }}>COLD START</span>
                Neon compute scales to zero after <strong>1 hour of inactivity</strong>. The first request to an idle branch takes 1–3 s to wake the compute.
                Branch endpoints are configured with <code style={{ background: C.navy, padding: "1px 4px", borderRadius: 3 }}>suspend_timeout_seconds: 3600</code> so active deals stay warm during a working session.
                If opening a deal feels slow on Monday morning — this is expected. Subsequent requests will be fast.
              </div>

              {/* J4 — Schema Migrations */}
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 6, background: C.accent + "10", borderLeft: `3px solid ${C.accent}`, fontSize: 10, lineHeight: 1.6, color: C.accentLight }}>
                <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 6 }}>SCHEMA MIGRATIONS</span>
                Running <code style={{ background: C.navy, padding: "1px 4px", borderRadius: 3 }}>ALTER TABLE</code> on main does <strong>not</strong> propagate to existing deal branches (they are point-in-time forks).
                After any DDL change, run the scatter-gather migration to apply it across all active branches:
                <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 4, background: C.navy, fontFamily: "monospace", fontSize: 9, color: C.text, overflowX: "auto" }}>
                  MIGRATION_SQL=&quot;ALTER TABLE … ADD COLUMN IF NOT EXISTS …&quot; npm run migrate:branches
                </div>
              </div>

              {/* J5 — Write-Back */}
              <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 6, background: C.success + "10", borderLeft: `3px solid ${C.success}`, fontSize: 10, lineHeight: 1.6, color: "#34D399" }}>
                <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 6 }}>WRITE-BACK</span>
                Custom checklist items added by PMO (not in master_catalogue) can be promoted back to the shared catalogue so they appear in future generated deals:
                <div style={{ marginTop: 6, padding: "6px 8px", borderRadius: 4, background: C.navy, fontFamily: "monospace", fontSize: 9, color: C.text, overflowX: "auto", lineHeight: 1.7 }}>
                  GET  /api/catalogue/promote?dealId=&#123;id&#125;   — list eligible items<br />
                  POST /api/catalogue/promote  &#123; dealId, itemId &#125; — promote one item
                </div>
              </div>

              {/* J6 — Setup Checklist */}
              <div style={{ padding: "10px 12px", borderRadius: 6, background: C.deepBlue, border: `1px solid ${C.border}`, fontSize: 10, lineHeight: 1.8, color: C.textMuted }}>
                <div style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6, color: C.textMuted }}>SETUP CHECKLIST</div>
                <div><span style={{ color: C.text, fontWeight: 600 }}>NEON_API_KEY</span> — console.neon.tech → Account Settings → API keys → New API key</div>
                <div><span style={{ color: C.text, fontWeight: 600 }}>NEON_PROJECT_ID</span> — your project → Settings → General → Project ID (shown in the URL)</div>
                <div style={{ marginTop: 6, fontSize: 9, color: C.textMuted }}>Add both to .env.local and restart the dev server. New deals created after restart will get their own branch.</div>
              </div>
            </div>

          </div>
        )}

        {/* ─── AGENT ADMIN TAB ─── */}
        {activeTab === "agent" && (
          <AgentAdminTab deal={deal} />
        )}

        {/* Footer */}
        <div style={{
          marginTop: 24, padding: "14px 0", borderTop: `1px solid rgba(51, 65, 85, 0.4)`,
          display: "flex", justifyContent: "space-between", fontSize: 10, color: C.muted
        }}>
          <span>DealMapper v0.7.0 · Generated {new Date(deal.generatedAt).toLocaleString()}</span>
          <span>Powered by Claude AI · {deal.checklistItems.filter(i => i.status !== "na").length} active items across 24 workstreams</span>
        </div>
        </div>{/* main content */}
      </div>{/* flex body */}
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
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: "#94A3B8", lineHeight: 1.5, marginBottom: 6 }}>
            {risk.description}
          </div>
          {risk.mitigation && (
            <div style={{ fontSize: 10, color: "#10B981", lineHeight: 1.5, padding: "4px 8px", borderRadius: 4, background: "#10B98111", marginBottom: 6 }}>
              💡 {risk.mitigation}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
            {(risk.affectedWorkstreams || []).map((ind: string, idx: number) => (
              <span key={idx} style={{
                padding: "1px 6px", borderRadius: 3, fontSize: 8,
                background: "#3B82F622", color: "#60A5FA", fontWeight: 500,
              }}>{ind.replace(/_/g, " ")}</span>
            ))}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 8, color: "#64748B", textTransform: "uppercase" }}>Status:</span>
            <span style={{
              fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600,
              background: risk.status === "open" ? "#EF444422" : risk.status === "mitigated" ? "#10B98122" : "#F59E0B22",
              color: risk.status === "open" ? "#EF4444" : risk.status === "mitigated" ? "#10B981" : "#F59E0B",
            }}>{(risk.status || "open").toUpperCase()}</span>
          </div>
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
