"use client";

import { useState, useRef } from "react";
import type { GeneratedDeal, ChecklistItem, ItemStatus, RagStatus } from "@/lib/types";
import { getWorkstreamStats } from "@/lib/decision-tree";

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
  accentBorder: "#bfdbfe",
};

const PHASE_ORDER = ["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"] as const;
const PHASE_LABELS: Record<string, string> = {
  pre_close: "Pre-Close",
  day_1: "Day 1",
  day_30: "Day 30",
  day_60: "Day 60",
  day_90: "Day 90",
  year_1: "Year 1",
};
const PHASE_COLORS: Record<string, string> = {
  pre_close: C.accent,
  day_1: C.danger,
  day_30: C.warning,
  day_60: "#7c3aed",
  day_90: C.green,
  year_1: C.light,
};

const STATUS_CONFIG: Record<ItemStatus | "na", { label: string; color: string; bg: string }> = {
  not_started: { label: "Not Started", color: C.light,   bg: "#f9fafb" },
  in_progress:  { label: "In Progress", color: C.accent,  bg: C.accentBg },
  blocked:      { label: "Blocked",     color: C.danger,  bg: C.dangerBg },
  complete:     { label: "Complete",    color: C.green,   bg: C.greenBg },
  na:           { label: "N/A",         color: C.light,   bg: "#f9fafb" },
};

const RAG_CONFIG: Record<RagStatus, { label: string; color: string; bg: string; border: string }> = {
  red:     { label: "Red",    color: C.danger,  bg: C.dangerBg,  border: "#fecaca" },
  amber:   { label: "Amber",  color: C.warning, bg: C.warningBg, border: "#fde68a" },
  green:   { label: "Green",  color: C.green,   bg: C.greenBg,   border: C.greenBorder },
  not_set: { label: "Not Set", color: C.light,  bg: "#f9fafb",   border: C.border },
};

interface Props {
  deal: GeneratedDeal;
  onUpdateItem: (itemId: string, updates: Partial<Pick<ChecklistItem, "status" | "notes" | "blockedReason" | "dependencies">>) => void;
  onUpdateWorkstreamStatus: (workstream: string, ragStatus: RagStatus, updateText: string) => void;
  onToast?: (msg: string, color?: string) => void;
}

export default function WorkstreamView({ deal, onUpdateItem, onUpdateWorkstreamStatus, onToast }: Props) {
  const { checklistItems } = deal;
  const wsStats = getWorkstreamStats(checklistItems);
  const workstreams = Array.from(wsStats.keys());

  const [selectedWs, setSelectedWs] = useState<string>(workstreams[0] ?? "");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const commentRefs = useRef<Record<string, string>>({});

  // Build a lookup map: itemId → ChecklistItem for dependency resolution
  const itemByItemId = new Map<string, ChecklistItem>();
  checklistItems.forEach(item => itemByItemId.set(item.itemId, item));

  // Items for selected workstream
  const wsItems = checklistItems.filter(i =>
    i.workstream === selectedWs &&
    i.status !== "na" &&
    (filterPhase === "all" || i.phase === filterPhase) &&
    (filterStatus === "all" || i.status === filterStatus)
  );

  // Group by phase
  const byPhase = PHASE_ORDER.reduce<Record<string, ChecklistItem[]>>((acc, p) => {
    acc[p] = wsItems.filter(i => i.phase === p);
    return acc;
  }, {});

  const stats = wsStats.get(selectedWs);
  const pct = stats && stats.total ? Math.round((stats.complete / stats.total) * 100) : 0;
  const wsUpdate = deal.workstreamUpdates?.[selectedWs];
  const ragCfg = RAG_CONFIG[wsUpdate?.ragStatus ?? "not_set"];

  function toggleItem(id: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePhase(phase: string) {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  }

  function handleStatusChange(item: ChecklistItem, newStatus: ItemStatus) {
    onUpdateItem(item.id, { status: newStatus });
    const label = STATUS_CONFIG[newStatus]?.label ?? newStatus;
    onToast?.(`${item.itemId}: ${label}`, STATUS_CONFIG[newStatus]?.color);
  }

  function handleAddNote(item: ChecklistItem) {
    const text = commentRefs.current[item.id]?.trim();
    if (!text) return;
    const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    const newNote = `${timestamp} — ${text}`;
    onUpdateItem(item.id, { notes: [...item.notes, newNote] });
    commentRefs.current[item.id] = "";
    const el = document.getElementById(`note-input-${item.id}`) as HTMLTextAreaElement | null;
    if (el) el.value = "";
    onToast?.("Comment added", C.green);
  }

  function handleBlockedReasonChange(item: ChecklistItem, reason: string) {
    onUpdateItem(item.id, { blockedReason: reason });
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", background: C.bg }}>

      {/* ─── Left: Workstream List ─── */}
      <div
        className="ws-list-panel"
        style={{
          width: 260, flexShrink: 0,
          background: C.card, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.muted }}>
            Workstreams
          </div>
          <div style={{ fontSize: 11, color: C.light, marginTop: 2 }}>
            {deal.intake.dealName}
          </div>
        </div>

        {/* Workstream list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {workstreams.map(ws => {
            const s = wsStats.get(ws);
            if (!s) return null;
            const p = s.total ? Math.round((s.complete / s.total) * 100) : 0;
            const barColor = s.blocked > 0 ? C.danger : p === 100 ? C.green : p > 50 ? C.green : C.accent;
            const isActive = selectedWs === ws;
            const wsRag = deal.workstreamUpdates?.[ws];
            const ragDot = wsRag ? RAG_CONFIG[wsRag.ragStatus] : null;
            return (
              <button
                key={ws}
                onClick={() => setSelectedWs(ws)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 16px",
                  border: "none", cursor: "pointer",
                  background: isActive ? C.accentBg : "transparent",
                  borderLeft: `3px solid ${isActive ? C.accent : "transparent"}`,
                  transition: "all 0.12s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? C.accent : C.text, lineHeight: 1.3, maxWidth: 145 }}>
                    {ws}
                  </div>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
                    {ragDot && wsRag?.ragStatus !== "not_set" && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ragDot.color, flexShrink: 0 }} title={`Status: ${ragDot.label}`} />
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{p}%</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div style={{ width: "100%", height: 3, background: "#f3f4f6", borderRadius: 2 }}>
                  <div style={{ width: `${p}%`, height: "100%", background: barColor, borderRadius: 2, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 5, fontSize: 10 }}>
                  <span style={{ color: C.green }}>✓ {s.complete}</span>
                  <span style={{ color: C.accent }}>→ {s.inProgress}</span>
                  {s.blocked > 0 && <span style={{ color: C.danger, fontWeight: 700 }}>✕ {s.blocked}</span>}
                  <span style={{ color: C.light }}>○ {s.notStarted}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Right: Workstream Detail ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Workstream header */}
        <div style={{ padding: "20px 28px 0", borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 2 }}>{selectedWs}</h2>
              <p style={{ fontSize: 12, color: C.muted }}>
                {stats?.total ?? 0} active items · {stats?.blocked ?? 0} blocked · {pct}% complete
              </p>
            </div>
            {/* Progress mini card */}
            <div style={{ minWidth: 180, padding: "12px 16px", borderRadius: 8, background: C.card, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: C.muted }}>Progress</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? C.green : C.accent }}>{pct}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.green : C.accent, borderRadius: 3, transition: "width 0.5s" }} />
              </div>
              {stats && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: C.light }}>
                  <span>{stats.complete} done</span>
                  <span>{stats.inProgress} active</span>
                  <span>{stats.notStarted} pending</span>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={filterPhase} onChange={e => setFilterPhase(e.target.value)} style={selectStyle}>
              <option value="all">All Phases</option>
              {PHASE_ORDER.map(p => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="blocked">Blocked</option>
              <option value="complete">Complete</option>
            </select>
            <span style={{ fontSize: 12, color: C.muted, alignSelf: "center", marginLeft: "auto" }}>
              {wsItems.length} item{wsItems.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px 32px" }}>

          {/* ─── Weekly Status Update Panel ─── */}
          <WeeklyStatusPanel
            key={selectedWs}
            workstream={selectedWs}
            current={wsUpdate}
            onSave={(ragStatus, updateText) => {
              onUpdateWorkstreamStatus(selectedWs, ragStatus, updateText);
              onToast?.("Weekly status saved", C.green);
            }}
          />

          {/* Phase sections */}
          {PHASE_ORDER.map(phase => {
            const items = byPhase[phase];
            if (items.length === 0) return null;
            const phaseColor = PHASE_COLORS[phase];
            const isCollapsed = collapsedPhases.has(phase);
            const completedInPhase = items.filter(i => i.status === "complete").length;
            const blockedInPhase = items.filter(i => i.status === "blocked").length;

            return (
              <div key={phase} style={{ marginBottom: 20 }}>
                {/* Phase header */}
                <button
                  onClick={() => togglePhase(phase)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: `${phaseColor}10`, marginBottom: isCollapsed ? 0 : 8,
                    textAlign: "left",
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: phaseColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: phaseColor, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    {PHASE_LABELS[phase]}
                  </span>
                  <span style={{ fontSize: 11, color: C.light }}>{items.length} items</span>
                  {blockedInPhase > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.danger, background: C.dangerBg, padding: "1px 6px", borderRadius: 3 }}>
                      {blockedInPhase} blocked
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: C.green, marginLeft: "auto" }}>
                    {completedInPhase}/{items.length}
                  </span>
                  <span style={{ fontSize: 10, color: C.light }}>
                    {isCollapsed ? "▶" : "▼"}
                  </span>
                </button>

                {/* Items */}
                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map(item => (
                      <WorkstreamItem
                        key={item.id}
                        item={item}
                        allItems={checklistItems}
                        itemByItemId={itemByItemId}
                        isExpanded={expandedItems.has(item.id)}
                        onToggle={() => toggleItem(item.id)}
                        onStatusChange={(s) => handleStatusChange(item, s)}
                        onAddNote={() => handleAddNote(item)}
                        onBlockedReasonChange={(r) => handleBlockedReasonChange(item, r)}
                        onUpdateDependencies={(deps) => onUpdateItem(item.id, { dependencies: deps })}
                        commentRef={commentRefs}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {wsItems.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: C.light, fontSize: 13 }}>
              No items match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WeeklyStatusPanel ──────────────────────────────────────────────────────

function WeeklyStatusPanel({
  workstream,
  current,
  onSave,
}: {
  workstream: string;
  current?: { ragStatus: RagStatus; updateText: string; updatedAt: string };
  onSave: (ragStatus: RagStatus, updateText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rag, setRag] = useState<RagStatus>(current?.ragStatus ?? "not_set");
  const [text, setText] = useState(current?.updateText ?? "");

  const hasSaved = !!current;
  const cfg = RAG_CONFIG[hasSaved ? current!.ragStatus : "not_set"];

  if (!editing && hasSaved) {
    return (
      <div style={{
        marginBottom: 16, padding: "12px 16px", borderRadius: 8,
        background: C.card, border: `1px solid ${cfg.border}`,
        borderLeft: `4px solid ${cfg.color}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label} — Weekly Status</span>
          <span style={{ fontSize: 10, color: C.light, marginLeft: "auto" }}>{current!.updatedAt}</span>
          <button
            onClick={() => { setRag(current!.ragStatus); setText(current!.updateText); setEditing(true); }}
            style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
          >
            Edit
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 }}>{current!.updateText || <em>No update text provided.</em>}</p>
      </div>
    );
  }

  if (!editing && !hasSaved) {
    return (
      <div style={{
        marginBottom: 16, padding: "10px 16px", borderRadius: 8,
        background: "#f9fafb", border: `1px dashed ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, color: C.light }}>No weekly status update yet for this workstream.</span>
        <button
          onClick={() => setEditing(true)}
          style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}
        >
          + Add Status Update
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 8, background: C.card, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: C.muted, marginBottom: 10 }}>
        Weekly Status Update
      </div>

      {/* RAG selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["green", "amber", "red"] as RagStatus[]).map(r => {
          const rc = RAG_CONFIG[r];
          return (
            <button
              key={r}
              onClick={() => setRag(r)}
              style={{
                padding: "5px 14px", borderRadius: 5, border: `1px solid ${rag === r ? rc.color : C.border}`,
                background: rag === r ? rc.bg : "#f9fafb",
                color: rag === r ? rc.color : C.light,
                fontSize: 12, fontWeight: rag === r ? 700 : 400, cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {rc.label}
            </button>
          );
        })}
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={`Summarize progress, issues, and next steps for ${workstream}…`}
        rows={3}
        style={{
          width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
          border: `1px solid ${C.border}`, background: "#fff",
          color: C.text, fontFamily: "inherit", resize: "vertical", outline: "none",
          marginBottom: 8,
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => { onSave(rag, text); setEditing(false); }}
          style={{ padding: "6px 16px", borderRadius: 5, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
        >
          Save Update
        </button>
        <button
          onClick={() => setEditing(false)}
          style={{ padding: "6px 12px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── WorkstreamItem ────────────────────────────────────────────────────────────

function WorkstreamItem({
  item,
  allItems,
  itemByItemId,
  isExpanded,
  onToggle,
  onStatusChange,
  onAddNote,
  onBlockedReasonChange,
  onUpdateDependencies,
  commentRef,
}: {
  item: ChecklistItem;
  allItems: ChecklistItem[];
  itemByItemId: Map<string, ChecklistItem>;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (s: ItemStatus) => void;
  onAddNote: () => void;
  onBlockedReasonChange: (r: string) => void;
  onUpdateDependencies: (deps: string[]) => void;
  commentRef: React.MutableRefObject<Record<string, string>>;
}) {
  // Resolve dependency items
  const dependsOn = item.dependencies
    .map(depId => itemByItemId.get(depId))
    .filter(Boolean) as ChecklistItem[];

  // Reverse deps: items that depend on this item
  const blockingItems = allItems.filter(i =>
    i.status !== "na" && i.dependencies.includes(item.itemId)
  );

  const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.not_started;

  return (
    <div style={{
      borderRadius: 8, background: C.card,
      border: `1px solid ${item.status === "blocked" ? "#fecaca" : C.border}`,
      overflow: "hidden",
      boxShadow: isExpanded ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
    }}>
      {/* Summary row */}
      <div
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", cursor: "pointer",
          background: isExpanded ? "#fafafa" : "transparent",
        }}
      >
        <span style={{ fontSize: 10, color: C.light, flexShrink: 0, userSelect: "none" }}>
          {isExpanded ? "▼" : "▶"}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0, minWidth: 72 }}>
          {item.itemId}
        </span>
        <span style={{
          flex: 1, fontSize: 12, color: C.text,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: isExpanded ? "normal" : "nowrap",
        }}>
          {item.description}
        </span>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {item.tsaRelevant && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#fef9c3", color: "#a16207", border: "1px solid #fde68a", fontWeight: 600 }}>TSA</span>
          )}
          {item.crossBorderFlag && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#ede9fe", color: "#7c3aed", border: "1px solid #ddd6fe", fontWeight: 600 }}>XB</span>
          )}
          {item.dependencies.length > 0 && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: C.accentBg, color: C.accent, border: `1px solid ${C.accentBorder}`, fontWeight: 600 }} title={`Depends on: ${item.dependencies.join(", ")}`}>
              ⬡ {item.dependencies.length}
            </span>
          )}
          {blockingItems.length > 0 && (
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", fontWeight: 600 }} title={`Blocking: ${blockingItems.map(i => i.itemId).join(", ")}`}>
              ⬡→ {blockingItems.length}
            </span>
          )}
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, flexShrink: 0, minWidth: 50, textAlign: "center",
          color: item.priority === "critical" ? C.danger : item.priority === "high" ? C.warning : C.light,
          textTransform: "capitalize",
        }}>
          {item.priority}
        </span>
        <select
          value={item.status}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); onStatusChange(e.target.value as ItemStatus); }}
          style={{
            flexShrink: 0, padding: "4px 8px", borderRadius: 5, border: `1px solid ${sc.color}44`,
            background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ padding: "0 14px 14px 14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>

            {/* ─── Dependencies ─── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Dependencies
              </div>

              {/* Depends on (read) */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: C.light, marginBottom: 4 }}>
                  Requires ({dependsOn.length}):
                </div>
                {dependsOn.length === 0 ? (
                  <div style={{ fontSize: 11, color: C.light, fontStyle: "italic" }}>No upstream dependencies</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {dependsOn.map(dep => {
                      const depSc = STATUS_CONFIG[dep.status] ?? STATUS_CONFIG.not_started;
                      const isBlocker = (dep.status === "not_started" || dep.status === "in_progress" || dep.status === "blocked") && item.status !== "complete";
                      return (
                        <div key={dep.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 10px", borderRadius: 6,
                          background: isBlocker && item.status !== "not_started" ? C.dangerBg : "#f9fafb",
                          border: `1px solid ${isBlocker && item.status !== "not_started" ? "#fecaca" : C.border}`,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, minWidth: 68 }}>{dep.itemId}</span>
                          <span style={{ flex: 1, fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dep.description}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: depSc.color, background: depSc.bg, padding: "1px 6px", borderRadius: 3, flexShrink: 0 }}>{depSc.label}</span>
                          {isBlocker && item.status !== "not_started" && <span style={{ fontSize: 9, color: C.danger, fontWeight: 700 }}>⚠</span>}
                          <button
                            onClick={() => onUpdateDependencies(item.dependencies.filter(d => d !== dep.itemId))}
                            style={{ fontSize: 10, color: C.danger, background: "transparent", border: "none", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}
                            title="Remove dependency"
                          >✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Dependency selector */}
              <DependencySelector
                currentDependencies={item.dependencies}
                currentItemId={item.itemId}
                allItems={allItems}
                itemByItemId={itemByItemId}
                onAdd={(depItemId) => onUpdateDependencies([...item.dependencies, depItemId])}
              />

              {/* Blocking (downstream) */}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: C.light, marginBottom: 4 }}>
                  Blocking ({blockingItems.length}):
                </div>
                {blockingItems.length === 0 ? (
                  <div style={{ fontSize: 11, color: C.light, fontStyle: "italic" }}>No downstream dependents</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {blockingItems.slice(0, 5).map(dep => {
                      const depSc = STATUS_CONFIG[dep.status] ?? STATUS_CONFIG.not_started;
                      return (
                        <div key={dep.id} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 10px", borderRadius: 6,
                          background: "#f9fafb", border: `1px solid ${C.border}`,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", minWidth: 68 }}>{dep.itemId}</span>
                          <span style={{ flex: 1, fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dep.description}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: depSc.color, background: depSc.bg, padding: "1px 6px", borderRadius: 3, flexShrink: 0 }}>{depSc.label}</span>
                        </div>
                      );
                    })}
                    {blockingItems.length > 5 && (
                      <div style={{ fontSize: 11, color: C.light, paddingLeft: 10 }}>+{blockingItems.length - 5} more…</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── Comments & Status Notes ─── */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                Status Notes & Comments
              </div>

              {item.status === "blocked" && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: C.danger, fontWeight: 600, marginBottom: 4 }}>Block Reason:</div>
                  <textarea
                    defaultValue={item.blockedReason ?? ""}
                    placeholder="Describe what is blocking this item…"
                    onBlur={e => onBlockedReasonChange(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
                      border: `1px solid #fecaca`, background: C.dangerBg,
                      color: C.text, fontFamily: "inherit", resize: "vertical", outline: "none",
                    }}
                  />
                </div>
              )}

              {item.notes.length > 0 && (
                <div style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {item.notes.map((note, i) => {
                    const sepIdx = note.indexOf(" — ");
                    const ts = sepIdx > -1 ? note.slice(0, sepIdx) : null;
                    const body = sepIdx > -1 ? note.slice(sepIdx + 3) : note;
                    return (
                      <div key={i} style={{ padding: "8px 10px", borderRadius: 6, background: "#fafafa", border: `1px solid ${C.border}` }}>
                        {ts && <div style={{ fontSize: 10, color: C.light, marginBottom: 3 }}>{ts}</div>}
                        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>{body}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <textarea
                  id={`note-input-${item.id}`}
                  placeholder="Add a comment or status note…"
                  rows={2}
                  onChange={e => { commentRef.current[item.id] = e.target.value; }}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
                    border: `1px solid ${C.border}`, background: "#fff",
                    color: C.text, fontFamily: "inherit", resize: "vertical", outline: "none",
                    marginBottom: 6,
                  }}
                />
                <button
                  onClick={onAddNote}
                  style={{ padding: "6px 14px", borderRadius: 5, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  + Add Comment
                </button>
              </div>

              {item.riskIndicators.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Risk Indicators</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {item.riskIndicators.map(r => (
                      <span key={r} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 3, background: C.warningBg, color: C.warning, border: `1px solid #fde68a`, fontWeight: 500 }}>
                        {r.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section label */}
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}`, display: "flex", gap: 16, fontSize: 11, color: C.light }}>
            <span>Section: <span style={{ color: C.muted }}>{item.section}</span></span>
            {item.milestoneDate && <span>Target: <span style={{ color: C.muted }}>{item.milestoneDate}</span></span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DependencySelector ────────────────────────────────────────────────────────

function DependencySelector({
  currentDependencies,
  currentItemId,
  allItems,
  itemByItemId,
  onAdd,
}: {
  currentDependencies: string[];
  currentItemId: string;
  allItems: ChecklistItem[];
  itemByItemId: Map<string, ChecklistItem>;
  onAdd: (depItemId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [filterWs, setFilterWs] = useState<string>("all");
  const [search, setSearch] = useState("");

  const workstreams = Array.from(new Set(allItems.filter(i => i.status !== "na").map(i => i.workstream)));

  const candidates = allItems.filter(i => {
    if (i.status === "na") return false;
    if (i.itemId === currentItemId) return false;
    if (currentDependencies.includes(i.itemId)) return false;
    if (filterWs !== "all" && i.workstream !== filterWs) return false;
    if (search && !i.itemId.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).slice(0, 30);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBorder}`, borderRadius: 5, padding: "4px 10px", cursor: "pointer", fontWeight: 600, marginTop: 4 }}
      >
        + Add Dependency
      </button>
    );
  }

  return (
    <div style={{ marginTop: 6, padding: "10px", borderRadius: 8, background: "#f9fafb", border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Add Dependency</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <select
          value={filterWs}
          onChange={e => setFilterWs(e.target.value)}
          style={{ ...selectStyle, fontSize: 11, padding: "4px 8px", flex: 1 }}
        >
          <option value="all">All Workstreams</option>
          {workstreams.map(ws => <option key={ws} value={ws}>{ws.split(" ").slice(0, 2).join(" ")}</option>)}
        </select>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ flex: 1, padding: "4px 8px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, outline: "none", color: C.text }}
        />
        <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {candidates.length === 0 && <div style={{ fontSize: 11, color: C.light, padding: 8 }}>No matching items.</div>}
        {candidates.map(c => {
          const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.not_started;
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 5, background: C.card, border: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, minWidth: 65, flexShrink: 0 }}>{c.itemId}</span>
              <span style={{ flex: 1, fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.description}</span>
              <span style={{ fontSize: 9, color: sc.color, background: sc.bg, padding: "1px 5px", borderRadius: 3, flexShrink: 0 }}>{sc.label}</span>
              <button
                onClick={() => { onAdd(c.itemId); }}
                style={{ fontSize: 11, color: C.green, background: C.greenBg, border: `1px solid ${C.greenBorder}`, borderRadius: 4, padding: "1px 7px", cursor: "pointer", fontWeight: 700, flexShrink: 0 }}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 6,
  border: "1px solid #e2e8e2", background: "#fff",
  color: "#374151", fontSize: 12, outline: "none", cursor: "pointer",
};
