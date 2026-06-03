"use client";

import { useState, useEffect } from "react";
import { useAgentContext } from "@/lib/agent-context";

// ─── Colour palette ─────────────────────────────────────────────────────────
const C = {
  bg: "#0F1B2D",
  cardBg: "#1E293B",
  deepBg: "#141F33",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  accent: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  purple: "#8B5CF6",
  teal: "#14B8A6",
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface SeedPrompt {
  name: string;
  text: string;
  role?: string;
  contextSource?: string[];
  outputFormat?: string;
  exampleOutput?: string;
  reasoningSteps?: string[];
}

interface FieldDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  seeds: SeedPrompt[];
}

interface TierDef {
  id: string;
  title: string;
  accent: string;
  fields: FieldDef[];
}

interface Prompt {
  id: string;
  name: string;
  text: string;
  category: string | null;
  isGlobal: boolean;
  createdAt: string;
  role?: string | null;
  contextSource?: string[] | null;
  outputFormat?: string | null;
  exampleOutput?: string | null;
  reasoningSteps?: string[] | null;
}

const CONTEXT_SOURCE_OPTIONS = [
  "All deal data", "Checklist items", "Risk alerts",
  "Milestones", "Team members", "Progress snapshots", "Intake fields",
];
const OUTPUT_FORMAT_OPTIONS = [
  "Executive Memo", "Markdown Table", "Bullet List",
  "JSON", "Narrative Prose", "Risk Matrix", "Action Items",
];

function assemblePromptText(p: Prompt | SeedPrompt): string {
  let out = "";
  if (p.role) out += `${p.role}\n\n`;
  out += p.text;
  if (p.reasoningSteps?.length) {
    out += "\n\nApproach this step-by-step:";
    p.reasoningSteps.forEach((step, i) => { out += `\n${i + 1}. ${step}`; });
  }
  return out.trim();
}

// ─── All known field-category IDs (used to identify "uncategorized") ─────────
const ALL_FIELD_IDS = new Set([
  "program_status","deal_structure","integration_model","close_date",
  "functional_scope","cross_border","tsa_required","industry_sector",
  "deal_value","target_entities","target_gaap","target_erp","buyer_maturity",
  "historic",
]);

// ─── Section + seed prompt definitions ──────────────────────────────────────
const SECTION_DEFS: TierDef[] = [
  {
    id: "tier1",
    title: "TIER 1 — CORE DEAL INFORMATION",
    accent: C.accent,
    fields: [
      {
        id: "program_status",
        label: "Program Status",
        icon: "◉",
        desc: "Overall health, completion rate, and top-priority items",
        seeds: [
          {
            name: "Full status summary",
            text: "What is the current overall integration status? Summarize completion percentage, workstream RAG breakdown, top blockers, and any critical items requiring immediate attention.",
            role: "You are an experienced M&A Integration Director with 15+ years of PE-backed transaction experience. Speak with authority, clarity, and a bias toward action.",
            contextSource: ["All deal data", "Checklist items", "Risk alerts", "Milestones"],
            outputFormat: "Executive Memo",
            exampleOutput: "Integration is 47% complete across 24 workstreams. Finance (62%) and IT (38%) are the leading and lagging workstreams respectively. Three critical blockers require SteerCo attention this week: (1) ERP cutover date unconfirmed, (2) TSA exit plan for Finance not yet signed off, (3) two Day-1 legal entity filings at risk. Recommended: escalate IT governance decision by Thursday.",
            reasoningSteps: [
              "Calculate overall completion % from checklist item statuses",
              "Identify RAG status per workstream — flag any RED workstreams",
              "List the top 3 blockers with deal impact and owner",
              "Note any items past their milestone date",
              "Close with one forward-looking recommendation for SteerCo",
            ],
          },
          {
            name: "Executive one-pager",
            text: "Generate a one-paragraph executive summary of our integration program suitable for a Board or SteerCo email update. Include RAG status, key metric, top risk, and one forward-looking statement.",
          },
          {
            name: "Top priorities this week",
            text: "What are the three most critical items that require my attention this week? Consider overdue items, blocked dependencies, and approaching milestones.",
          },
          {
            name: "Capture progress snapshot",
            text: "Capture a progress snapshot to record our current integration status for trend tracking.",
          },
        ],
      },
      {
        id: "deal_structure",
        label: "Deal Structure",
        icon: "◈",
        desc: "Structure-specific workstream priorities, risks, and compliance obligations",
        seeds: [
          {
            name: "Structure-driven workstream priorities",
            text: "What workstream priorities are most impacted by our deal structure? Which areas require the most attention given how this transaction is structured?",
          },
          {
            name: "Day 1 risks by structure",
            text: "What are the most common Day 1 risks for our transaction type? Are there any structure-specific issues currently unaddressed in our checklist?",
            role: "You are a seasoned M&A integration risk advisor. Your analysis is concise, deal-specific, and directly actionable.",
            contextSource: ["Checklist items", "Risk alerts", "Intake fields"],
            outputFormat: "Risk Matrix",
            reasoningSteps: [
              "Identify the deal structure from intake data",
              "List the 3–5 highest-probability Day 1 risks for this structure type",
              "Cross-reference against current checklist — flag any unaddressed items",
              "Assign a severity (Critical / High / Medium) to each risk",
              "Recommend the single most important mitigation action",
            ],
          },
          {
            name: "Regulatory & compliance flags",
            text: "Are there any regulatory or compliance obligations triggered by our deal structure that appear incomplete or unassigned in the checklist?",
          },
          {
            name: "Structure risk memo",
            text: "Generate a risk memo focused on deal-structure-specific risks, including structural complexity, counterparty obligations, and integration sequencing implications.",
          },
        ],
      },
      {
        id: "integration_model",
        label: "Integration Model",
        icon: "⬡",
        desc: "Model-driven sequencing, interdependencies, and workstream design",
        seeds: [
          {
            name: "IT workstream sequencing",
            text: "How does our integration model affect the sequencing of IT workstream activities? Which IT sub-workstreams should be prioritised first given our approach?",
          },
          {
            name: "Cross-workstream interdependencies",
            text: "Which workstreams carry the highest interdependency risk given our integration model? Show me items where delays in one workstream will block another.",
          },
          {
            name: "Model assumption re-evaluation",
            text: "What checklist items or workstream priorities should be re-evaluated if we shift or adjust our integration model assumptions?",
          },
          {
            name: "Critical items by model",
            text: "Show me all critical-priority items that are directly related to our integration model design and current execution.",
          },
        ],
      },
      {
        id: "close_date",
        label: "Close Date & Milestones",
        icon: "▦",
        desc: "Timeline health, critical path to close, and milestone risk",
        seeds: [
          {
            name: "Days to close — at-risk items",
            text: "How many calendar days remain until close? Which Pre-Close items are not yet started or blocked, and what is the risk to our close timeline?",
          },
          {
            name: "Critical path to Day 1",
            text: "What is our critical path to close and Day 1 readiness? Identify the top items where delays could prevent us from being operationally ready on Day 1.",
          },
          {
            name: "Pre-close filter",
            text: "Filter the checklist to show all Pre-Close items sorted by priority. Highlight anything overdue or not yet started.",
          },
          {
            name: "Milestone health check",
            text: "Which phase milestones are past due or at risk relative to our close date? What corrective actions are recommended?",
          },
        ],
      },
    ],
  },

  {
    id: "tier2",
    title: "TIER 2 — CONTEXT & SCOPE",
    accent: C.purple,
    fields: [
      {
        id: "functional_scope",
        label: "Functional Scope",
        icon: "☰",
        desc: "Active workstreams, coverage gaps, and ownership across functional areas",
        seeds: [
          {
            name: "Active workstreams summary",
            text: "Which functional workstreams are active in our deal scope? Give me a summary of completion percentage and RAG status for each.",
          },
          {
            name: "Unowned items by workstream",
            text: "Are there any active workstreams with no owner assigned, or items within in-scope functional areas that have no owner? Show me the gaps.",
          },
          {
            name: "Blocked items by functional area",
            text: "Show me all blocked checklist items across our in-scope functional areas. Group by workstream and include the blocked reason where available.",
          },
          {
            name: "Lowest completion workstreams",
            text: "Which functional workstreams have the lowest completion percentage? What are the key items holding them back?",
          },
        ],
      },
      {
        id: "cross_border",
        label: "Cross-Border & Jurisdictions",
        icon: "⊞",
        desc: "Regulatory, legal, and compliance considerations across jurisdictions",
        seeds: [
          {
            name: "Jurisdictional risk summary",
            text: "What are the regulatory and compliance risks associated with our cross-border jurisdictions? Are all required items assigned and in progress?",
          },
          {
            name: "Cross-border items not started",
            text: "Show me all checklist items with cross-border flags that are not yet started. Highlight any that are critical or overdue.",
          },
          {
            name: "Legal & compliance by jurisdiction",
            text: "What legal and compliance workstream items are outstanding for our non-domestic jurisdictions? Are there any escalation items I should be aware of?",
          },
          {
            name: "Cross-border blocking dependencies",
            text: "Are there any cross-border checklist items that are blocking other workstreams? Show me the dependency impact.",
          },
        ],
      },
      {
        id: "tsa_required",
        label: "TSA Required",
        icon: "⚑",
        desc: "TSA workstream status, exit milestones, and transition obligations",
        seeds: [
          {
            name: "TSA full status summary",
            text: "Summarise all TSA-related checklist items and their current status. What percentage is complete and what is blocked or overdue?",
            contextSource: ["Checklist items", "Milestones", "Risk alerts"],
            outputFormat: "Bullet List",
            reasoningSteps: [
              "Filter checklist items flagged as TSA-relevant",
              "Calculate % complete, % blocked, % not started",
              "List the top 3 blocked or overdue TSA items with owner and due date",
              "Identify the nearest TSA exit milestone and its readiness status",
              "Flag any TSA items that could delay the overall close or Day 1",
            ],
          },
          {
            name: "TSA exit milestones",
            text: "What are the critical TSA exit milestones and their current completion percentage? Which milestones are at risk of missing their target dates?",
          },
          {
            name: "TSA blockers",
            text: "Which TSA workstream items are blocked or overdue and need immediate attention? Include the blocked reason and recommended next steps.",
          },
          {
            name: "TSA timeline estimate",
            text: "Based on current progress, what is the estimated TSA exit timeline? Are we on track or is a timeline extension likely?",
          },
        ],
      },
      {
        id: "industry_sector",
        label: "Industry Sector",
        icon: "◎",
        desc: "Sector-specific risks, regulatory obligations, and compliance items",
        seeds: [
          {
            name: "Sector-specific risks",
            text: "What sector-specific risks should we be monitoring given our industry? Are these risks currently captured and assigned in our risk register?",
          },
          {
            name: "Industry regulatory items",
            text: "Are there industry-specific regulatory or compliance items that need additional attention or escalation? Which ones are not yet started?",
          },
          {
            name: "Data privacy & compliance",
            text: "What data privacy and compliance obligations are specific to our sector? Are the relevant checklist items assigned and progressing on schedule?",
          },
        ],
      },
      {
        id: "deal_value",
        label: "Deal Value Range",
        icon: "◆",
        desc: "Governance, oversight, and financial reporting requirements by deal size",
        seeds: [
          {
            name: "Governance oversight items",
            text: "Given our deal size, what governance and oversight items require extra attention? Are any of these currently unassigned or blocked?",
          },
          {
            name: "Financial reporting thresholds",
            text: "Are there financial reporting or disclosure thresholds triggered by our deal value that we are actively tracking? Show me the relevant items.",
          },
          {
            name: "Board-level escalation flags",
            text: "What items are flagged for board-level escalation given deal complexity and materiality? Are they captured in the SteerCo narratives?",
          },
        ],
      },
      {
        id: "target_entities",
        label: "Target Entities",
        icon: "⬤",
        desc: "Entity-level tracking, legal obligations, and integration complexity",
        seeds: [
          {
            name: "Entity complexity assessment",
            text: "How does the number of target entities affect our integration complexity and tracking? Are there entity-specific workstreams or items we should be managing separately?",
          },
          {
            name: "Entity-specific legal items",
            text: "Are there entity-specific legal, financial, or operational items that need individual tracking or owner assignment? Show me any gaps.",
          },
        ],
      },
    ],
  },

  {
    id: "tier3",
    title: "TIER 3 — ADVANCED CONFIGURATION",
    accent: C.teal,
    fields: [
      {
        id: "target_gaap",
        label: "Target GAAP",
        icon: "▤",
        desc: "GAAP alignment, Technical Accounting items, and reporting consolidation",
        seeds: [
          {
            name: "Technical Accounting status",
            text: "What are the key Technical Accounting items we need to track for GAAP alignment? Show me their current status, owner, and phase.",
            role: "You are a Big-4 Technical Accounting partner specializing in M&A purchase accounting and GAAP conversion for complex cross-border transactions.",
            contextSource: ["Checklist items", "Intake fields", "Risk alerts"],
            outputFormat: "Markdown Table",
            exampleOutput: "| Item | Status | Owner | Phase | Risk |\n|---|---|---|---|---|\n| Purchase Price Allocation | In Progress | CFO | Pre-Close | High |\n| Fair Value Adjustments | Not Started | Controller | Day 30 | Critical |\n| Goodwill Impairment Policy | Complete | Controller | Pre-Close | Low |",
            reasoningSteps: [
              "Identify the target GAAP standard from intake data",
              "Filter checklist for Technical Accounting and GAAP-related items",
              "Group by status: Complete / In Progress / Not Started / Blocked",
              "Flag any Critical or High priority items not yet started",
              "Highlight GAAP conversion risk if target is non-US GAAP",
            ],
          },
          {
            name: "Financial Reporting & Consolidation",
            text: "Show me all Financial Reporting & Consolidation workstream items. Which are in progress, blocked, or not yet started?",
          },
          {
            name: "GAAP Day 30–60 priorities",
            text: "What are the Day 30 and Day 60 priorities for GAAP conversion and financial reporting alignment? Are any at risk?",
          },
          {
            name: "GAAP items at risk",
            text: "Are there any GAAP-specific or financial reporting items that are blocked, overdue, or flagged as critical? What actions are recommended?",
          },
        ],
      },
      {
        id: "target_erp",
        label: "Target ERP",
        icon: "⚙",
        desc: "ERP migration milestones, data cutover, and enterprise systems sequencing",
        seeds: [
          {
            name: "ERP migration milestones",
            text: "What are the critical ERP migration milestones across our IT workstreams? Show completion status and flag any at-risk items.",
          },
          {
            name: "Enterprise Systems workstream",
            text: "Show me all IT > Enterprise Systems workstream items related to our ERP transition. Highlight anything blocked or unassigned.",
          },
          {
            name: "Data migration & cutover plan",
            text: "What data migration and cutover items need to be in our Day 1 and Day 30 plan? Are they sequenced correctly and assigned?",
          },
          {
            name: "ERP risk assessment",
            text: "What are the most common blockers and risks in ERP migration projects that we should be actively monitoring? Are these reflected in our risk register?",
          },
        ],
      },
      {
        id: "buyer_maturity",
        label: "Buyer Maturity",
        icon: "◫",
        desc: "IMO governance, acquisition experience, and integration management best practices",
        seeds: [
          {
            name: "IMO governance priorities",
            text: "Given our acquisition experience level, what Integration Management Office (IMO) governance items need the most focus? Are any currently unassigned?",
          },
          {
            name: "Acquirer risk profile",
            text: "Are there any first-time or early-stage acquirer risks reflected in our current checklist that need escalation or additional resourcing?",
          },
          {
            name: "Integration Management workstream",
            text: "Show me all Integration Management workstream items and their completion status. Which are critical and what is the current owner breakdown?",
          },
          {
            name: "Best practice recommendations",
            text: "What M&A integration management best practices are most relevant to our buyer profile and deal context? Are there gaps in our current approach?",
          },
        ],
      },
    ],
  },

  {
    id: "historic",
    title: "HISTORIC REPOSITORY",
    accent: C.warning,
    fields: [
      {
        id: "historic",
        label: "Historical Analysis",
        icon: "⊙",
        desc: "Period-over-period comparison, snapshot trends, and archived programme insights",
        seeds: [
          {
            name: "Period-over-period comparison",
            text: "Compare our current completion rate and RAG status to the previous progress snapshot. What has improved and what has deteriorated?",
          },
          {
            name: "RAG trend across snapshots",
            text: "Show the RAG trend for each workstream over the last 8 snapshots. Which workstreams are consistently red or amber?",
          },
          {
            name: "Persistently blocked items",
            text: "Which items have been in 'blocked' status for more than one snapshot period? What is holding them back and who owns resolution?",
          },
          {
            name: "Last SteerCo status",
            text: "What was our overall programme status at the time of the last progress snapshot? Summarise the key metrics and top risks from that point.",
          },
          {
            name: "Historical status report",
            text: "Generate a historical status report comparing current integration metrics to the prior period. Highlight velocity, new blockers, and resolved items.",
          },
          {
            name: "Workstream improvement trends",
            text: "Which workstreams have improved or deteriorated the most since the last snapshot? What are the driving factors?",
          },
          {
            name: "Items completed this period",
            text: "What items moved to 'complete' since the last progress snapshot? Show me the list by workstream.",
          },
          {
            name: "Snapshot velocity analysis",
            text: "Based on our burndown trend, what is our projected completion date at current velocity? Are we on track for the integration end date?",
          },
        ],
      },
    ],
  },
];

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  dealId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function PromptLibraryPanel({ dealId }: Props) {
  const { setPendingPrompt, setPanelOpen } = useAgentContext();

  // DB prompts
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState("");
  const [form, setForm] = useState({
    name: "", text: "", category: "",
    role: "", contextSource: [] as string[], outputFormat: "",
    exampleOutput: "", reasoningSteps: [] as string[],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedExample, setExpandedExample] = useState<string | null>(null);

  // Tier expand/collapse  (all open by default except nothing collapsed)
  const [collapsedTiers, setCollapsedTiers] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, [dealId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true);
    try {
      const url = dealId ? `/api/agent/prompts?dealId=${dealId}` : "/api/agent/prompts";
      const res = await fetch(url);
      const d = await res.json();
      setPrompts(
        (d.prompts ?? []).map((p: any) => ({
          id: p.id, name: p.name, text: p.text,
          category: p.category ?? null, isGlobal: p.isGlobal ?? p.is_global, createdAt: p.createdAt ?? p.created_at,
          role: p.role ?? null,
          contextSource: p.contextSource ?? null,
          outputFormat: p.outputFormat ?? null,
          exampleOutput: p.exampleOutput ?? null,
          reasoningSteps: p.reasoningSteps ?? null,
        }))
      );
    } catch {
      setError("Failed to load prompts.");
    } finally {
      setLoading(false);
    }
  }

  function openAdd(categoryId: string) {
    setForm({ name: "", text: "", category: categoryId, role: "", contextSource: [], outputFormat: "", exampleOutput: "", reasoningSteps: [] });
    setFormCategory(categoryId);
    setEditingId(null);
    setShowAdvanced(false);
    setShowForm(true);
    setTimeout(() => document.getElementById("prompt-form-name")?.focus(), 80);
  }

  function openEdit(p: Prompt) {
    setForm({
      name: p.name, text: p.text, category: p.category ?? "",
      role: p.role ?? "", contextSource: p.contextSource ?? [],
      outputFormat: p.outputFormat ?? "", exampleOutput: p.exampleOutput ?? "",
      reasoningSteps: p.reasoningSteps ?? [],
    });
    setFormCategory(p.category ?? "");
    setEditingId(p.id);
    setShowAdvanced(!!(p.role || p.contextSource?.length || p.outputFormat || p.exampleOutput || p.reasoningSteps?.length));
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.text.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name, text: form.text, category: form.category || null,
      role: form.role.trim() || null,
      contextSource: form.contextSource.length ? form.contextSource : null,
      outputFormat: form.outputFormat || null,
      exampleOutput: form.exampleOutput.trim() || null,
      reasoningSteps: form.reasoningSteps.filter(s => s.trim()).length ? form.reasoningSteps.filter(s => s.trim()) : null,
    };
    try {
      if (editingId) {
        await fetch("/api/agent/prompts", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
      } else {
        await fetch("/api/agent/prompts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...payload, isGlobal: !dealId, dealId: dealId ?? null }),
        });
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePrompt(id: string) {
    if (!confirm("Delete this prompt?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/agent/prompts?id=${id}`, { method: "DELETE" });
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  function usePrompt(p: Prompt | SeedPrompt) {
    setPendingPrompt(assemblePromptText(p));
    setPanelOpen(true);
  }

  function toggleTier(tierId: string) {
    setCollapsedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tierId)) next.delete(tierId);
      else next.add(tierId);
      return next;
    });
  }

  // User prompts not in any known category → "Uncategorized"
  const uncategorized = prompts.filter(
    (p) => !p.category || !ALL_FIELD_IDS.has(p.category)
  );

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading prompts…</div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>Prompt Library</div>
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
            Organised by deal context area. Click <strong style={{ color: C.success }}>Use →</strong> on any prompt to inject it into the agent chat.
          </div>
        </div>
        <button onClick={() => openAdd("")} style={{
          padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.accent}`,
          background: `${C.accent}22`, color: C.accent, fontSize: 12, fontWeight: 600,
          cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 16,
        }}>
          + New Prompt
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#3B0F0F", border: `1px solid ${C.danger}55`, borderRadius: 8, color: "#FCA5A5", fontSize: 12 }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", marginLeft: 8, fontSize: 14 }}>×</button>
        </div>
      )}

      {/* ── Prompt add/edit form ── */}
      {showForm && (
        <div style={{ marginBottom: 20, padding: 16, borderRadius: 10, background: C.deepBg, border: `1px solid ${C.accent}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
            {editingId ? "Edit Prompt" : "New Prompt"}
            {formCategory && !editingId && (
              <span style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px", borderRadius: 6, background: `${C.accent}22`, color: C.accent, fontWeight: 500 }}>
                {SECTION_DEFS.flatMap(t => t.fields).find(f => f.id === formCategory)?.label ?? formCategory}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input id="prompt-form-name"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Prompt name (e.g. Weekly Status Check)"
              style={inputStyle}
            />
            {!formCategory && (
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                style={inputStyle}
              >
                <option value="">Category / section (optional)</option>
                {SECTION_DEFS.flatMap(t => t.fields).map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
                <option value="historic">Historic Repository</option>
              </select>
            )}
            <textarea
              value={form.text}
              onChange={(e) => setForm(f => ({ ...f, text: e.target.value }))}
              placeholder="Core prompt instructions…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />

            {/* Advanced section toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(a => !a)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 5, padding: 0, alignSelf: "flex-start" }}
            >
              <span>{showAdvanced ? "▾" : "▸"}</span>
              {showAdvanced ? "Hide advanced" : "▼ Advanced — Role · Context · Format · Reasoning"}
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, borderRadius: 8, background: C.bg + "88", border: `1px solid ${C.border}55` }}>
                {/* Role */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>🎭 Role / AI Persona</div>
                  <textarea
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    placeholder="You are a senior M&A Integration Director with 15+ years of PE-backed transaction experience…"
                    rows={2}
                    style={{ ...inputStyle, resize: "vertical", fontSize: 11 }}
                  />
                </div>
                {/* Context sources */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>📋 Context Sources</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {CONTEXT_SOURCE_OPTIONS.map(opt => {
                      const active = form.contextSource.includes(opt);
                      return (
                        <button key={opt} type="button" onClick={() => setForm(f => ({
                          ...f,
                          contextSource: active ? f.contextSource.filter(s => s !== opt) : [...f.contextSource, opt],
                        }))} style={{
                          padding: "4px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600, cursor: "pointer",
                          border: `1px solid ${active ? C.accent : C.border}`,
                          background: active ? C.accent + "22" : "transparent",
                          color: active ? C.accent : C.textMuted,
                        }}>{opt}</button>
                      );
                    })}
                  </div>
                </div>
                {/* Output format */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>📄 Output Format</div>
                  <select
                    value={form.outputFormat}
                    onChange={e => setForm(f => ({ ...f, outputFormat: e.target.value }))}
                    style={{ ...inputStyle, fontSize: 11 }}
                  >
                    <option value="">Select output format…</option>
                    {OUTPUT_FORMAT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {/* Reasoning steps */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>🔢 Reasoning Steps</div>
                  {form.reasoningSteps.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: C.textMuted, width: 18, flexShrink: 0 }}>{i + 1}.</span>
                      <input
                        value={step}
                        onChange={e => setForm(f => ({ ...f, reasoningSteps: f.reasoningSteps.map((s, j) => j === i ? e.target.value : s) }))}
                        placeholder={`Step ${i + 1}…`}
                        style={{ ...inputStyle, flex: 1, fontSize: 11 }}
                      />
                      <button type="button" onClick={() => setForm(f => ({ ...f, reasoningSteps: f.reasoningSteps.filter((_, j) => j !== i) }))}
                        style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 14, padding: "0 4px" }}>×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setForm(f => ({ ...f, reasoningSteps: [...f.reasoningSteps, ""] }))}
                    style={{ fontSize: 10, color: C.accent, background: "none", border: `1px dashed ${C.accent}55`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                    + Add step
                  </button>
                </div>
                {/* Example output */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.success, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>✦ Example Output (reference only — not injected)</div>
                  <textarea
                    value={form.exampleOutput}
                    onChange={e => setForm(f => ({ ...f, exampleOutput: e.target.value }))}
                    placeholder="Example: Integration is 47% complete across 24 workstreams. Finance (62%) is leading…"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical", fontSize: 11 }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.text.trim()}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => { setShowForm(false); setEditingId(null); }}
                style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tier sections ── */}
      {SECTION_DEFS.map((tier) => {
        const isCollapsed = collapsedTiers.has(tier.id);
        return (
          <div key={tier.id} style={{ marginBottom: 28 }}>

            {/* Tier header */}
            <button
              onClick={() => toggleTier(tier.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                background: "none", border: "none", cursor: "pointer", padding: "6px 0",
                marginBottom: isCollapsed ? 0 : 14, textAlign: "left",
              }}
            >
              <span style={{ fontSize: 10, color: tier.accent, transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", display: "inline-block" }}>▼</span>
              <div style={{ height: 1, flex: "0 0 12px", background: tier.accent + "55" }} />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: tier.accent, whiteSpace: "nowrap" }}>
                {tier.title}
              </span>
              <div style={{ flex: 1, height: 1, background: tier.accent + "22" }} />
              <span style={{ fontSize: 10, color: C.textMuted }}>
                {tier.fields.reduce((n, f) => n + prompts.filter(p => p.category === f.id).length, 0)} custom
              </span>
            </button>

            {/* Field containers */}
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {tier.fields.map((field) => {
                  const userPrompts = prompts.filter(p => p.category === field.id);
                  return (
                    <FieldContainer
                      key={field.id}
                      field={field}
                      tierAccent={tier.accent}
                      userPrompts={userPrompts}
                      onUse={usePrompt}
                      onAdd={() => openAdd(field.id)}
                      onEdit={openEdit}
                      onDelete={deletePrompt}
                      deletingId={deletingId}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Uncategorized user prompts ── */}
      {uncategorized.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ height: 1, flex: "0 0 12px", background: "#33415555" }} />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: C.textMuted, whiteSpace: "nowrap" }}>
              UNCATEGORISED PROMPTS
            </span>
            <div style={{ flex: 1, height: 1, background: "#33415533" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {uncategorized.map(p => (
              <PromptCard key={p.id} prompt={p} isUser accent={C.textMuted}
                onUse={usePrompt} onEdit={openEdit} onDelete={deletePrompt} deletingId={deletingId} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── FieldContainer ──────────────────────────────────────────────────────────
function FieldContainer({
  field, tierAccent, userPrompts, onUse, onAdd, onEdit, onDelete, deletingId,
}: {
  field: FieldDef;
  tierAccent: string;
  userPrompts: Prompt[];
  onUse: (p: Prompt | SeedPrompt) => void;
  onAdd: () => void;
  onEdit: (p: Prompt) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${tierAccent}30`,
      background: C.cardBg, overflow: "hidden",
    }}>
      {/* Field header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", background: tierAccent + "0D",
          border: "none", cursor: "pointer", textAlign: "left",
          borderBottom: collapsed ? "none" : `1px solid ${tierAccent}22`,
        }}
      >
        <span style={{ fontSize: 14, color: tierAccent }}>{field.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{field.label}</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{field.desc}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 10,
            background: `${tierAccent}22`, color: tierAccent, fontWeight: 600,
          }}>
            {field.seeds.length} suggested · {userPrompts.length} custom
          </span>
          <span style={{ fontSize: 10, color: C.textMuted, transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s" }}>▼</span>
        </div>
      </button>

      {!collapsed && (
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Seeded prompts */}
          {field.seeds.map((s, i) => (
            <PromptCard
              key={`seed-${i}`}
              prompt={{
                id: `seed-${field.id}-${i}`, name: s.name, text: s.text,
                category: field.id, isGlobal: true, createdAt: "",
                role: s.role, contextSource: s.contextSource,
                outputFormat: s.outputFormat, exampleOutput: s.exampleOutput,
                reasoningSteps: s.reasoningSteps,
              }}
              isSeed
              accent={tierAccent}
              onUse={onUse}
              deletingId={null}
            />
          ))}

          {/* User prompts */}
          {userPrompts.map((p) => (
            <PromptCard
              key={p.id}
              prompt={p}
              isUser
              accent={tierAccent}
              onUse={onUse}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          ))}

          {/* Add custom prompt button */}
          <button
            onClick={onAdd}
            style={{
              marginTop: 4, padding: "7px 12px", borderRadius: 8, width: "100%",
              border: `1px dashed ${tierAccent}44`, background: "transparent",
              color: tierAccent, fontSize: 11, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            + Add custom prompt to {field.label}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PromptCard ──────────────────────────────────────────────────────────────
function PromptCard({
  prompt, isSeed, isUser, accent, onUse, onEdit, onDelete, deletingId,
}: {
  prompt: Prompt;
  isSeed?: boolean;
  isUser?: boolean;
  accent: string;
  onUse: (p: Prompt | SeedPrompt) => void;
  onEdit?: (p: Prompt) => void;
  onDelete?: (id: string) => void;
  deletingId: string | null;
}) {
  const [exampleOpen, setExampleOpen] = useState(false);
  const hasAdvanced = !!(prompt.role || prompt.contextSource?.length || prompt.outputFormat || prompt.reasoningSteps?.length || prompt.exampleOutput);

  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      background: isSeed ? accent + "08" : C.deepBg,
      border: `1px solid ${isSeed ? accent + "22" : C.border + "88"}`,
    }}>
      {/* Header row: name + type badges */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isSeed ? C.textMuted : C.text }}>{prompt.name}</span>
            {isSeed && (
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: accent + "22", color: accent, fontWeight: 700, letterSpacing: 0.3 }}>SUGGESTED</span>
            )}
            {isUser && (
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: C.success + "22", color: C.success, fontWeight: 700, letterSpacing: 0.3 }}>CUSTOM</span>
            )}
            {prompt.outputFormat && (
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 8, background: C.teal + "22", color: C.teal, fontWeight: 600 }}>📄 {prompt.outputFormat}</span>
            )}
          </div>

          {/* Role */}
          {prompt.role && (
            <div style={{ fontSize: 10, color: C.purple, marginBottom: 5, fontStyle: "italic", lineHeight: 1.4 }}>
              🎭 {prompt.role.length > 120 ? prompt.role.slice(0, 120) + "…" : prompt.role}
            </div>
          )}

          {/* Context source chips */}
          {prompt.contextSource && prompt.contextSource.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              {prompt.contextSource.map(s => (
                <span key={s} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: C.accent + "18", color: C.accent, fontWeight: 600 }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Core prompt text */}
          <div style={{
            fontSize: 12, color: C.text, lineHeight: 1.55,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            background: isSeed ? "transparent" : accent + "08",
            borderRadius: isSeed ? 0 : 6,
            padding: isSeed ? 0 : "6px 8px",
            marginBottom: hasAdvanced ? 8 : 0,
          }}>
            {prompt.text}
          </div>

          {/* Reasoning steps */}
          {prompt.reasoningSteps && prompt.reasoningSteps.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.warning, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.6 }}>Step-by-step:</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {prompt.reasoningSteps.map((step, i) => (
                  <li key={i} style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginBottom: 2 }}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Example output — collapsible */}
          {prompt.exampleOutput && (
            <div>
              <button
                onClick={() => setExampleOpen(o => !o)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: C.success, padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}
              >
                <span>{exampleOpen ? "▾" : "▸"}</span> Example output
              </button>
              {exampleOpen && (
                <div style={{
                  fontSize: 11, color: C.textMuted, lineHeight: 1.5,
                  padding: "8px 10px", borderRadius: 6,
                  background: C.success + "08", border: `1px solid ${C.success}22`,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {prompt.exampleOutput}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
          <button
            onClick={() => onUse(prompt)}
            style={{
              padding: "5px 12px", borderRadius: 7, border: `1px solid ${C.success}`,
              background: `${C.success}22`, color: C.success, fontSize: 11, fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            Use →
          </button>
          {isUser && onEdit && onDelete && (
            <>
              <button
                onClick={() => onEdit(prompt)}
                style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer" }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(prompt.id)}
                disabled={deletingId === prompt.id}
                style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.danger}44`, background: "transparent", color: C.danger, fontSize: 10, cursor: "pointer", opacity: deletingId === prompt.id ? 0.5 : 1 }}
              >
                ×
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0F1B2D",
  color: "#F1F5F9",
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
