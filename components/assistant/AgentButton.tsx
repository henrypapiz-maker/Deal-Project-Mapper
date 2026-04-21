"use client";

import { useAgentContext } from "@/lib/agent-context";

export default function AgentButton() {
  const { panelOpen, setPanelOpen, unreadCount, clearUnread } = useAgentContext();

  function handleClick() {
    setPanelOpen(!panelOpen);
    if (!panelOpen) clearUnread();
  }

  return (
    <button
      onClick={handleClick}
      title={panelOpen ? "Close assistant" : "Open DealMapper Assistant"}
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: panelOpen
          ? "#1E293B"
          : "linear-gradient(135deg, #1D4ED8, #3B82F6)",
        border: "2px solid #3B82F6",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 20px rgba(59,130,246,0.45)",
        transition: "transform 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")
      }
    >
      {panelOpen ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6l.3 3-3.5-1.5A7 7 0 1 1 12 2z" />
          <path d="M9 9h.01M12 9h.01M15 9h.01" strokeWidth="2.5" />
        </svg>
      )}

      {/* Unread badge */}
      {unreadCount > 0 && !panelOpen && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#EF4444",
            color: "#fff",
            borderRadius: "50%",
            width: 18,
            height: 18,
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #0F1B2D",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
