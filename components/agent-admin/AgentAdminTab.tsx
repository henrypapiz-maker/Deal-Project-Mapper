"use client";

import { useState } from "react";
import AgentPermissionsPanel from "./AgentPermissionsPanel";
import PromptLibraryPanel from "./PromptLibraryPanel";
import SkillsPanel from "./SkillsPanel";
import AgentDocumentsPanel from "./AgentDocumentsPanel";
import type { GeneratedDeal } from "@/lib/types";

const C = {
  navy: "#0F1B2D",
  deepBlue: "#1B2A4A",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  accent: "#3B82F6",
};

type SubTab = "permissions" | "prompts" | "skills" | "documents";

const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: "permissions", label: "Permissions", icon: "🔒" },
  { id: "prompts", label: "Prompt Library", icon: "📚" },
  { id: "skills", label: "Skills", icon: "⚡" },
  { id: "documents", label: "Documents", icon: "📄" },
];

interface Props {
  deal: GeneratedDeal | null;
}

export default function AgentAdminTab({ deal }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("permissions");

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #1D4ED8, #3B82F6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14,
          }}>
            ✦
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Agent Administration</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              Configure the DealMapper AI agent — permissions, saved prompts, multi-step skills, and synthesized documents.
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab nav */}
      <div style={{
        display: "flex", gap: 4,
        background: "rgba(30,41,59,0.5)", borderRadius: 8, padding: 3,
        marginBottom: 20, width: "fit-content",
      }}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            style={{
              padding: "7px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              background: activeSubTab === tab.id ? C.accent : "transparent",
              color: activeSubTab === tab.id ? "#fff" : C.textMuted,
              fontSize: 12, fontWeight: 600, letterSpacing: 0.3,
              transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <span style={{ fontSize: 11 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{
        background: C.cardBg, borderRadius: 10,
        border: `1px solid ${C.border}`, padding: 20,
        minHeight: 400,
      }}>
        {activeSubTab === "permissions" && <AgentPermissionsPanel />}
        {activeSubTab === "prompts" && <PromptLibraryPanel dealId={deal?.id} />}
        {activeSubTab === "skills" && <SkillsPanel />}
        {activeSubTab === "documents" && (
          deal?.id
            ? <AgentDocumentsPanel dealId={deal.id!} />
            : <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                Load and save a deal first to view synthesized documents.
              </div>
        )}
      </div>
    </div>
  );
}
