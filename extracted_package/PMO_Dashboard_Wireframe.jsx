import { useState } from "react";

const COLORS = {
  navy: "#0F1B2D",
  deepBlue: "#1B2A4A",
  midBlue: "#2D4A7A",
  accent: "#3B82F6",
  accentLight: "#60A5FA",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  muted: "#64748B",
  surface: "#F8FAFC",
  surfaceDark: "#0F172A",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  white: "#FFFFFF",
};

const workstreams = [
  { name: "TSA Assessment & Exit", items: 70, complete: 12, inProgress: 8, blocked: 2, notStarted: 48, phase: "Day 1" },
  { name: "Consolidation & Reporting", items: 52, complete: 22, inProgress: 15, blocked: 1, notStarted: 14, phase: "Day 1" },
  { name: "Operational Accounting", items: 68, complete: 8, inProgress: 12, blocked: 3, notStarted: 45, phase: "Day 1" },
  { name: "Internal Controls & SOX", items: 44, complete: 5, inProgress: 6, blocked: 0, notStarted: 33, phase: "Day 30" },
  { name: "Income Tax & Compliance", items: 38, complete: 3, inProgress: 4, blocked: 1, notStarted: 30, phase: "Day 1" },
  { name: "Treasury & Banking", items: 32, complete: 18, inProgress: 7, blocked: 0, notStarted: 7, phase: "Day 1" },
  { name: "FP&A & Baselining", items: 28, complete: 2, inProgress: 3, blocked: 0, notStarted: 23, phase: "Day 60" },
  { name: "Cybersecurity & Data Privacy", items: 36, complete: 10, inProgress: 8, blocked: 2, notStarted: 16, phase: "Day 1" },
  { name: "ESG & Sustainability", items: 22, complete: 1, inProgress: 2, blocked: 0, notStarted: 19, phase: "Day 90" },
  { name: "Integration Budget & PMO", items: 35, complete: 14, inProgress: 9, blocked: 1, notStarted: 11, phase: "Day 1" },
  { name: "Facilities & Real Estate", items: 18, complete: 6, inProgress: 3, blocked: 0, notStarted: 9, phase: "Day 30" },
];

const risks = [
  { id: 1, category: "Regulatory Delay", severity: "Critical", description: "CFIUS filing pending — 3 jurisdictions require review. Close date < 6 months.", workstream: "Income Tax" },
  { id: 2, category: "TSA Dependency", severity: "High", description: "IT Infrastructure TSA >12 months. No standalone capability assessment complete.", workstream: "TSA Assessment" },
  { id: 3, category: "Data Privacy Breach", severity: "High", description: "Target processes EU personal data. No DPIA initiated. AI systems in scope.", workstream: "Cybersecurity" },
  { id: 4, category: "Financial Reporting Gap", severity: "High", description: "Target uses IFRS; acquirer US GAAP. >5 entities with separate ledgers.", workstream: "Consolidation" },
  { id: 5, category: "Tax Structure Leakage", severity: "Medium", description: "2 jurisdictions ETR <15%. Pillar Two top-up tax analysis not started.", workstream: "Income Tax" },
];

const milestones = [
  { date: "Apr 15", label: "Day 1 / Close", status: "upcoming", daysOut: 62 },
  { date: "May 15", label: "Day 30 Check", status: "future", daysOut: 92 },
  { date: "Jun 14", label: "Day 60 Review", status: "future", daysOut: 122 },
  { date: "Jul 14", label: "Day 90 SteerCo", status: "future", daysOut: 152 },
  { date: "Apr 15, '27", label: "Year 1 Close-Out", status: "future", daysOut: 427 },
];

const dealProfile = {
  name: "Project Meridian",
  structure: "Reverse Triangular Merger",
  model: "Fully Integrated",
  crossBorder: true,
  jurisdictions: ["US", "EU (DE, NL)", "UK"],
  tsa: "Yes — 6 services",
  sector: "Technology",
  value: "$1B–$5B",
  entities: "12",
  closeDate: "April 15, 2026",
};

function ProgressBar({ value, max, color = COLORS.accent, height = 6 }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ width: "100%", height, background: "#1E293B", borderRadius: 3, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s ease" }} />
    </div>
  );
}

function SeverityBadge({ severity }) {
  const c = severity === "Critical" ? COLORS.danger : severity === "High" ? COLORS.warning : COLORS.accent;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      background: c + "22", color: c, fontSize: 11, fontWeight: 600, letterSpacing: 0.5
    }}>
      {severity.toUpperCase()}
    </span>
  );
}

function StatusDot({ color, count, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.textMuted }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
      <span style={{ fontWeight: 600, color: COLORS.text, minWidth: 16 }}>{count}</span>
      <span>{label}</span>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedWs, setSelectedWs] = useState(null);

  const totalItems = workstreams.reduce((s, w) => s + w.items, 0);
  const totalComplete = workstreams.reduce((s, w) => s + w.complete, 0);
  const totalInProgress = workstreams.reduce((s, w) => s + w.inProgress, 0);
  const totalBlocked = workstreams.reduce((s, w) => s + w.blocked, 0);
  const overallPct = Math.round((totalComplete / totalItems) * 100);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.surfaceDark} 100%)`,
      color: COLORS.text, minHeight: "100vh", padding: 0
    }}>
      {/* ===== TOP NAV ===== */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.navy + "CC", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: COLORS.white
          }}>M</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>M&A Integration Engine</div>
            <div style={{ fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 }}>{dealProfile.name} — Phase 1 MVP Wireframe</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {["overview", "checklist", "risks", "timeline"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
              background: activeTab === tab ? COLORS.accent : "transparent",
              color: activeTab === tab ? COLORS.white : COLORS.textMuted,
              fontSize: 11, fontWeight: 600, letterSpacing: 0.8, textTransform: "uppercase",
              transition: "all 0.2s"
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ===== DEAL CONTEXT BAR ===== */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12,
          padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, marginBottom: 20
        }}>
          {[
            ["Structure", dealProfile.structure],
            ["Model", dealProfile.model],
            ["Close Date", dealProfile.closeDate],
            ["Cross-Border", dealProfile.jurisdictions.join(", ")],
            ["TSA", dealProfile.tsa],
            ["Sector", dealProfile.sector],
            ["Value", dealProfile.value],
            ["Entities", dealProfile.entities],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{val}</div>
            </div>
          ))}
        </div>

        {activeTab === "overview" && (
          <>
            {/* ===== KPI CARDS ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Overall Progress", value: `${overallPct}%`, sub: `${totalComplete} of ${totalItems} items`, color: COLORS.accent },
                { label: "In Progress", value: totalInProgress, sub: "items actively being worked", color: COLORS.accentLight },
                { label: "Blocked Items", value: totalBlocked, sub: "require escalation", color: totalBlocked > 5 ? COLORS.danger : COLORS.warning },
                { label: "Active Risks", value: risks.length, sub: `${risks.filter(r => r.severity === "Critical").length} critical`, color: COLORS.danger },
              ].map((kpi, i) => (
                <div key={i} style={{
                  padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}`,
                  borderLeft: `3px solid ${kpi.color}`
                }}>
                  <div style={{ fontSize: 9, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                  <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* ===== WORKSTREAM HEAT MAP + RISKS ===== */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>
              {/* Workstream Progress */}
              <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: COLORS.textMuted }}>
                  Workstream Progress
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {workstreams.map((ws, i) => {
                    const pct = Math.round((ws.complete / ws.items) * 100);
                    const barColor = ws.blocked > 0 ? COLORS.warning : pct > 50 ? COLORS.success : COLORS.accent;
                    return (
                      <div key={i} onClick={() => setSelectedWs(selectedWs === i ? null : i)}
                        style={{ cursor: "pointer", padding: "8px 10px", borderRadius: 6,
                          background: selectedWs === i ? COLORS.deepBlue : "transparent",
                          border: `1px solid ${selectedWs === i ? COLORS.accent + "44" : "transparent"}`,
                          transition: "all 0.2s"
                        }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{ws.name}</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: COLORS.textMuted }}>{ws.phase}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>{pct}%</span>
                          </div>
                        </div>
                        <ProgressBar value={ws.complete} max={ws.items} color={barColor} />
                        {selectedWs === i && (
                          <div style={{ display: "flex", gap: 12, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${COLORS.border}` }}>
                            <StatusDot color={COLORS.success} count={ws.complete} label="Done" />
                            <StatusDot color={COLORS.accent} count={ws.inProgress} label="Active" />
                            <StatusDot color={COLORS.danger} count={ws.blocked} label="Blocked" />
                            <StatusDot color={COLORS.muted} count={ws.notStarted} label="Pending" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Risk Panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: COLORS.textMuted }}>
                    Active Risk Register
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {risks.map(risk => (
                      <div key={risk.id} style={{
                        padding: 10, borderRadius: 6, background: COLORS.deepBlue,
                        border: `1px solid ${risk.severity === "Critical" ? COLORS.danger + "44" : COLORS.border}`
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{risk.category}</span>
                          <SeverityBadge severity={risk.severity} />
                        </div>
                        <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.4 }}>{risk.description}</div>
                        <div style={{ fontSize: 9, color: COLORS.accent, marginTop: 4 }}>{risk.workstream}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestone Timeline */}
                <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, color: COLORS.textMuted }}>
                    Milestones
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {milestones.map((ms, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: ms.status === "upcoming" ? COLORS.warning : COLORS.muted,
                          boxShadow: ms.status === "upcoming" ? `0 0 8px ${COLORS.warning}66` : "none"
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>{ms.label}</div>
                          <div style={{ fontSize: 9, color: COLORS.textMuted }}>{ms.date}</div>
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3,
                          background: ms.daysOut < 90 ? COLORS.warning + "22" : COLORS.cardBg,
                          color: ms.daysOut < 90 ? COLORS.warning : COLORS.textMuted
                        }}>
                          {ms.daysOut}d
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "checklist" && (
          <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: COLORS.textMuted }}>
              Dynamic Checklist — Sample Items (FRC-0001 to FRC-0010)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${COLORS.border}` }}>
                  {["ID", "Workstream", "Task", "Phase", "Priority", "Status", "Owner", "Risk"].map(h => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", color: COLORS.textMuted, fontSize: 9, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["FRC-0001", "TSA Assessment", "Identify all shared services requiring TSA coverage", "Day 1", "Critical", "In Progress", "J. Chen", "TSA_dep"],
                  ["FRC-0002", "TSA Assessment", "Define SLA metrics for each TSA service", "Day 1", "High", "Not Started", "—", ""],
                  ["FRC-0003", "TSA Assessment", "Establish TSA pricing model (cost-plus baseline)", "Day 1", "High", "Not Started", "—", ""],
                  ["FRC-0004", "TSA Assessment", "Map TSA exit milestones by service category", "Day 1", "Critical", "In Progress", "J. Chen", "TSA_dep"],
                  ["FRC-0005", "Consolidation", "Map target COA to acquirer COA structure", "Day 1", "Critical", "In Progress", "M. Park", "Fin_gap"],
                  ["FRC-0006", "Consolidation", "Identify intercompany elimination entries", "Day 1", "High", "Blocked", "M. Park", "Fin_gap"],
                  ["FRC-0007", "Consolidation", "Configure consolidation journal entries", "Day 30", "High", "Not Started", "—", ""],
                  ["FRC-0008", "Operational Acctg", "Validate AP cutoff procedures at close", "Day 1", "Critical", "Complete", "R. Singh", ""],
                  ["FRC-0009", "Operational Acctg", "Establish intercompany billing process", "Day 1", "High", "In Progress", "R. Singh", ""],
                  ["FRC-0010", "Internal Controls", "Map target SOX controls to acquirer framework", "Day 30", "High", "Not Started", "—", ""],
                ].map((row, i) => {
                  const statusColor = row[5] === "Complete" ? COLORS.success : row[5] === "In Progress" ? COLORS.accent : row[5] === "Blocked" ? COLORS.danger : COLORS.muted;
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}22` }}>
                      <td style={{ padding: "6px", fontWeight: 700, color: COLORS.accent }}>{row[0]}</td>
                      <td style={{ padding: "6px", color: COLORS.textMuted }}>{row[1]}</td>
                      <td style={{ padding: "6px" }}>{row[2]}</td>
                      <td style={{ padding: "6px" }}><span style={{ padding: "1px 6px", borderRadius: 3, background: row[3] === "Day 1" ? COLORS.warning + "22" : COLORS.cardBg, color: row[3] === "Day 1" ? COLORS.warning : COLORS.textMuted, fontSize: 10 }}>{row[3]}</span></td>
                      <td style={{ padding: "6px" }}><span style={{ color: row[4] === "Critical" ? COLORS.danger : COLORS.warning, fontWeight: 600, fontSize: 10 }}>{row[4]}</span></td>
                      <td style={{ padding: "6px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} /><span style={{ color: statusColor, fontWeight: 600 }}>{row[5]}</span></span></td>
                      <td style={{ padding: "6px", color: row[6] === "—" ? COLORS.muted : COLORS.text }}>{row[6]}</td>
                      <td style={{ padding: "6px" }}>{row[7] && <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: COLORS.danger + "22", color: COLORS.danger }}>{row[7]}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: COLORS.deepBlue, border: `1px solid ${COLORS.accent}33` }}>
              <div style={{ fontSize: 10, color: COLORS.accent, fontWeight: 700, marginBottom: 4 }}>AI GUIDANCE — FRC-0006 (Blocked)</div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5 }}>
                This item is blocked because FRC-0005 (COA mapping) is still in progress. Have you identified all intercompany transactions that will be eliminated or repriced post-acquisition? For cross-border entities, ensure transfer pricing documentation covers all intercompany flows including management fees, IP royalties, and TSA service charges.
              </div>
            </div>
          </div>
        )}

        {activeTab === "risks" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: COLORS.textMuted }}>
                Risk Heat Map by Category
              </div>
              {["Regulatory Delay", "Tax Structure Leakage", "TSA Dependency", "Data Privacy Breach", "Cultural Integration", "Financial Reporting Gap", "Stranded Costs"].map((cat, i) => {
                const r = risks.find(x => x.category === cat);
                const level = r ? (r.severity === "Critical" ? 3 : r.severity === "High" ? 2 : 1) : 0;
                const levelColors = ["#1E293B", COLORS.accent, COLORS.warning, COLORS.danger];
                return (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 180, fontSize: 11, color: COLORS.text }}>{cat}</div>
                    <div style={{ display: "flex", gap: 3, flex: 1 }}>
                      {[1, 2, 3].map(l => (
                        <div key={l} style={{
                          flex: 1, height: 20, borderRadius: 3,
                          background: l <= level ? levelColors[l] + (l <= level ? "" : "33") : "#1E293B",
                          border: `1px solid ${COLORS.border}`,
                          transition: "all 0.3s"
                        }} />
                      ))}
                    </div>
                    <div style={{ width: 60, textAlign: "right" }}>
                      {r ? <SeverityBadge severity={r.severity} /> : <span style={{ fontSize: 10, color: COLORS.muted }}>Clear</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: COLORS.textMuted }}>
                Risk Detection Rules (Section 6 Taxonomy)
              </div>
              <div style={{ fontSize: 10, color: COLORS.textMuted, lineHeight: 1.6 }}>
                {[
                  "IF jurisdictions_requiring_filing > 3 → Flag Regulatory Delay (Critical)",
                  "IF any jurisdiction ETR < 15% → Flag Tax Structure Leakage (High)",
                  "IF TSA_duration > 12 months for any service → Flag TSA Dependency (High)",
                  "IF target_processes_EU_data AND no_DPIA → Flag Data Privacy Breach (High)",
                  "IF workforce_in_different_country > 30% → Flag Cultural Integration (Medium)",
                  "IF target_GAAP ≠ acquirer_GAAP → Flag Financial Reporting Gap (High)",
                  "IF deal_structure = 'Carve-Out' → Flag Stranded Costs (Medium)",
                ].map((rule, i) => (
                  <div key={i} style={{ padding: "6px 8px", marginBottom: 4, borderRadius: 4, background: COLORS.deepBlue, fontFamily: "'JetBrains Mono', monospace" }}>
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "timeline" && (
          <div style={{ padding: 16, borderRadius: 8, background: COLORS.cardBg, border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, color: COLORS.textMuted }}>
              Integration Timeline — Day 1 through Year 1
            </div>
            <div style={{ position: "relative", paddingLeft: 120 }}>
              {/* Timeline axis */}
              <div style={{ position: "absolute", left: 116, top: 0, bottom: 0, width: 2, background: COLORS.border }} />
              {[
                { phase: "Pre-Close", period: "Now → Apr 15", items: ["Complete intake form", "Generate dynamic checklist", "Assign workstream owners", "Begin Day 1 readiness items"], color: COLORS.accent },
                { phase: "Day 1", period: "Apr 15", items: ["Close execution", "Banking cutover", "Consolidation entries", "Internal controls assertion", "TSA activation"], color: COLORS.warning },
                { phase: "Day 1-30", period: "Apr 15 → May 15", items: ["First consolidated close", "AP/AR cutoff validation", "COA mapping completion", "Regulatory filing updates"], color: COLORS.accentLight },
                { phase: "Day 30-60", period: "May 15 → Jun 14", items: ["Statutory reporting setup", "Transfer pricing documentation", "TSA SLA monitoring begins", "First SteerCo report"], color: COLORS.success },
                { phase: "Day 60-90", period: "Jun 14 → Jul 14", items: ["GAAP conversion testing", "TSA exit readiness review", "Budget variance analysis", "Pillar Two ETR modeling"], color: COLORS.success },
                { phase: "Day 90-Year 1", period: "Jul 14 → Apr 15 '27", items: ["System migration execution", "TSA exits (by service)", "Full consolidation steady-state", "Post-integration audit", "Lessons learned / playbook update"], color: COLORS.muted },
              ].map((phase, i) => (
                <div key={i} style={{ display: "flex", marginBottom: 20, position: "relative" }}>
                  <div style={{ width: 100, textAlign: "right", paddingRight: 24, paddingTop: 2 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: phase.color }}>{phase.phase}</div>
                    <div style={{ fontSize: 9, color: COLORS.textMuted }}>{phase.period}</div>
                  </div>
                  <div style={{
                    position: "absolute", left: 110, top: 6, width: 14, height: 14, borderRadius: "50%",
                    background: COLORS.surfaceDark, border: `3px solid ${phase.color}`, zIndex: 1
                  }} />
                  <div style={{ flex: 1, paddingLeft: 24 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {phase.items.map((item, j) => (
                        <span key={j} style={{
                          padding: "3px 8px", borderRadius: 4, fontSize: 10,
                          background: phase.color + "18", color: phase.color, border: `1px solid ${phase.color}33`
                        }}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== FOOTER ===== */}
        <div style={{
          marginTop: 24, padding: "12px 0", borderTop: `1px solid ${COLORS.border}`,
          display: "flex", justifyContent: "space-between", fontSize: 9, color: COLORS.muted
        }}>
          <span>M&A Integration Engine — PMO Dashboard Wireframe v1.0 Beta</span>
          <span>Powered by Claude API + Neon + React  |  Phase 1 MVP  |  February 2026</span>
        </div>
      </div>
    </div>
  );
}
