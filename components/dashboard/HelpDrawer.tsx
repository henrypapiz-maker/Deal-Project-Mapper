"use client";

const C = {
  navy: "#0F1B2D", cardBg: "#1E293B", border: "#334155", text: "#F1F5F9",
  textMuted: "#94A3B8", accent: "#3B82F6", accentLight: "#60A5FA",
  success: "#10B981", warning: "#F59E0B", danger: "#EF4444",
};

type CalloutType = "info" | "tip" | "warning";
const CALLOUT_STYLES: Record<CalloutType, { bg: string; border: string; color: string; label: string }> = {
  info: { bg: "#3B82F615", border: "#3B82F6", color: "#60A5FA", label: "INFO" },
  tip: { bg: "#10B98115", border: "#10B981", color: "#34D399", label: "TIP" },
  warning: { bg: "#F59E0B15", border: "#F59E0B", color: "#FBBF24", label: "WARNING" },
};

function Callout({ type, children }: { type: CalloutType; children: React.ReactNode }) {
  const s = CALLOUT_STYLES[type];
  return (
    <div style={{
      padding: "8px 10px", borderRadius: 6, marginBottom: 6,
      background: s.bg, borderLeft: `3px solid ${s.border}`,
      fontSize: 10, lineHeight: 1.5, color: s.color,
    }}>
      <span style={{ fontWeight: 700, fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 6 }}>{s.label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function FuncList({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 14, fontSize: 10, lineHeight: 1.7, color: C.text }}>
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

const TAB_LABELS: Record<string, string> = {
  live_status: "Live Status",
  checklist: "Checklist Maintenance",
  team: "Team Assignments",
  risks: "Risk & Dependencies",
  timeline: "Timeline",
  steerco: "SteerCo",
};

interface HelpDrawerProps {
  activeTab: string;
  onClose: () => void;
}

export default function HelpDrawer({ activeTab, onClose }: HelpDrawerProps) {
  const renderContent = () => {
    switch (activeTab) {
      case "live_status":
        return (
          <>
            <Section title="Purpose">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                Real-time program health dashboard. The first view when entering a deal — shows overall progress, risks, milestones, and recent activity at a glance.
              </p>
            </Section>
            <Section title="Key Functions">
              <FuncList items={[
                "6 KPI cards — clickable to jump to filtered checklist",
                "Program Status banner with overall RAG indicator",
                "Workstream Progress bars — click to expand details",
                "Risk Register summary with severity badges",
                "Milestones with days-from-close countdown",
                "Recent Activity feed showing latest status changes",
                "Owner Workload distribution chart",
              ]} />
            </Section>
            <Section title="Tips & Notes">
              <Callout type="tip">Click any KPI card to jump directly to the filtered checklist view</Callout>
              <Callout type="tip">Click a workstream row to see its detailed breakdown</Callout>
              <Callout type="info">Overdue items are auto-calculated from milestone dates based on your close date</Callout>
              <Callout type="warning">KPI counts exclude N/A items — toggle &quot;Show N/A&quot; on the Checklist tab to see all items</Callout>
            </Section>
            <Section title="Dependencies">
              <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>
                Progress updates automatically when item statuses change on the Checklist tab. Risk counts reflect the Risk & Dependencies tab. Milestones derive from your deal close date.
              </p>
            </Section>
          </>
        );

      case "checklist":
        return (
          <>
            <Section title="Purpose">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                The master checklist — update statuses, assign priorities, add notes, and manage individual line items. This is where day-to-day integration work is tracked.
              </p>
            </Section>
            <Section title="Key Functions">
              <FuncList items={[
                "5 filter dropdowns (Phase, Workstream, Priority, Status, Owner)",
                "Text search across all item descriptions",
                "Column sort — click any header to sort ascending/descending",
                "Saved filter views (3 presets + custom views)",
                "\"+  New Task\" to add custom items beyond the template",
                "Export CSV for offline analysis",
                "Priority override per item (overrides auto-computed priority)",
                "Click any row → AI Guidance panel with notes + attachments",
                "Bulk select → multi-item status update",
                "Show N/A toggle to reveal excluded items",
              ]} />
            </Section>
            <Section title="Tips & Notes">
              <Callout type="tip">Use &quot;Day 1 Critical Path&quot; to focus on close-date critical items</Callout>
              <Callout type="tip">Bulk select items with checkboxes, then update status for all at once</Callout>
              <Callout type="info">Item ID prefixes indicate track: FIN- = Finance, CGV- = Controls, IT- = IT</Callout>
              <Callout type="info">Dependency chips below items are auto-generated from the master template</Callout>
              <Callout type="warning">Priority overrides are permanent — they replace the auto-computed priority</Callout>
              <Callout type="tip">Add notes by clicking a row, then typing in the Notes section of the guidance panel</Callout>
            </Section>
            <Section title="Dependencies">
              <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>
                Team members must be added on the Team Assignments tab before owners can be assigned to items.
              </p>
            </Section>
          </>
        );

      case "team":
        return (
          <>
            <Section title="Purpose">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                Manage the integration team roster and assign ownership of checklist items to specific people.
              </p>
            </Section>
            <Section title="Key Functions">
              <FuncList items={[
                "Add team members (Name, Role, Email)",
                "Team Roster table with assignment statistics",
                "Bulk Assignment by Workstream — assign all unassigned items at once",
                "Line-Item Assignment — assign or reassign individual items",
              ]} />
            </Section>
            <Section title="Tips & Notes">
              <Callout type="tip">Add all workstream leads first, then use Bulk Assignment to quickly assign entire workstreams</Callout>
              <Callout type="tip">Line-item assignment lets you reassign individual items after bulk assignment</Callout>
              <Callout type="info">The &quot;Unassigned&quot; KPI card on Live Status shows how many items still need owners</Callout>
              <Callout type="warning">Bulk assign only affects items with no current owner — it won&apos;t reassign already-owned items</Callout>
            </Section>
            <Section title="Dependencies">
              <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>
                People added here appear as owner options on the Checklist tab and in the Owner filter dropdown.
              </p>
            </Section>
          </>
        );

      case "risks":
        return (
          <>
            <Section title="Purpose">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                Active risk management and cross-workstream dependency tracking. Manage risks through their lifecycle and classify dependencies between checklist items.
              </p>
            </Section>
            <Section title="Key Functions">
              <FuncList items={[
                "Risk Register: view, add, manage risks (Open → Acknowledged → Mitigated → Closed)",
                "Risk severity badges (Critical, High, Medium, Low)",
                "Link risks to specific checklist items",
                "Management notes per risk for mitigation commentary",
                "Ad-Hoc Dependency Linking with 7 classification types",
                "Free-text detail field per dependency",
                "Risk Heat Map across 8 risk categories",
              ]} />
            </Section>
            <Section title="Dependency Types">
              <FuncList items={[
                "Predecessor — must complete first",
                "Internal Analysis Required",
                "External SME Analysis Required",
                "Data Aggregation / Normalization",
                "Validation Required",
                "Key Decision Needed",
                "Other",
              ]} />
            </Section>
            <Section title="Tips & Notes">
              <Callout type="tip">Use &quot;+ Add Risk&quot; to create manual risks beyond the auto-detected ones</Callout>
              <Callout type="tip">Link checklist items to risks to track which items are affected</Callout>
              <Callout type="info">Auto-detected risks are generated from your deal intake parameters (cross-border, structure, etc.)</Callout>
              <Callout type="info">Dependency types help classify WHY items are linked — this enriches SteerCo reporting</Callout>
              <Callout type="warning">Changing a risk status to &quot;Closed&quot; removes it from the active count on Live Status</Callout>
            </Section>
          </>
        );

      case "timeline":
        return (
          <>
            <Section title="Purpose">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                Visual phase-based timeline showing key integration milestones and activities. Use for roadmap presentations and dependency analysis.
              </p>
            </Section>
            <Section title="Key Functions">
              <FuncList items={[
                "6-phase vertical timeline (Pre-Close → Day 1 → Day 30 → Day 60 → Day 90 → Year 1)",
                "Key items displayed per phase (critical/high priority)",
                "Color-coded phase indicators",
                "Cross-Workstream Dependency Matrix (heatmap)",
              ]} />
            </Section>
            <Section title="Tips & Notes">
              <Callout type="info">Milestone dates are auto-calculated from your deal close date</Callout>
              <Callout type="info">The dependency matrix shows workstream coupling — red cells indicate high inter-dependency</Callout>
              <Callout type="tip">Use this view when presenting the integration roadmap to leadership</Callout>
            </Section>
            <Section title="Dependencies">
              <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5, margin: 0 }}>
                Timeline dates derived from close date set during Deal Setup. Items shown are filtered by phase assignment from the master checklist.
              </p>
            </Section>
          </>
        );

      case "steerco":
        return (
          <>
            <Section title="Purpose">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                Steering Committee reporting hub — bowler table, executive narrative, period snapshots, and export. This is where the IMO leader prepares and refines materials for leadership.
              </p>
            </Section>
            <Section title="Bowler Table">
              <FuncList items={[
                "Time-phased RAG grid showing program health over reporting periods",
                "4 view presets: Executive, IMO Dashboard, Workstream Detail, SteerCo Report",
                "Click track rows to expand/collapse workstreams",
                "Click any RAG cell to override status and add narrative",
                "\"Take Snapshot\" captures current state for historical comparison",
                "CSV Export for offline analysis",
              ]} />
            </Section>
            <Section title="Executive Narrative (10 Sections)">
              <FuncList items={[
                "Overall Status",
                "Key Issues",
                "Key Delays",
                "Key Findings",
                "Material Impacts",
                "Material Dependencies",
                "Material Operational Impacts",
                "Key Decisions & Escalations",
                "Financial Impacts",
                "Overall Budget & % Complete",
              ]} />
            </Section>
            <Section title="Tips & Notes">
              <Callout type="tip">Take a snapshot each reporting period to build historical trend data</Callout>
              <Callout type="tip">Use Executive view for leadership — shows only program and track-level RAGs</Callout>
              <Callout type="tip">IMO Dashboard view shows all workstreams expanded — best for weekly review</Callout>
              <Callout type="info">RAG overrides appear with a white border ring on the bowler table</Callout>
              <Callout type="info">Narratives are saved to the database and persist across sessions</Callout>
              <Callout type="warning">Bowler table requires the deal to be saved to the database (auto on creation)</Callout>
              <Callout type="tip">Use &quot;Load Previous&quot; to restore the last saved narrative when returning</Callout>
            </Section>
          </>
        );

      default:
        return (
          <>
            <Section title="Welcome to DealMapper">
              <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, margin: 0 }}>
                DealMapper is an M&A integration management platform. It generates a comprehensive integration program from your deal parameters and provides tools to track, manage, and report on integration progress.
              </p>
            </Section>
            <Section title="Recommended Workflow">
              <FuncList items={[
                "1. Deal Setup — Configure deal parameters (structure, model, close date, scope)",
                "2. Checklist Maintenance — Review items, update statuses, add notes",
                "3. Team Assignments — Add team members, assign workstream ownership",
                "4. Live Status — Monitor program health, track KPIs and risks",
                "5. Risk & Dependencies — Manage risks, create dependency links",
                "6. SteerCo — Generate reports, add narratives, export for leadership",
              ]} />
            </Section>
            <Section title="General Notes">
              <Callout type="info">All data auto-saves to your browser and syncs to the Neon database</Callout>
              <Callout type="tip">Use &quot;View All Deals&quot; from the landing page to switch between multiple deals</Callout>
              <Callout type="info">Click any checklist row to access Claude AI-powered contextual guidance</Callout>
            </Section>
          </>
        );
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 340, zIndex: 100,
      background: C.navy, borderLeft: `1px solid ${C.border}`,
      boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: C.cardBg, position: "sticky", top: 0, zIndex: 1,
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
            {TAB_LABELS[activeTab] || "Help & Guide"}
          </div>
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>
            Context-sensitive help
          </div>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
          background: "transparent", color: C.textMuted, fontSize: 16,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
      </div>

      {/* Content */}
      <div style={{ padding: 16, flex: 1 }}>
        {renderContent()}
      </div>

      {/* Footer */}
      <div style={{
        padding: "10px 16px", borderTop: `1px solid ${C.border}`,
        fontSize: 9, color: C.textMuted, textAlign: "center",
      }}>
        DealMapper v0.5.1 · Help updates with active tab
      </div>
    </div>
  );
}
