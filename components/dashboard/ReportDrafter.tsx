"use client";

import React, { useState, useRef, useEffect } from "react";
import type { GeneratedDeal } from "@/lib/types";
import {
  assembleReportContext,
  formatContextForPrompt,
  SECTION_LABELS,
  type ProspectiveInsight,
  type PressureTestResult,
  type SectionKey,
} from "@/lib/report-engine";
import { computeProspectiveGuidance } from "@/lib/report-engine";

const C = {
  navy: "#0F1B2D",
  accent: "#3B82F6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
};

// ── Types ─────────────────────────────────────────────────────

interface ReportDrafterProps {
  deal: GeneratedDeal;
  scNarrative: Record<string, string>;
  onUpdateNarrative: (key: string, value: string) => void;
  onUpdateAllNarratives: (narratives: Record<string, string>) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type WorkflowStage = "input_complete" | "imo_review" | "ai_compilation";

type ActionLoading = "draft_all" | "exec_summary" | "pressure_test" | "chat" | null;

interface DraftAllResult {
  narratives: Record<string, string>;
}

interface ExecSummaryResult {
  summary: string;
}

// ── Helper sub-components ──────────────────────────────────────

function Dot({ active, done }: { active: boolean; done: boolean }) {
  const bg = done ? C.success : active ? C.accent : C.border;
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: bg,
        border: `2px solid ${active ? C.accent : done ? C.success : C.border}`,
        flexShrink: 0,
      }}
    />
  );
}

function StageConnector() {
  return (
    <div
      style={{
        flex: 1,
        height: 2,
        background: C.border,
        margin: "0 6px",
        alignSelf: "center",
      }}
    />
  );
}

function SeverityIcon({ severity }: { severity: ProspectiveInsight["severity"] }) {
  const color =
    severity === "critical" ? C.danger : severity === "warning" ? C.warning : C.accent;
  const symbol = severity === "critical" ? "⛔" : severity === "warning" ? "⚠️" : "ℹ️";
  return <span style={{ color, fontSize: 14, marginRight: 6 }}>{symbol}</span>;
}

function RagDot({ rag }: { rag: "red" | "amber" | "green" }) {
  const color = rag === "red" ? C.danger : rag === "amber" ? C.warning : C.success;
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        marginRight: 4,
        flexShrink: 0,
      }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function ReportDrafter({
  deal,
  scNarrative,
  onUpdateNarrative,
  onUpdateAllNarratives,
}: ReportDrafterProps) {
  // Workflow stage
  const [stage, setStage] = useState<WorkflowStage>("input_complete");

  // Loading state
  const [actionLoading, setActionLoading] = useState<ActionLoading>(null);

  // Results state
  const [draftAllResult, setDraftAllResult] = useState<DraftAllResult | null>(null);
  const [execSummaryResult, setExecSummaryResult] = useState<ExecSummaryResult | null>(null);
  const [pressureTestResult, setPressureTestResult] = useState<PressureTestResult | null>(null);

  // Prospective guidance
  const [guidanceExpanded, setGuidanceExpanded] = useState(false);
  const prospectiveInsights: ProspectiveInsight[] = computeProspectiveGuidance(deal);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [applySection, setApplySection] = useState<Record<string, SectionKey | "">>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Derived context stats
  const ctx = assembleReportContext(deal, scNarrative);
  const activeCount = ctx.snapshotStats.totalActive;
  const blockedCount = ctx.snapshotStats.blocked;
  const riskCount = ctx.riskRegister.length;
  const workstreamCount = ctx.workstreamBreakdown.length;
  const integrationHealth = ctx.snapshotStats.pctComplete;

  const healthColor =
    integrationHealth > 70 ? C.success : integrationHealth >= 40 ? C.warning : C.danger;

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── API helpers ────────────────────────────────────────────

  async function callGuidanceAPI(mode: string, extra?: Record<string, unknown>) {
    const contextText = formatContextForPrompt(ctx);
    const response = await fetch("/api/ai-guidance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        context: contextText,
        narratives: scNarrative,
        dealId: deal.id,
        ...extra,
      }),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  async function handleDraftAll() {
    setActionLoading("draft_all");
    setStage("ai_compilation");
    try {
      const data = await callGuidanceAPI("draft_all");
      setDraftAllResult({ narratives: data.narratives ?? {} });
      setStage("imo_review");
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleExecSummary() {
    setActionLoading("exec_summary");
    try {
      const data = await callGuidanceAPI("executive_summary");
      setExecSummaryResult({ summary: data.summary ?? "" });
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePressureTest() {
    setActionLoading("pressure_test");
    try {
      const data = await callGuidanceAPI("pressure_test");
      setPressureTestResult(data.result ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSendChat() {
    const text = chatInput.trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setActionLoading("chat");
    try {
      const data = await callGuidanceAPI("chat", {
        message: text,
        history: chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      });
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply ?? "(no response)",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  }

  function handleApplyMessage(msgId: string, content: string) {
    const key = applySection[msgId];
    if (!key) return;
    onUpdateNarrative(key, content);
  }

  // ── Render ─────────────────────────────────────────────────

  const STAGES: { key: WorkflowStage; label: string }[] = [
    { key: "input_complete", label: "Input Complete" },
    { key: "imo_review", label: "IMO Review" },
    { key: "ai_compilation", label: "AI Compilation" },
  ];
  const stageIndex = STAGES.findIndex((s) => s.key === stage);

  const sectionKeys = Object.keys(SECTION_LABELS) as SectionKey[];

  return (
    <div
      style={{
        background: C.cardBg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        color: C.text,
        fontFamily: "inherit",
      }}
    >
      {/* ── 1. Context Status Bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          background: C.navy,
          borderRadius: 6,
          padding: "8px 12px",
          fontSize: 11,
        }}
      >
        <span style={{ color: C.textMuted, fontWeight: 600 }}>Context:</span>
        <span style={{ color: C.text }}>
          <b>{activeCount}</b> active items,&nbsp;
          <b style={{ color: C.danger }}>{blockedCount}</b> blocked,&nbsp;
          <b style={{ color: C.warning }}>{riskCount}</b> risks,&nbsp;
          <b>{workstreamCount}</b> workstreams
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: C.textMuted, fontSize: 10 }}>Integration Health:</span>
          <span
            style={{
              background: healthColor + "22",
              color: healthColor,
              border: `1px solid ${healthColor}`,
              borderRadius: 4,
              padding: "1px 7px",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {integrationHealth}/100
          </span>
          <button
            onClick={() => {
              /* context is derived live; no-op triggers re-render */
            }}
            style={{
              background: C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 10,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── 2. Workflow Stage Indicator ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 0",
        }}
      >
        {STAGES.map((s, i) => {
          const isActive = i === stageIndex;
          const isDone = i < stageIndex;
          return (
            <React.Fragment key={s.key}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 80 }}>
                <Dot active={isActive} done={isDone} />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? C.accent : isDone ? C.success : C.textMuted,
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && <StageConnector />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── 3. Action Buttons Row ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Draft All Sections */}
        <button
          onClick={handleDraftAll}
          disabled={actionLoading !== null}
          style={{
            background: actionLoading === "draft_all" ? C.accent + "88" : C.accent,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: actionLoading !== null ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: actionLoading !== null && actionLoading !== "draft_all" ? 0.5 : 1,
          }}
        >
          {actionLoading === "draft_all" ? (
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
          ) : (
            "🤖"
          )}
          {actionLoading === "draft_all" ? "Drafting…" : "Draft All Sections"}
        </button>

        {/* Executive Summary */}
        <button
          onClick={handleExecSummary}
          disabled={actionLoading !== null}
          style={{
            background: "transparent",
            color: C.accent,
            border: `1px solid ${C.accent}`,
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: actionLoading !== null ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: actionLoading !== null && actionLoading !== "exec_summary" ? 0.5 : 1,
          }}
        >
          {actionLoading === "exec_summary" ? "⏳" : "📝"}
          {actionLoading === "exec_summary" ? "Summarizing…" : "Executive Summary"}
        </button>

        {/* Pressure Test */}
        <button
          onClick={handlePressureTest}
          disabled={actionLoading !== null}
          style={{
            background: "transparent",
            color: C.warning,
            border: `1px solid ${C.warning}`,
            borderRadius: 6,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: actionLoading !== null ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            opacity: actionLoading !== null && actionLoading !== "pressure_test" ? 0.5 : 1,
          }}
        >
          {actionLoading === "pressure_test" ? "⏳" : "🔍"}
          {actionLoading === "pressure_test" ? "Testing…" : "Pressure Test"}
        </button>
      </div>

      {/* ── 4. Results Area ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Draft All result */}
        {draftAllResult && (
          <div
            style={{
              background: C.success + "15",
              border: `1px solid ${C.success}`,
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span>✅</span>
              <span style={{ fontWeight: 700, color: C.success }}>
                All {Object.keys(draftAllResult.narratives).length} sections drafted
              </span>
              <button
                onClick={() => onUpdateAllNarratives(draftAllResult.narratives)}
                style={{
                  marginLeft: "auto",
                  background: C.success,
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Apply All
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 4,
                fontSize: 10,
                color: C.textMuted,
              }}
            >
              {Object.keys(draftAllResult.narratives).map((k) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: C.success }}>✓</span>
                  <span>{SECTION_LABELS[k as SectionKey] ?? k}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Summary result */}
        {execSummaryResult && (
          <div
            style={{
              background: C.accent + "10",
              border: `1px solid ${C.accent}`,
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, color: C.accent, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Executive Summary
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <button
                  onClick={() => navigator.clipboard.writeText(execSummaryResult.summary)}
                  style={{
                    background: "transparent",
                    color: C.accent,
                    border: `1px solid ${C.accent}`,
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={() => onUpdateNarrative("overallStatus", execSummaryResult.summary)}
                  style={{
                    background: C.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 4,
                    padding: "2px 8px",
                    fontSize: 10,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Insert into Overall Status
                </button>
              </div>
            </div>
            <div
              style={{
                background: C.navy,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 11,
                color: C.text,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {execSummaryResult.summary}
            </div>
          </div>
        )}

        {/* Pressure Test result */}
        {pressureTestResult && (
          <div
            style={{
              background: C.warning + "10",
              border: `1px solid ${C.warning}`,
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 700, color: C.warning, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Pressure Test Results
            </div>

            {/* Completeness Score */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: C.textMuted, fontSize: 10 }}>Completeness Score:</span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 20,
                  color:
                    pressureTestResult.completenessScore >= 75
                      ? C.success
                      : pressureTestResult.completenessScore >= 50
                      ? C.warning
                      : C.danger,
                }}
              >
                {pressureTestResult.completenessScore}
              </span>
              <span style={{ color: C.textMuted, fontSize: 10 }}>/100</span>
            </div>

            {/* Consistency Issues */}
            {pressureTestResult.consistencyIssues.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Consistency Issues
                </div>
                {pressureTestResult.consistencyIssues.map((issue, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 6,
                      fontSize: 11,
                      color: C.text,
                      marginBottom: 3,
                      paddingLeft: 8,
                      borderLeft: `2px solid ${C.danger}`,
                    }}
                  >
                    <span style={{ color: C.textMuted, flexShrink: 0 }}>{issue.section}:</span>
                    <span>{issue.issue}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Coverage Map */}
            {pressureTestResult.coverageMap.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                  Workstream Coverage
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 3,
                    fontSize: 10,
                  }}
                >
                  {pressureTestResult.coverageMap.map((item) => (
                    <div
                      key={item.workstream}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        color: item.mentioned ? C.success : C.danger,
                        padding: "2px 4px",
                        background: item.mentioned ? C.success + "15" : C.danger + "15",
                        borderRadius: 3,
                      }}
                    >
                      <span>{item.mentioned ? "✓" : "✗"}</span>
                      <span style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.workstream}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {pressureTestResult.recommendations.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Recommendations
                </div>
                {pressureTestResult.recommendations.map((rec, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.text, marginBottom: 3, paddingLeft: 10, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: C.accent }}>•</span>
                    {rec}
                  </div>
                ))}
              </div>
            )}

            {/* Missing Items */}
            {pressureTestResult.missingCriticalItems.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Missing Critical Items
                </div>
                {pressureTestResult.missingCriticalItems.map((item) => (
                  <div
                    key={item.itemId}
                    style={{
                      fontSize: 10,
                      color: C.text,
                      marginBottom: 3,
                      padding: "3px 6px",
                      background: C.danger + "10",
                      borderRadius: 3,
                      display: "flex",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: C.textMuted, flexShrink: 0 }}>{item.itemId}</span>
                    <span>{item.description}</span>
                    <span style={{ color: C.danger, flexShrink: 0, marginLeft: "auto" }}>— {item.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Prospective Guidance ── */}
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setGuidanceExpanded((p) => !p)}
          style={{
            width: "100%",
            background: C.navy,
            border: "none",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            color: C.text,
            fontSize: 11,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          <span style={{ transform: guidanceExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
          Prospective Guidance
          {prospectiveInsights.length > 0 && (
            <span
              style={{
                marginLeft: 6,
                background: prospectiveInsights.some((i) => i.severity === "critical") ? C.danger : C.warning,
                color: "#fff",
                borderRadius: 10,
                padding: "0px 6px",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {prospectiveInsights.length}
            </span>
          )}
        </button>
        {guidanceExpanded && (
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            {prospectiveInsights.length === 0 ? (
              <span style={{ fontSize: 11, color: C.textMuted }}>No prospective insights available yet — add more snapshots for trend analysis.</span>
            ) : (
              prospectiveInsights.map((insight, i) => (
                <div
                  key={i}
                  style={{
                    background: C.navy,
                    borderRadius: 6,
                    padding: "8px 10px",
                    borderLeft: `3px solid ${
                      insight.severity === "critical"
                        ? C.danger
                        : insight.severity === "warning"
                        ? C.warning
                        : C.accent
                    }`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                    <SeverityIcon severity={insight.severity} />
                    <span style={{ fontWeight: 700, fontSize: 11, color: C.text }}>{insight.title}</span>
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 9,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: C.textMuted,
                        letterSpacing: 0.5,
                      }}
                    >
                      {insight.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>{insight.detail}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── 6. Chat Interface ── */}
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background: C.navy,
            padding: "6px 12px",
            fontSize: 10,
            fontWeight: 700,
            color: C.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          AI Chat Assistant
        </div>

        {/* Message Area */}
        <div
          style={{
            minHeight: 120,
            maxHeight: 300,
            overflowY: "auto",
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {chatMessages.length === 0 && (
            <span style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic" }}>
              Ask about any section, request a draft, or get specific guidance…
            </span>
          )}
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}
            >
              <div
                style={{
                  background: msg.role === "user" ? C.accent : C.navy,
                  color: C.text,
                  borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                  padding: "7px 10px",
                  fontSize: 11,
                  lineHeight: 1.5,
                  border: msg.role === "assistant" ? `1px solid ${C.border}` : "none",
                }}
              >
                {msg.content}
              </div>
              {/* Apply action for assistant messages */}
              {msg.role === "assistant" && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                    paddingLeft: 4,
                  }}
                >
                  <span style={{ fontSize: 9, color: C.textMuted }}>Apply to:</span>
                  <select
                    value={applySection[msg.id] ?? ""}
                    onChange={(e) =>
                      setApplySection((prev) => ({ ...prev, [msg.id]: e.target.value as SectionKey | "" }))
                    }
                    style={{
                      background: C.cardBg,
                      color: C.text,
                      border: `1px solid ${C.border}`,
                      borderRadius: 4,
                      fontSize: 9,
                      padding: "1px 4px",
                    }}
                  >
                    <option value="">— select section —</option>
                    {sectionKeys.map((k) => (
                      <option key={k} value={k}>
                        {SECTION_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleApplyMessage(msg.id, msg.content)}
                    disabled={!applySection[msg.id]}
                    style={{
                      background: applySection[msg.id] ? C.success : C.border,
                      color: applySection[msg.id] ? "#fff" : C.textMuted,
                      border: "none",
                      borderRadius: 4,
                      padding: "1px 7px",
                      fontSize: 9,
                      cursor: applySection[msg.id] ? "pointer" : "not-allowed",
                      fontWeight: 600,
                    }}
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input Row */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: "8px 10px",
            display: "flex",
            gap: 8,
            background: C.navy,
          }}
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            placeholder="Ask about any section or request specific guidance…"
            disabled={actionLoading === "chat"}
            style={{
              flex: 1,
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: C.text,
              outline: "none",
            }}
          />
          <button
            onClick={handleSendChat}
            disabled={actionLoading === "chat" || !chatInput.trim()}
            style={{
              background: actionLoading === "chat" || !chatInput.trim() ? C.border : C.accent,
              color: actionLoading === "chat" || !chatInput.trim() ? C.textMuted : "#fff",
              border: "none",
              borderRadius: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: actionLoading === "chat" || !chatInput.trim() ? "not-allowed" : "pointer",
            }}
          >
            {actionLoading === "chat" ? "⏳" : "Send"}
          </button>
        </div>
      </div>

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
