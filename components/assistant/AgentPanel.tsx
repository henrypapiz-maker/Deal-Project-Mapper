"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAgentContext } from "@/lib/agent-context";
import { assembleReportContext, formatContextForPrompt } from "@/lib/report-engine";
import type { AssistantMessage, AppAction, AppContext } from "@/lib/agent-types";

interface LibraryPrompt { id: string; name: string; text: string; category: string | null; }

const C = {
  navy: "#0F1B2D",
  deepBlue: "#1B2A4A",
  accent: "#3B82F6",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
};

const SUGGESTED_PROMPTS = [
  "Show me all blocked items",
  "What is our completion rate by workstream?",
  "Draft the SteerCo report",
  "Generate a progress snapshot",
];

function ActionChip({ action }: { action: AppAction }) {
  const label = (() => {
    switch (action.type) {
      case "navigate_tab":
        return `Navigated → ${action.tab.replace("_", " ")}`;
      case "filter_checklist": {
        const parts: string[] = [];
        if (action.workstream && action.workstream !== "all") parts.push(action.workstream);
        if (action.status && action.status !== "all") parts.push(action.status);
        if (action.priority && action.priority !== "all") parts.push(action.priority);
        if (action.phase && action.phase !== "all") parts.push(action.phase);
        if (action.owner && action.owner !== "all") parts.push(`owner:${action.owner}`);
        if (action.searchText) parts.push(`"${action.searchText}"`);
        return `Filtered: ${parts.length > 0 ? parts.join(" / ") : "reset"}`;
      }
      case "update_item_status":
        return `Updated status → ${action.status}`;
      case "assign_owner":
        return action.ownerId ? `Assigned owner` : `Unassigned owner`;
      case "bulk_assign_owner":
        return `Bulk assigned ${action.itemIds.length} items`;
      case "draft_report":
        return "Opened Report Drafter";
      case "generate_snapshot":
        return "Generated snapshot";
      case "save_document":
        return `Saved: ${action.title}`;
      case "run_skill":
        return `Ran skill: ${action.skillName}`;
      default:
        return "Action executed";
    }
  })();

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        background: "#0F2A4A",
        border: `1px solid ${C.accent}44`,
        color: C.accent,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.2,
      }}
    >
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="#3B82F6" strokeWidth="1.5" />
        <path d="M4 6l1.5 1.5L8 4" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "10px 14px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: C.textMuted,
            animation: `agentPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function AgentPanel() {
  const {
    panelOpen, setPanelOpen, dispatch, isRegistered, incrementUnread, clearUnread,
    getCallbacks, pendingPrompt, setPendingPrompt,
  } = useAgentContext();

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryPrompts, setLibraryPrompts] = useState<LibraryPrompt[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const libraryRef = useRef<HTMLDivElement>(null);

  // Consume pendingPrompt injected from Prompt Library "Use" button
  useEffect(() => {
    if (pendingPrompt !== null) {
      setInput(pendingPrompt);
      setPendingPrompt(null);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [pendingPrompt, setPendingPrompt]);

  useEffect(() => {
    if (panelOpen) {
      clearUnread();
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [panelOpen, clearUnread]);

  // Close library dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (libraryRef.current && !libraryRef.current.contains(e.target as Node)) {
        setLibraryOpen(false);
      }
    }
    if (libraryOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [libraryOpen]);

  async function openLibrary() {
    if (!libraryLoaded) {
      try {
        const cbs = getCallbacks();
        const deal = cbs?.getDeal();
        const url = deal ? `/api/agent/prompts?dealId=${deal.id}` : "/api/agent/prompts";
        const res = await fetch(url);
        const d = await res.json();
        setLibraryPrompts(
          (d.prompts ?? []).map((p: any) => ({
            id: p.id, name: p.name, text: p.text, category: p.category,
          }))
        );
        setLibraryLoaded(true);
      } catch {
        // silently fail — library stays empty
      }
    }
    setLibraryOpen((v) => !v);
  }

  function injectPrompt(text: string) {
    setInput(text);
    setLibraryOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildAppContext = useCallback((): AppContext => {
    const cbs = getCallbacks();
    const emptyKpis = { total: 0, complete: 0, inProgress: 0, blocked: 0, pctComplete: 0 };

    if (!cbs) {
      return {
        activeTab: "landing",
        dealSummary: "",
        filters: { workstream: "all", status: "all", priority: "all", phase: "all", owner: "all" },
        kpis: emptyKpis,
        people: [],
        checklistSummary: [],
      };
    }

    const deal = cbs.getDeal();
    const filterState = cbs.getFilterState();

    if (!deal) {
      return {
        activeTab: cbs.getActiveTab(),
        dealSummary: "",
        filters: filterState,
        kpis: emptyKpis,
        people: [],
        checklistSummary: [],
      };
    }

    // Build compact deal summary
    let dealSummary = "";
    try {
      const ctx = assembleReportContext(deal, {});
      dealSummary = formatContextForPrompt(ctx).slice(0, 2000);
    } catch {
      dealSummary = `Deal: ${deal.intake.dealName} | ${deal.checklistItems.length} items`;
    }

    // KPIs
    const active = deal.checklistItems.filter((i) => i.status !== "na");
    const complete = active.filter((i) => i.status === "complete").length;
    const inProgress = active.filter((i) => i.status === "in_progress").length;
    const blocked = active.filter((i) => i.status === "blocked").length;
    const kpis = {
      total: active.length,
      complete,
      inProgress,
      blocked,
      pctComplete: active.length > 0 ? Math.round((complete / active.length) * 100) : 0,
    };

    // Checklist summary — current visible items, max 50, descriptions truncated
    const checklistSummary = active.slice(0, 50).map((i) => ({
      id: i.id,
      itemId: i.itemId,
      workstream: i.workstream,
      status: i.status,
      description: i.description.slice(0, 80),
    }));

    return {
      activeTab: cbs.getActiveTab(),
      dealId: deal.id,
      dealName: deal.intake.dealName,
      userRole: (cbs.getUserRole?.() as AppContext["userRole"]) ?? undefined,
      dealSummary,
      filters: filterState,
      kpis,
      people: deal.people.map((p) => ({ id: p.id, name: p.name, role: p.role })),
      checklistSummary,
    };
  }, [getCallbacks]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setError(null);

    const userMsg: AssistantMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const appContext = buildAppContext();

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history, appContext }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: AssistantMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || "Done.",
        actions: data.actions ?? [],
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Execute actions
      if (data.actions?.length > 0) {
        dispatch(data.actions);
      }

      // Notify if panel is closed
      if (!panelOpen) incrementUnread();
    } catch (err) {
      setError("Failed to reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const filters = getCallbacks()?.getFilterState();
  const activeFilterCount = filters
    ? Object.values(filters).filter((v) => v && v !== "all").length
    : 0;

  if (!panelOpen) return null;

  return (
    <>
      {/* Keyframe injection */}
      <style>{`
        @keyframes agentPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes agentSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 420,
          height: "100vh",
          background: C.navy,
          borderLeft: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 9998,
          animation: "agentSlideIn 0.22s ease-out",
          fontFamily: "var(--font-inter, system-ui, sans-serif)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: C.deepBlue,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l.3 3-3.5-1.5A7 7 0 1 1 12 2z" />
                <path d="M9 9h.01M12 9h.01M15 9h.01" strokeWidth="2.5" />
              </svg>
            </div>
            <div>
              <div style={{ color: C.text, fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
                DealMapper Assistant
              </div>
              <div style={{ color: isRegistered ? C.success : C.textMuted, fontSize: 10, fontWeight: 500 }}>
                {isRegistered ? "● Connected to deal" : "○ No deal loaded"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Library dropdown */}
            <div ref={libraryRef} style={{ position: "relative" }}>
              <button
                onClick={openLibrary}
                title="Prompt Library"
                style={{
                  background: libraryOpen ? `${C.accent}22` : "none",
                  border: `1px solid ${libraryOpen ? C.accent : "transparent"}`,
                  borderRadius: 6, color: libraryOpen ? C.accent : C.textMuted,
                  fontSize: 12, cursor: "pointer", padding: "3px 8px",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                <span style={{ fontSize: 13 }}>📚</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>Library</span>
              </button>
              {libraryOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", right: 0,
                  width: 260, maxHeight: 320, overflowY: "auto",
                  background: "#1B2A4A", border: `1px solid ${C.border}`,
                  borderRadius: 10, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}>
                  {libraryPrompts.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: C.textMuted, textAlign: "center" }}>
                      No saved prompts. Add them in the Agent tab.
                    </div>
                  ) : (
                    libraryPrompts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => injectPrompt(p.text)}
                        style={{
                          width: "100%", textAlign: "left", padding: "10px 12px",
                          background: "none", border: "none", borderBottom: `1px solid ${C.border}44`,
                          color: C.text, cursor: "pointer", fontSize: 12,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#0F1B2D")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "none")}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
                        <div style={{ color: C.textMuted, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.text}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", padding: "2px 6px" }}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setPanelOpen(false)}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", padding: 4, display: "flex" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Context bar */}
        {isRegistered && (
          <div
            style={{
              padding: "6px 14px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              background: "#0D1829",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 10, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: C.accent }}>●</span>
              {getCallbacks()?.getActiveTab()?.replace("_", " ")}
            </span>
            {activeFilterCount > 0 && (
              <span style={{ fontSize: 10, color: C.warning }}>
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active
              </span>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
                <div style={{ color: C.text, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  What can I help with?
                </div>
                <div style={{ color: C.textMuted, fontSize: 12 }}>
                  {isRegistered
                    ? "Ask questions or give instructions to navigate, filter, or update your deal."
                    : "Ask M&A integration questions. Load a deal to enable app actions."}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    style={{
                      background: C.cardBg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.text,
                      fontSize: 12,
                      padding: "8px 12px",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "border-color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.borderColor = C.accent)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.borderColor = C.border)
                    }
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 4,
              }}
            >
              <div
                style={{
                  maxWidth: "88%",
                  padding: "9px 13px",
                  borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
                  background: msg.role === "user" ? "#1D4ED8" : C.cardBg,
                  border: msg.role === "user" ? "none" : `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: 13,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
              </div>

              {/* Action chips */}
              {msg.actions && msg.actions.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    maxWidth: "88%",
                    paddingLeft: 2,
                  }}
                >
                  {msg.actions.map((action, i) => (
                    <ActionChip key={i} action={action} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <div
                style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: "4px 14px 14px 14px",
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#3B0F0F",
                border: `1px solid ${C.danger}55`,
                borderRadius: 8,
                color: "#FCA5A5",
                fontSize: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {error}
              <button
                onClick={() => setError(null)}
                style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", fontSize: 14, padding: 0 }}
              >
                ×
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div
          style={{
            padding: "10px 12px",
            borderTop: `1px solid ${C.border}`,
            background: C.deepBlue,
            flexShrink: 0,
          }}
        >
          {!isRegistered && (
            <div
              style={{
                marginBottom: 8,
                padding: "5px 10px",
                background: "#1B2A4A",
                borderRadius: 6,
                fontSize: 10,
                color: C.textMuted,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              Load a deal to enable app actions
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything or give an instruction…"
              rows={2}
              disabled={loading}
              style={{
                flex: 1,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 13,
                padding: "9px 12px",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.45,
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                background: input.trim() && !loading ? "linear-gradient(135deg, #1D4ED8, #3B82F6)" : "#1E293B",
                border: `1px solid ${input.trim() && !loading ? C.accent : C.border}`,
                borderRadius: 10,
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !loading ? "#F1F5F9" : C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div style={{ marginTop: 5, fontSize: 10, color: C.textMuted, textAlign: "right" }}>
            Enter to send · Shift+Enter for newline
          </div>
        </div>
      </div>
    </>
  );
}
