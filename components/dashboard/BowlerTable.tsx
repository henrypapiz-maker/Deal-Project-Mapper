"use client";
import { useState, useEffect, useCallback } from "react";
import { VIEW_PRESETS, TRACK_ORDER, WORKSTREAM_TRACK_MAP, type ViewPreset, type ViewConfig, type BowlerCell, type ReportingPeriod } from "@/lib/bowler";

const C = {
  navy: "#0F1B2D", deepBlue: "#1B2A4A", accent: "#3B82F6", accentLight: "#60A5FA",
  success: "#10B981", warning: "#F59E0B", danger: "#EF4444", muted: "#64748B",
  cardBg: "#1E293B", border: "#334155", text: "#F1F5F9", textMuted: "#94A3B8",
};

const RAG_COLORS = { red: "#EF4444", amber: "#F59E0B", green: "#10B981" };

interface BowlerTableProps {
  dealId: string;
  closeDate: string;
  onCellClick?: (cell: BowlerCell) => void;
}

export default function BowlerTable({ dealId, closeDate, onCellClick }: BowlerTableProps) {
  const [periods, setPeriods] = useState<any[]>([]);
  const [cells, setCells] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewPreset>("imo_dashboard");
  const [viewConfig, setViewConfig] = useState<ViewConfig>(VIEW_PRESETS.imo_dashboard);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(TRACK_ORDER.map(t => `track:${t}`)));
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [narrativeInput, setNarrativeInput] = useState("");
  const [risksInput, setRisksInput] = useState("");
  const [nextStepsInput, setNextStepsInput] = useState("");
  const [snapshotting, setSnapshotting] = useState(false);

  const initBowler = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, closeDate }),
      });
      const pRes = await fetch(`/api/periods?dealId=${dealId}`);
      const pData = await pRes.json();
      const allPeriods = pData.periods || [];
      setPeriods(allPeriods.slice(-viewConfig.visiblePeriods));

      const allCells: any[] = [];
      for (const level of ["program", "track", "workstream"]) {
        const cRes = await fetch(`/api/bowler?dealId=${dealId}&level=${level}&periods=${viewConfig.visiblePeriods}`);
        const cData = await cRes.json();
        if (cData.cells) allCells.push(...cData.cells);
      }
      setCells(allCells);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dealId, closeDate, viewConfig.visiblePeriods]);

  useEffect(() => { initBowler(); }, [initBowler]);

  const takeSnapshot = async (periodId: string) => {
    setSnapshotting(true);
    try {
      await fetch("/api/bowler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dealId, periodId }) });
      await initBowler();
    } catch (e: any) { setError(e.message); }
    finally { setSnapshotting(false); }
  };

  const updateCell = async (cellId: string, updates: Record<string, any>) => {
    try {
      await fetch("/api/bowler", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cellId, ...updates }) });
      await initBowler();
    } catch (e: any) { setError(e.message); }
  };

  const switchView = (preset: ViewPreset) => {
    setActiveView(preset);
    setViewConfig(VIEW_PRESETS[preset]);
    if (preset === "imo_dashboard" || preset === "steerco_report") {
      setExpandedRows(new Set(TRACK_ORDER.map(t => `track:${t}`)));
    } else { setExpandedRows(new Set()); }
  };

  const toggleExpand = (key: string) => {
    setExpandedRows(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };

  const getCell = (level: string, rowKey: string | null, periodId: string) =>
    cells.find((c: any) => c.level === level && (c.row_key || null) === rowKey && c.period_id === periodId);

  const renderRagDot = (cell: any, size: number = 14) => {
    if (!cell) return <div style={{ width: size, height: size, borderRadius: "50%", background: C.border, margin: "0 auto" }} />;
    const rag = cell.override_rag || cell.computed_rag || "green";
    return (
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: RAG_COLORS[rag as keyof typeof RAG_COLORS],
        margin: "0 auto", border: cell.override_rag ? "2px solid white" : "none",
        cursor: "pointer", boxShadow: `0 0 ${size / 2}px ${RAG_COLORS[rag as keyof typeof RAG_COLORS]}40`,
      }} title={`${rag.toUpperCase()}${cell.override_rag ? " (overridden)" : ""}`}
        onClick={() => { if (cell && onCellClick) onCellClick(cell); }} />
    );
  };

  const renderMetrics = (cell: any) => {
    if (!cell || !viewConfig.showMetrics) return null;
    const m = typeof cell.metrics === "string" ? JSON.parse(cell.metrics) : (cell.metrics || {});
    return m.pctComplete !== undefined ? <div style={{ fontSize: 9, color: C.textMuted, textAlign: "center", marginTop: 2 }}>{m.pctComplete}%</div> : null;
  };

  const buildRows = () => {
    const rows: { level: string; rowKey: string | null; label: string; indent: number; expandable: boolean }[] = [];
    if (viewConfig.defaultLevel === "program" || viewConfig.defaultLevel === "track") {
      rows.push({ level: "program", rowKey: null, label: "Overall Program", indent: 0, expandable: true });
      if (expandedRows.has("program") || viewConfig.defaultLevel === "track") {
        for (const track of TRACK_ORDER) {
          rows.push({ level: "track", rowKey: track, label: track, indent: 1, expandable: true });
          if (expandedRows.has(`track:${track}`)) {
            Object.entries(WORKSTREAM_TRACK_MAP).filter(([, t]) => t === track).forEach(([ws]) => {
              rows.push({ level: "workstream", rowKey: ws, label: ws.replace("IT > ", ""), indent: 2, expandable: false });
            });
          }
        }
      }
    } else {
      for (const track of TRACK_ORDER) {
        rows.push({ level: "track", rowKey: track, label: track, indent: 0, expandable: true });
        if (expandedRows.has(`track:${track}`) || viewConfig.expandedTracks.includes(track)) {
          Object.entries(WORKSTREAM_TRACK_MAP).filter(([, t]) => t === track).forEach(([ws]) => {
            rows.push({ level: "workstream", rowKey: ws, label: ws.replace("IT > ", ""), indent: 1, expandable: false });
          });
        }
      }
    }
    return rows;
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Loading bowler table...</div>;
  if (error) return <div style={{ padding: 20, color: C.danger, fontSize: 12 }}>Error: {error}</div>;

  const hasCells = cells.length > 0;
  const currentPeriod = periods.find((p: any) => p.is_current);
  const rows = buildRows();
  const VIEW_LABELS: Record<string, string> = { executive: "Executive", imo_dashboard: "IMO Dashboard", workstream_detail: "Workstream Detail", steerco_report: "SteerCo Report" };

  return (
    <div style={{ background: C.cardBg, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}`, background: "rgba(15, 27, 45, 0.5)" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {(["executive", "imo_dashboard", "workstream_detail", "steerco_report"] as ViewPreset[]).map(preset => (
            <button key={preset} onClick={() => switchView(preset)} style={{
              padding: "5px 12px", borderRadius: 5, border: "none", cursor: "pointer",
              background: activeView === preset ? C.accent : "rgba(51, 65, 85, 0.5)",
              color: activeView === preset ? "#fff" : C.textMuted, fontSize: 10, fontWeight: 600,
            }}>{VIEW_LABELS[preset]}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {currentPeriod && (
            <button onClick={() => takeSnapshot(currentPeriod.id)} disabled={snapshotting} style={{
              padding: "5px 14px", borderRadius: 5, border: hasCells ? `1px solid ${C.border}` : "none", cursor: "pointer",
              background: hasCells ? "transparent" : C.success, color: hasCells ? C.textMuted : "#fff",
              fontSize: 10, fontWeight: 600, opacity: snapshotting ? 0.6 : 1,
            }}>{snapshotting ? "Snapshotting..." : hasCells ? "Refresh Snapshot" : "Capture Snapshot"}</button>
          )}
          {hasCells && (
            <button onClick={() => {
              const headers = ["Level", "Row", ...periods.map((p: any) => p.period_label)];
              const csvRows = rows.map(row => {
                const cols = periods.map((p: any) => {
                  const cell = getCell(row.level, row.rowKey, p.id);
                  if (!cell) return "";
                  const rag = cell.override_rag || cell.computed_rag || "";
                  const m = typeof cell.metrics === "string" ? JSON.parse(cell.metrics) : (cell.metrics || {});
                  return `${rag.toUpperCase()}${m.pctComplete !== undefined ? ` (${m.pctComplete}%)` : ""}`;
                });
                return [row.level, row.label, ...cols];
              });
              const csv = [headers.join(","), ...csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = `bowler_export_${new Date().toISOString().split("T")[0]}.csv`; a.click(); URL.revokeObjectURL(url);
            }} style={{
              padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.border}`, cursor: "pointer",
              background: "transparent", color: C.textMuted, fontSize: 10, fontWeight: 500,
            }}>Export CSV</button>
          )}
          <span style={{ fontSize: 10, color: C.textMuted }}>{periods.length} periods · {cells.length} cells</span>
        </div>
      </div>

      {/* Grid */}
      {!hasCells ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>No snapshot data yet</div>
          <div style={{ fontSize: 11 }}>Click &ldquo;Capture Snapshot&rdquo; to capture current item statuses into the bowler table.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th style={{ textAlign: "left", padding: "8px 12px", position: "sticky", left: 0, background: C.cardBg, zIndex: 2, minWidth: 220, fontWeight: 600, color: C.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Workstream</th>
                {periods.map((p: any) => (
                  <th key={p.id} style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600, color: p.is_current ? C.accent : C.textMuted, fontSize: 9, minWidth: 65, borderLeft: `1px solid ${C.border}`, background: p.is_current ? "rgba(59, 130, 246, 0.08)" : "transparent" }}>
                    {p.period_label}
                    <div style={{ fontSize: 8, fontWeight: 400, marginTop: 2 }}>{new Date(p.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isTrack = row.level === "track";
                const isProgram = row.level === "program";
                const expandKey = isProgram ? "program" : isTrack ? `track:${row.rowKey}` : null;
                const isExpanded = expandKey ? expandedRows.has(expandKey) : false;
                return (
                  <tr key={`${row.level}-${row.rowKey}-${idx}`} style={{ borderBottom: `1px solid ${C.border}`, background: isTrack ? "rgba(30, 41, 59, 0.7)" : isProgram ? "rgba(59, 130, 246, 0.05)" : "transparent" }}>
                    <td style={{ padding: `6px 12px 6px ${12 + row.indent * 20}px`, position: "sticky", left: 0, background: "inherit", zIndex: 1, fontWeight: isTrack || isProgram ? 700 : 400, color: isTrack || isProgram ? C.text : C.textMuted, cursor: row.expandable ? "pointer" : "default", fontSize: isProgram ? 12 : isTrack ? 11 : 10 }}
                      onClick={() => { if (expandKey) toggleExpand(expandKey); }}>
                      {row.expandable && <span style={{ marginRight: 6, fontSize: 8 }}>{isExpanded ? "▼" : "▶"}</span>}
                      {row.label}
                    </td>
                    {periods.map((p: any) => {
                      const cell = getCell(row.level, row.rowKey, p.id);
                      return (
                        <td key={p.id} style={{ textAlign: "center", padding: "6px 4px", borderLeft: `1px solid ${C.border}`, background: p.is_current ? "rgba(59, 130, 246, 0.05)" : "transparent", cursor: cell ? "pointer" : "default" }}
                          onClick={() => { if (cell) { setEditingCell(editingCell === cell.id ? null : cell.id); setNarrativeInput(cell.narrative || ""); setRisksInput(cell.key_risks || ""); setNextStepsInput(cell.next_steps || ""); } }}>
                          {renderRagDot(cell, isProgram ? 18 : isTrack ? 16 : 12)}
                          {renderMetrics(cell)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cell detail panel */}
      {editingCell && (() => {
        const cell = cells.find((c: any) => c.id === editingCell);
        if (!cell) return null;
        const m = typeof cell.metrics === "string" ? JSON.parse(cell.metrics) : (cell.metrics || {});
        const period = periods.find((p: any) => p.id === cell.period_id);
        const rag = cell.override_rag || cell.computed_rag || "green";
        return (
          <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: "rgba(15, 27, 45, 0.7)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{cell.row_key || "Program"} — {period?.period_label}</span>
                <span style={{ marginLeft: 8, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: RAG_COLORS[rag as keyof typeof RAG_COLORS] + "20", color: RAG_COLORS[rag as keyof typeof RAG_COLORS] }}>{rag.toUpperCase()}</span>
              </div>
              <button onClick={() => setEditingCell(null)} style={{ background: "transparent", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            {m.pctComplete !== undefined && (
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                {m.total != null && <span style={{ fontSize: 10, color: C.textMuted }}>Total: <b style={{ color: C.text }}>{m.total}</b></span>}
                {m.completed != null && <span style={{ fontSize: 10, color: C.success }}>Done: <b>{m.completed}</b></span>}
                {m.blocked > 0 && <span style={{ fontSize: 10, color: C.danger }}>Blocked: <b>{m.blocked}</b></span>}
                {m.pastDue > 0 && <span style={{ fontSize: 10, color: C.warning }}>Past Due: <b>{m.pastDue}</b></span>}
                <span style={{ fontSize: 10, color: C.accent }}>{m.pctComplete}% complete</span>
              </div>
            )}
            {/* RAG Override */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>RAG Override:</span>
              {(["red", "amber", "green"] as const).map(r => (
                <button key={r} onClick={() => updateCell(cell.id, { overrideRag: cell.override_rag === r ? null : r })} style={{
                  width: 20, height: 20, borderRadius: "50%", border: cell.override_rag === r ? "2px solid white" : `1px solid ${C.border}`,
                  background: RAG_COLORS[r], cursor: "pointer", opacity: cell.override_rag === r ? 1 : 0.4,
                }} title={`Set ${r}`} />
              ))}
              {cell.override_rag && <button onClick={() => updateCell(cell.id, { overrideRag: null })} style={{ fontSize: 9, color: C.textMuted, background: "transparent", border: "none", cursor: "pointer" }}>Clear</button>}
            </div>
            {/* Narrative fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}>
              <div>
                <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Narrative</label>
                <textarea value={narrativeInput} onChange={e => setNarrativeInput(e.target.value)} placeholder="Status narrative..."
                  style={{ width: "100%", minHeight: 60, padding: 8, borderRadius: 6, background: C.navy, border: `1px solid ${C.border}`, color: C.text, fontSize: 11, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Key Risks</label>
                <textarea value={risksInput} onChange={e => setRisksInput(e.target.value)} placeholder="Key risks..."
                  style={{ width: "100%", minHeight: 60, padding: 8, borderRadius: 6, background: C.navy, border: `1px solid ${C.border}`, color: C.text, fontSize: 11, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, display: "block", marginBottom: 4 }}>Next Steps</label>
                <textarea value={nextStepsInput} onChange={e => setNextStepsInput(e.target.value)} placeholder="Next steps..."
                  style={{ width: "100%", minHeight: 60, padding: 8, borderRadius: 6, background: C.navy, border: `1px solid ${C.border}`, color: C.text, fontSize: 11, resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <button onClick={() => updateCell(cell.id, { narrative: narrativeInput, keyRisks: risksInput, nextSteps: nextStepsInput })} style={{
              padding: "5px 16px", borderRadius: 5, border: "none", background: C.accent, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>Save All</button>
          </div>
        );
      })()}
    </div>
  );
}
