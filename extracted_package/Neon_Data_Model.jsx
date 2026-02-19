import { useState } from "react";

const COLORS = {
  bg: "#0C1222",
  card: "#141E33",
  cardHover: "#1A2844",
  border: "#243356",
  accent: "#3B82F6",
  accentDim: "#2563EB",
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
  pink: "#EC4899",
  cyan: "#06B6D4",
  orange: "#F97316",
  text: "#E2E8F0",
  textMuted: "#64748B",
  textDim: "#475569",
  white: "#FFFFFF",
};

const tables = [
  {
    name: "deals",
    schema: "public",
    color: COLORS.accent,
    desc: "Core deal record — one row per M&A transaction",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "UUID", pk: true, desc: "Primary key" },
      { name: "name", type: "VARCHAR(100)", desc: "Deal code name (e.g., 'Project Meridian')" },
      { name: "deal_structure", type: "ENUM", desc: "Stock Purchase | Asset Purchase | Merger | Carve-Out | F-Reorg" },
      { name: "integration_model", type: "ENUM", desc: "Fully Integrated | Hybrid | Standalone" },
      { name: "close_date", type: "DATE", desc: "Target or confirmed close date" },
      { name: "cross_border", type: "BOOLEAN", desc: "Cross-border flag" },
      { name: "jurisdictions", type: "JSONB", desc: "Array of jurisdiction codes: ['US','EU','UK']" },
      { name: "tsa_required", type: "ENUM", desc: "Yes | No | TBD" },
      { name: "industry_sector", type: "VARCHAR(50)", desc: "Tier 2: Technology, Healthcare, etc." },
      { name: "shared_services", type: "JSONB", desc: "Array of transferring services" },
      { name: "deal_value_range", type: "VARCHAR(20)", desc: "Tier 2: <$50M, $50M-$250M, etc." },
      { name: "target_entities", type: "INTEGER", desc: "Tier 2: Number of legal entities" },
      { name: "target_gaap", type: "VARCHAR(20)", desc: "Tier 3: US GAAP, IFRS, Local, Multiple" },
      { name: "target_erp", type: "VARCHAR(50)", desc: "Tier 3: SAP, Oracle, NetSuite, etc." },
      { name: "buyer_maturity", type: "VARCHAR(30)", desc: "Tier 3: First | Occasional | Serial | PE" },
      { name: "acquirer_gaap", type: "VARCHAR(20)", desc: "Acquirer GAAP framework" },
      { name: "acquirer_fye", type: "DATE", desc: "Acquirer fiscal year end" },
      { name: "status", type: "ENUM", desc: "Pre-Close | Active | Complete | Archived" },
      { name: "created_at", type: "TIMESTAMPTZ", desc: "Record creation" },
      { name: "updated_at", type: "TIMESTAMPTZ", desc: "Last modification" },
    ]
  },
  {
    name: "checklist_items",
    schema: "public",
    color: COLORS.green,
    desc: "443 master checklist items instantiated per deal",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "UUID", pk: true, desc: "Instance PK" },
      { name: "deal_id", type: "UUID", fk: "deals.id", desc: "FK to deal" },
      { name: "item_id", type: "VARCHAR(10)", desc: "Master ID: FRC-0001 through FRC-0443" },
      { name: "workstream", type: "VARCHAR(50)", desc: "L2 taxonomy (12 workstreams)" },
      { name: "section", type: "VARCHAR(100)", desc: "L3 taxonomy (~70 sections)" },
      { name: "description", type: "TEXT", desc: "Task description" },
      { name: "phase", type: "VARCHAR(20)", desc: "Day_1 | Day_30 | Day_60 | Day_90 | Year_1" },
      { name: "milestone_date", type: "DATE", desc: "Calculated from close_date + phase offset" },
      { name: "priority", type: "ENUM", desc: "Critical | High | Medium | Low" },
      { name: "status", type: "ENUM", desc: "Not Started | In Progress | Blocked | Complete | N/A" },
      { name: "owner_id", type: "UUID", fk: "team_members.id", desc: "FK to assigned team member" },
      { name: "dependencies", type: "JSONB", desc: "Array of item_ids this depends on" },
      { name: "tsa_relevant", type: "BOOLEAN", desc: "TSA-related item flag" },
      { name: "cross_border_flag", type: "BOOLEAN", desc: "Activated by jurisdiction overlay" },
      { name: "risk_indicators", type: "JSONB", desc: "Array of risk category keys" },
      { name: "ai_guidance", type: "TEXT", desc: "FR-13 embedded expertise prompt" },
      { name: "notes", type: "JSONB", desc: "User annotations array" },
      { name: "evidence_url", type: "VARCHAR(500)", desc: "Completion evidence link" },
      { name: "blocked_reason", type: "TEXT", desc: "If status = Blocked" },
      { name: "na_justification", type: "TEXT", desc: "If status = N/A" },
      { name: "updated_at", type: "TIMESTAMPTZ", desc: "Last status change" },
    ]
  },
  {
    name: "team_members",
    schema: "public",
    color: COLORS.cyan,
    desc: "Deal team roster for assignment and notifications",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "UUID", pk: true, desc: "Primary key" },
      { name: "deal_id", type: "UUID", fk: "deals.id", desc: "FK to deal" },
      { name: "name", type: "VARCHAR(100)", desc: "Full name" },
      { name: "email", type: "VARCHAR(200)", desc: "Email for notifications" },
      { name: "role", type: "VARCHAR(50)", desc: "PMO Lead | Workstream Lead | Analyst | Advisor" },
      { name: "workstreams", type: "JSONB", desc: "Array of assigned workstream names" },
      { name: "created_at", type: "TIMESTAMPTZ", desc: "Record creation" },
    ]
  },
  {
    name: "status_history",
    schema: "audit",
    color: COLORS.yellow,
    desc: "Immutable audit log of all checklist state transitions",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "BIGSERIAL", pk: true, desc: "Auto-increment PK" },
      { name: "checklist_item_id", type: "UUID", fk: "checklist_items.id", desc: "FK to checklist item" },
      { name: "deal_id", type: "UUID", fk: "deals.id", desc: "FK to deal (denormalized)" },
      { name: "old_status", type: "VARCHAR(20)", desc: "Previous status" },
      { name: "new_status", type: "VARCHAR(20)", desc: "New status" },
      { name: "changed_by", type: "UUID", fk: "team_members.id", desc: "Who made the change" },
      { name: "reason", type: "TEXT", desc: "Change reason / notes" },
      { name: "created_at", type: "TIMESTAMPTZ", desc: "Transition timestamp" },
    ]
  },
  {
    name: "risk_alerts",
    schema: "public",
    color: COLORS.red,
    desc: "AI-generated risk flags from Section 6 taxonomy",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "UUID", pk: true, desc: "Primary key" },
      { name: "deal_id", type: "UUID", fk: "deals.id", desc: "FK to deal" },
      { name: "category", type: "VARCHAR(50)", desc: "Risk category (7 types from taxonomy)" },
      { name: "severity", type: "ENUM", desc: "Critical | High | Medium | Low" },
      { name: "description", type: "TEXT", desc: "AI-generated risk description" },
      { name: "indicators", type: "JSONB", desc: "Matched detection rule indicators" },
      { name: "affected_items", type: "JSONB", desc: "Array of checklist_item IDs" },
      { name: "mitigation", type: "TEXT", desc: "Suggested mitigation strategy" },
      { name: "status", type: "ENUM", desc: "Open | Acknowledged | Mitigated | Closed" },
      { name: "created_at", type: "TIMESTAMPTZ", desc: "Detection timestamp" },
      { name: "resolved_at", type: "TIMESTAMPTZ", desc: "Resolution timestamp" },
    ]
  },
  {
    name: "risk_rules",
    schema: "config",
    color: COLORS.orange,
    desc: "Detection logic rules from Training Model Framework Section 6",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "SERIAL", pk: true, desc: "Auto-increment PK" },
      { name: "category", type: "VARCHAR(50)", desc: "Risk category name" },
      { name: "severity_default", type: "VARCHAR(10)", desc: "Default severity level" },
      { name: "predicate", type: "JSONB", desc: "JSON detection logic (field, operator, value)" },
      { name: "description_template", type: "TEXT", desc: "Template for risk description" },
      { name: "mitigation_template", type: "TEXT", desc: "Template for mitigation suggestion" },
      { name: "active", type: "BOOLEAN", desc: "Rule enabled/disabled" },
    ]
  },
  {
    name: "guidance_library",
    schema: "config",
    color: COLORS.purple,
    desc: "AI prompt templates for FR-13 contextual guidance",
    phase: "Phase 1",
    columns: [
      { name: "id", type: "SERIAL", pk: true, desc: "Auto-increment PK" },
      { name: "workstream", type: "VARCHAR(50)", desc: "Target workstream" },
      { name: "section", type: "VARCHAR(100)", desc: "Target section (L3)" },
      { name: "context_flags", type: "JSONB", desc: "Matching conditions: {cross_border, sector, ...}" },
      { name: "prompt_template", type: "TEXT", desc: "Have-you-thought-about question template" },
      { name: "expansion_prompt", type: "TEXT", desc: "System prompt for Claude API contextual expansion" },
    ]
  },
  {
    name: "tsa_services",
    schema: "public",
    color: COLORS.pink,
    desc: "TSA service inventory with SLAs and exit tracking",
    phase: "Phase 2",
    columns: [
      { name: "id", type: "UUID", pk: true, desc: "Primary key" },
      { name: "deal_id", type: "UUID", fk: "deals.id", desc: "FK to deal" },
      { name: "service_category", type: "VARCHAR(50)", desc: "IT | Finance | HR | Treasury | Legal | Facilities" },
      { name: "service_name", type: "VARCHAR(200)", desc: "Specific service description" },
      { name: "pricing_model", type: "VARCHAR(20)", desc: "Cost-Plus | Flat Fee | T&M | Declining" },
      { name: "monthly_cost", type: "DECIMAL(12,2)", desc: "Monthly service cost" },
      { name: "start_date", type: "DATE", desc: "TSA start (close date)" },
      { name: "end_date", type: "DATE", desc: "Planned exit date" },
      { name: "sla_metrics", type: "JSONB", desc: "{metric, target, penalty}" },
      { name: "exit_readiness", type: "INTEGER", desc: "0-100 readiness score" },
      { name: "status", type: "ENUM", desc: "Active | Extended | Exited" },
    ]
  },
  {
    name: "agent_state",
    schema: "agents",
    color: COLORS.purple,
    desc: "Persistent state for Phase 2+ AI agents",
    phase: "Phase 2",
    columns: [
      { name: "id", type: "UUID", pk: true, desc: "Primary key" },
      { name: "deal_id", type: "UUID", fk: "deals.id", desc: "FK to deal" },
      { name: "agent_type", type: "VARCHAR(30)", desc: "Supervisor | Regulatory | Financial | TSA | Risk" },
      { name: "state", type: "JSONB", desc: "Full agent state object" },
      { name: "last_run", type: "TIMESTAMPTZ", desc: "Last execution timestamp" },
      { name: "next_scheduled", type: "TIMESTAMPTZ", desc: "Next scheduled run" },
      { name: "recommendations", type: "JSONB", desc: "Pending recommendations queue" },
    ]
  },
];

const relationships = [
  { from: "deals", to: "checklist_items", label: "1:N", desc: "Deal has 443 checklist instances" },
  { from: "deals", to: "team_members", label: "1:N", desc: "Deal has team roster" },
  { from: "deals", to: "risk_alerts", label: "1:N", desc: "Deal has risk flags" },
  { from: "deals", to: "tsa_services", label: "1:N", desc: "Deal has TSA services" },
  { from: "deals", to: "agent_state", label: "1:N", desc: "Deal has agent states" },
  { from: "checklist_items", to: "status_history", label: "1:N", desc: "Item has audit trail" },
  { from: "team_members", to: "checklist_items", label: "1:N", desc: "Member owns items" },
  { from: "risk_rules", to: "risk_alerts", label: "triggers", desc: "Rules generate alerts" },
  { from: "guidance_library", to: "checklist_items", label: "serves", desc: "Guidance matched to items" },
];

function Badge({ text, color }) {
  return (
    <span style={{
      display: "inline-block", padding: "1px 6px", borderRadius: 3,
      background: color + "22", color, fontSize: 9, fontWeight: 700, letterSpacing: 0.5
    }}>{text}</span>
  );
}

export default function DataModel() {
  const [expanded, setExpanded] = useState(new Set(["deals", "checklist_items"]));
  const [viewMode, setViewMode] = useState("tables");

  const toggle = (name) => {
    const next = new Set(expanded);
    next.has(name) ? next.delete(name) : next.add(name);
    setExpanded(next);
  };

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
      background: COLORS.bg, color: COLORS.text, minHeight: "100vh", padding: 0
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: COLORS.bg + "EE", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 10
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
            <span style={{ color: COLORS.accent }}>Neon</span> Data Model — M&A Integration Engine
          </div>
          <div style={{ fontSize: 10, color: COLORS.textMuted }}>Preliminary Schema v1.0 Beta — 9 tables, 3 schemas, JSONB-native</div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["tables", "relationships", "sql"].map(v => (
            <button key={v} onClick={() => setViewMode(v)} style={{
              padding: "5px 12px", borderRadius: 4, border: "none", cursor: "pointer",
              background: viewMode === v ? COLORS.accent : "transparent",
              color: viewMode === v ? COLORS.white : COLORS.textMuted,
              fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase"
            }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>

        {/* Stats bar */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20
        }}>
          {[
            { label: "Tables", value: "9", color: COLORS.accent },
            { label: "Schemas", value: "3", sub: "public, config, audit", color: COLORS.cyan },
            { label: "Phase 1 Tables", value: "7", color: COLORS.green },
            { label: "Phase 2 Tables", value: "2", color: COLORS.yellow },
            { label: "JSONB Columns", value: "18", sub: "flexible schema", color: COLORS.purple },
          ].map((s, i) => (
            <div key={i} style={{
              padding: 12, borderRadius: 6, background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderTop: `2px solid ${s.color}`
            }}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 9, color: COLORS.textDim }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        {viewMode === "tables" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tables.map(table => {
              const isOpen = expanded.has(table.name);
              return (
                <div key={table.name} style={{
                  borderRadius: 8, border: `1px solid ${isOpen ? table.color + "44" : COLORS.border}`,
                  background: COLORS.card, overflow: "hidden",
                  transition: "border-color 0.2s"
                }}>
                  <div onClick={() => toggle(table.name)} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 16px", cursor: "pointer",
                    borderLeft: `3px solid ${table.color}`,
                    background: isOpen ? COLORS.cardHover : "transparent"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: table.color }}>{table.schema}.</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{table.name}</span>
                      <Badge text={table.phase} color={table.phase === "Phase 1" ? COLORS.green : COLORS.yellow} />
                      <span style={{ fontSize: 10, color: COLORS.textMuted }}>{table.columns.length} cols</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: COLORS.textDim }}>{table.desc}</span>
                      <span style={{ fontSize: 12, color: COLORS.textMuted, transform: isOpen ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}>▶</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: COLORS.bg }}>
                            {["Column", "Type", "Constraint", "Description"].map(h => (
                              <th key={h} style={{
                                padding: "6px 12px", textAlign: "left", fontSize: 9,
                                color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1,
                                borderBottom: `1px solid ${COLORS.border}`
                              }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((col, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                              <td style={{ padding: "5px 12px", fontSize: 11 }}>
                                <span style={{ fontWeight: col.pk ? 700 : 400, color: col.pk ? COLORS.yellow : col.fk ? COLORS.cyan : COLORS.text }}>
                                  {col.name}
                                </span>
                              </td>
                              <td style={{ padding: "5px 12px" }}>
                                <span style={{
                                  fontSize: 10, padding: "1px 5px", borderRadius: 3,
                                  background: col.type === "JSONB" ? COLORS.purple + "22" : COLORS.bg,
                                  color: col.type === "JSONB" ? COLORS.purple : COLORS.textMuted
                                }}>{col.type}</span>
                              </td>
                              <td style={{ padding: "5px 12px" }}>
                                {col.pk && <Badge text="PK" color={COLORS.yellow} />}
                                {col.fk && <Badge text={`FK → ${col.fk}`} color={COLORS.cyan} />}
                              </td>
                              <td style={{ padding: "5px 12px", fontSize: 10, color: COLORS.textDim }}>{col.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "relationships" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.textMuted, marginBottom: 12 }}>
                Entity Relationships
              </div>
              {relationships.map((rel, i) => {
                const fromT = tables.find(t => t.name === rel.from);
                const toT = tables.find(t => t.name === rel.to);
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                    borderBottom: i < relationships.length - 1 ? `1px solid ${COLORS.border}22` : "none"
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: fromT?.color, minWidth: 120 }}>{rel.from}</span>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: COLORS.accent + "22", color: COLORS.accent, fontWeight: 700 }}>{rel.label}</span>
                    <span style={{ color: COLORS.textDim, fontSize: 12 }}>→</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: toT?.color, minWidth: 120 }}>{rel.to}</span>
                    <span style={{ fontSize: 9, color: COLORS.textDim, marginLeft: "auto" }}>{rel.desc}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.textMuted, marginBottom: 12 }}>
                Schema Organization
              </div>
              {[
                { schema: "public", tables: ["deals", "checklist_items", "team_members", "risk_alerts", "tsa_services"], desc: "Core transactional data", color: COLORS.accent },
                { schema: "config", tables: ["risk_rules", "guidance_library"], desc: "Pre-loaded reference data (from Training Model Framework)", color: COLORS.orange },
                { schema: "audit", tables: ["status_history"], desc: "Immutable event log (append-only)", color: COLORS.yellow },
                { schema: "agents", tables: ["agent_state"], desc: "Phase 2+ agent memory and state", color: COLORS.purple },
              ].map((s, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: s.color }}>{s.schema}</span>
                    <span style={{ fontSize: 9, color: COLORS.textDim }}>{s.desc}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                    {s.tables.map(t => {
                      const tbl = tables.find(x => x.name === t);
                      return (
                        <span key={t} style={{
                          padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: (tbl?.color || COLORS.accent) + "18",
                          color: tbl?.color || COLORS.accent,
                          border: `1px solid ${(tbl?.color || COLORS.accent)}33`
                        }}>{t}</span>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: COLORS.bg, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.cyan, marginBottom: 6 }}>KEY DESIGN DECISIONS</div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.7 }}>
                  <div>• <strong style={{ color: COLORS.purple }}>JSONB-heavy</strong> — Flexible schema for jurisdictions, dependencies, SLA metrics, risk indicators, agent state</div>
                  <div>• <strong style={{ color: COLORS.yellow }}>Event-sourced audit</strong> — status_history is append-only, enables full timeline reconstruction</div>
                  <div>• <strong style={{ color: COLORS.green }}>Row-level security</strong> — Neon RLS per deal_id isolates deal team access</div>
                  <div>• <strong style={{ color: COLORS.accent }}>Materialized views</strong> — Pre-computed for dashboard: workstream_progress, risk_summary, milestone_status</div>
                  <div>• <strong style={{ color: COLORS.cyan }}>Branching</strong> — Neon database branching for dev/staging/test per deal scenario</div>
                  <div>• <strong style={{ color: COLORS.orange }}>Scale-to-zero</strong> — Neon serverless: no cost when deal is inactive</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {viewMode === "sql" && (
          <div style={{ padding: 16, borderRadius: 8, background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.textMuted, marginBottom: 12 }}>
              Sample DDL — Core Tables (Phase 1)
            </div>
            <pre style={{
              background: COLORS.bg, padding: 16, borderRadius: 6, fontSize: 11,
              lineHeight: 1.6, overflow: "auto", color: COLORS.textMuted,
              border: `1px solid ${COLORS.border}`
            }}>
{`-- ============================================
-- M&A Integration Engine — Neon Postgres DDL
-- Phase 1 MVP Schema (v1.0 Beta)
-- ============================================

CREATE SCHEMA IF NOT EXISTS config;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS agents;

-- ENUMS
CREATE TYPE deal_structure_enum AS ENUM (
  'stock_purchase','asset_purchase','merger_forward',
  'merger_reverse','carve_out','f_reorg'
);
CREATE TYPE integration_model_enum AS ENUM (
  'fully_integrated','hybrid','standalone'
);
CREATE TYPE tsa_required_enum AS ENUM ('yes','no','tbd');
CREATE TYPE priority_enum AS ENUM ('critical','high','medium','low');
CREATE TYPE item_status_enum AS ENUM (
  'not_started','in_progress','blocked','complete','na'
);
CREATE TYPE risk_severity_enum AS ENUM ('critical','high','medium','low');

-- CORE DEAL TABLE
CREATE TABLE deals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  deal_structure deal_structure_enum NOT NULL,
  integration_model integration_model_enum NOT NULL,
  close_date    DATE NOT NULL,
  cross_border  BOOLEAN DEFAULT FALSE,
  jurisdictions JSONB DEFAULT '[]',
  tsa_required  tsa_required_enum DEFAULT 'tbd',
  industry_sector VARCHAR(50),
  shared_services JSONB DEFAULT '[]',
  deal_value_range VARCHAR(20),
  target_entities INTEGER,
  target_gaap   VARCHAR(20),
  target_erp    VARCHAR(50),
  buyer_maturity VARCHAR(30),
  acquirer_gaap VARCHAR(20),
  acquirer_fye  DATE,
  status        VARCHAR(20) DEFAULT 'pre_close',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- CHECKLIST ITEMS (instantiated per deal)
CREATE TABLE checklist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES deals(id),
  item_id         VARCHAR(10) NOT NULL,  -- FRC-0001..FRC-0443
  workstream      VARCHAR(50) NOT NULL,
  section         VARCHAR(100),
  description     TEXT NOT NULL,
  phase           VARCHAR(20) NOT NULL,
  milestone_date  DATE,
  priority        priority_enum DEFAULT 'medium',
  status          item_status_enum DEFAULT 'not_started',
  owner_id        UUID REFERENCES team_members(id),
  dependencies    JSONB DEFAULT '[]',
  tsa_relevant    BOOLEAN DEFAULT FALSE,
  cross_border_flag BOOLEAN DEFAULT FALSE,
  risk_indicators JSONB DEFAULT '[]',
  ai_guidance     TEXT,
  notes           JSONB DEFAULT '[]',
  evidence_url    VARCHAR(500),
  blocked_reason  TEXT,
  na_justification TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, item_id)
);

-- INDEX: fast lookups for dashboard queries
CREATE INDEX idx_checklist_deal_status 
  ON checklist_items(deal_id, status);
CREATE INDEX idx_checklist_deal_workstream 
  ON checklist_items(deal_id, workstream);
CREATE INDEX idx_checklist_milestone 
  ON checklist_items(deal_id, milestone_date);

-- AUDIT LOG (append-only)
CREATE TABLE audit.status_history (
  id                BIGSERIAL PRIMARY KEY,
  checklist_item_id UUID NOT NULL,
  deal_id           UUID NOT NULL,
  old_status        VARCHAR(20),
  new_status        VARCHAR(20) NOT NULL,
  changed_by        UUID,
  reason            TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGER: auto-log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit.status_history 
      (checklist_item_id, deal_id, old_status, new_status)
    VALUES (NEW.id, NEW.deal_id, OLD.status, NEW.status);
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_status_change
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- ROW LEVEL SECURITY (per deal team)
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_alerts ENABLE ROW LEVEL SECURITY;

-- MATERIALIZED VIEW: dashboard aggregation
CREATE MATERIALIZED VIEW workstream_progress AS
SELECT 
  deal_id, workstream,
  COUNT(*) FILTER (WHERE status != 'na') as total,
  COUNT(*) FILTER (WHERE status = 'complete') as complete,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked,
  COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'complete') 
    / NULLIF(COUNT(*) FILTER (WHERE status != 'na'), 0), 1) 
    as pct_complete
FROM checklist_items
GROUP BY deal_id, workstream;`}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 24, padding: "12px 0", borderTop: `1px solid ${COLORS.border}`,
          display: "flex", justifyContent: "space-between", fontSize: 9, color: COLORS.textDim
        }}>
          <span>M&A Integration Engine — Neon Data Model v1.0 Beta</span>
          <span>9 Tables | 3 Schemas | 18 JSONB columns | Phase 1-3 Progressive Build</span>
        </div>
      </div>
    </div>
  );
}
