# DealMapper — Master Feature & Workflow Index

> Navigation reference for the DealMapper AI Agent. Use this to understand every feature, tab, and workflow available in the application so you can guide users precisely.

---

## APP STATE FLOWS

```
Landing
  ├── + New Deal → Intake Wizard → Generating (1.2s) → Dashboard
  ├── Resume Local Draft → Dashboard
  ├── Resume Latest Deal → Dashboard
  └── View All Deals → Deal Portfolio → Open Deal → Dashboard

Dashboard (8 tabs)
  └── ← Deal Portfolio (reset/switch deal)
```

---

## TABS QUICK REFERENCE

| Tab ID | Label | Purpose |
|---|---|---|
| `live_status` | Live Status | KPI cards, workstream RAG, burndown chart, dependency matrix |
| `checklist` | Checklist Maintenance | Full item list, filters, add/edit items, bulk actions |
| `team` | Team Assignments | Roster management, workload view, permission levels |
| `risks` | Risk & Dependencies | Risk register, add risks, dependency linking |
| `timeline` | Timeline | Phase milestones, per-workstream phase breakdown |
| `steerco` | SteerCo | Narrative drafting, AI compilation, slide deck, snapshots |
| `admin` | Admin | Deal settings, export/import, audit log, API status |
| `agent` | ✦ Agent | Permissions matrix, prompt library, skills, synthesized documents |

---

## TAB DETAILS

### Live Status
**Access:** default tab on load  
**Shows:**
- KPI cards: Total Items, % Complete, In Progress, Blocked, Overdue, Critical
- Workstream RAG grid (24 cards): red/amber/green auto-computed from blocked %, past-due %, completion %; RAG override available per workstream
- SVG Progress Chart: stacked horizontal bars per workstream (complete/in-progress/blocked)
- SVG Burndown Chart: completed vs remaining trend across snapshots (requires 2+ snapshots)
- Dependency matrix: cross-workstream dependency counts (red >3, blue 1–3)
- RAG trend sparklines: last 8 snapshots per workstream

**Key actions:**
- Click workstream card → detail panel (items, narrative, key risks, next steps, RAG override)
- "Capture Progress" button → `generate_snapshot`
- Edit narrative → updates `deal.progressSnapshots`

**Agent can:** `navigate_tab("live_status")`, `generate_snapshot`

---

### Checklist Maintenance
**Access:** `activeTab === "checklist"`  
**Shows:**
- Filter bar: Phase, Workstream, Priority, Status, Owner, Search text
- Saved filter chips (apply saved filter sets with one click)
- Checklist table: ID, Workstream, Task, Phase, Priority, Status, Owner
- Right-side detail panel (340px) when item selected: full fields + notes + attachments + AI guidance

**Filters available:**
- Phase: `all | pre_close | day_1 | day_30 | day_60 | day_90 | year_1`
- Status: `all | not_started | in_progress | blocked | complete | na | overdue`
- Priority: `all | critical | high | medium | low`
- Workstream: `all | [24 workstream names]`
- Owner: `all | unassigned | [team member IDs]`
- Search: free text on description

**Add Item form fields:** Description, Workstream (+ custom), Section/Category, Phase, Priority, Status, Owner

**Edit Item (detail pane):** click "✎ Edit" → edit Description, Workstream, Phase, Section → Save

**Bulk operations:** select checkboxes → bulk status change dropdown, bulk assign dropdown

**Export:** "📥 Export CSV" downloads current filtered view

**Agent can:** `filter_checklist(...)`, `update_item_status(itemId, status)`, `assign_owner(itemId, ownerId)`, `bulk_assign_owner(itemIds[], ownerId)`

---

### Team Assignments
**Access:** `activeTab === "team"`  
**Shows:**
- Team roster cards: name, role, email, permission level
- Workload table: per person — completed, in-progress, blocked, total, % complete, workstreams

**Permission levels:** `admin | imo_lead | workstream_lead | viewer | external`

**Key actions:** Add person (name, role, email), Edit person, Delete person, Change permission level

**Agent can:** `navigate_tab("team")`

---

### Risk & Dependencies
**Access:** `activeTab === "risks"`  
**Shows:**
- Risk cards: auto-detected (8 categories) + manual risks
  - Severity: critical / high / medium / low
  - Status: open / acknowledged / mitigated / closed
  - Mitigation strategy, linked items, notes
- Dependency matrix (cross-workstream)
- Per-item dependency links with type classification

**Risk categories:** `regulatory_delay | tax_structure_leakage | tsa_dependency | data_privacy_breach | cultural_integration | financial_reporting_gap | stranded_costs | it_integration_risk`

**Dependency types:** `predecessor | internal_analysis | external_sme | data_aggregation | validation_required | key_decision | other`

**Key actions:** Add risk, Update risk status, Add dependency, Remove dependency

**Agent can:** `navigate_tab("risks")`

---

### Timeline
**Access:** `activeTab === "timeline"`  
**Shows:**
- Phase bars: Pre-Close → Day 1 → Day 30 → Day 60 → Day 90 → Year 1
- Calculated dates based on `deal.intake.closeDate`
- Per-phase: item count, % complete, color progress bar
- Grouped by workstream: expand/collapse, items per phase, RAG status

**Agent can:** `navigate_tab("timeline")`

---

### SteerCo
**Access:** `activeTab === "steerco"` (green accent)  
**Workflow stages:** Input Complete → IMO Review → AI Compilation

**Narrative fields (10):**
`overallStatus | keyIssues | keyDelays | keyFindings | materialImpacts | materialDependencies | materialOperationalImpacts | keyDecisionsEscalations | financialImpacts | overallBudget`

**Report Drafter actions:**
- "Draft All Narratives" → AI drafts all 10 sections
- "Generate Executive Summary" → AI-composed summary
- "Run Pressure Test" → completeness score, consistency issues, McKinsey/Bain assessment
- Iteration chat: prompt to refine individual sections

**Slide deck:** "Generate Slide Deck" → PPTX with title, exec summary, per-workstream slides, risk summary, appendix

**Snapshots:** "Capture Snapshot" → saves workstream/owner/summary state for trend analysis

**Agent can:** `navigate_tab("steerco")`, `draft_report`, `generate_snapshot`, `synthesize_document(docType)`

---

### Admin
**Access:** `activeTab === "admin"`  
**Sections:**
- **A. Deal Settings:** name, structure, model, close date, functional scope, cross-border, TSA, deal status
- **B. Team & Permissions:** roster, per-person permission level
- **C. Database Management:** Force Save, Export JSON, Import JSON, Reset Deal
- **D. Audit Log:** timestamped change history
- **E. System Info:** app version, API status (test button), localStorage size

**Agent can:** `navigate_tab("admin")`

---

### Agent Admin (✦ Agent)
**Access:** `activeTab === "agent"`  
**Sub-tabs:**

| Sub-tab | What it manages |
|---|---|
| Permissions | Role × action-type matrix (toggle allow/deny per role) |
| Prompt Library | Saved prompt templates; "Use" injects into chat |
| Skills | Named multi-step workflows; invoked via `run_skill` |
| Documents | Synthesized docs (download, preview, delete) |

**Agent can:** `navigate_tab("agent")`, `run_skill(skillName)`, `synthesize_document(docType)`, `save_document(...)`

---

## AGENT CHAT PANEL

**Access:** floating ✦ button, bottom-right corner  
**Panel:** 420px slide-over, full height, slides from right

**Panel features:**
- 📚 Library dropdown: quick-insert saved prompts without leaving chat
- Suggested prompts (empty state): "Show me all blocked items", "What is our completion rate by workstream?", "Draft the SteerCo report", "Generate a progress snapshot"
- Action chips below assistant messages: show what actions were executed
- Unread badge on button when panel closed

**Context sent to Claude on each message:**
- Active tab, active filters, KPIs
- Deal name, structure, model, close date
- Team roster with IDs
- Checklist summary (up to 50 items: id, itemId, workstream, status, description)
- Full deal summary (compressed, 2000 chars max)

---

## ALL AGENT ACTIONS

| Action | Parameters | Effect |
|---|---|---|
| `navigate_tab` | `tab: "live_status"\|"checklist"\|"team"\|"risks"\|"timeline"\|"steerco"\|"admin"\|"agent"` | Switches active tab |
| `filter_checklist` | `workstream?, status?, priority?, phase?, owner?, searchText?` | Applies filters + navigates to checklist |
| `update_item_status` | `itemId: UUID, status: "not_started"\|"in_progress"\|"blocked"\|"complete"\|"na"` | Updates one item's status |
| `assign_owner` | `itemId: UUID, ownerId: UUID\|null` | Assigns or clears owner on one item |
| `bulk_assign_owner` | `itemIds: UUID[], ownerId: UUID` | Assigns many items to one person |
| `draft_report` | — | Navigates to SteerCo + opens Report Drafter |
| `generate_snapshot` | — | Captures progress snapshot for burndown trending |
| `synthesize_document` | `docType: "status_report"\|"risk_memo"\|"task_report"\|"csv_export", title?` | Triggers two-pass AI synthesis; auto-converts to `save_document` |
| `save_document` | `title, content, docType, format: "markdown"\|"text"\|"csv"` | Persists doc to Vercel Blob + DB |
| `run_skill` | `skillName: string` | Fetches skill steps from DB; second Claude call expands to actions |

---

## DOCUMENT SYNTHESIS

**Invoke:** ask agent to "generate a status report", "create a risk memo", "export checklist as CSV", etc.  
**Flow:** `synthesize_document` action → server fetches full deal from DB → builds prompt → Claude call → `save_document` → appears in Agent → Documents panel

| Doc Type | Content | Format |
|---|---|---|
| `status_report` | KPIs, workstream breakdown, blocked items, risks, next steps | Markdown |
| `risk_memo` | Risk register, severity breakdown, mitigations, trajectory | Markdown |
| `task_report` | Per-owner task lists, by priority/status | Markdown |
| `csv_export` | All checklist items: ID, workstream, status, owner, dates | CSV |

---

## SKILLS SYSTEM

**Define:** Agent tab → Skills → "New Skill" → name + ordered steps  
**Invoke:** tell agent "run skill: [name]"  
**Execution:** server fetches steps → injects as numbered instructions → second Claude call → returns action sequence

**Example skill — "Weekly Checkpoint":**
1. Generate a progress snapshot
2. Filter checklist to overdue items
3. Navigate to SteerCo tab
4. Draft the SteerCo report

---

## INTAKE WIZARD — SCOPE DRIVERS

These fields control which checklist items are generated:

| Field | Effect |
|---|---|
| `functionalScope` | Activates/deactivates functional workstreams (Finance=7 WS, IT=6 WS, etc.) |
| `tsaRequired=yes` | Activates TSA Assessment workstream; marks TSA items active |
| `tsaRequired=no` | TSA items marked N/A automatically |
| `crossBorder=true` | Activates regulatory/compliance workstreams; triggers Regulatory Delay risk |
| `industrySector=Healthcare` | Elevates data privacy risk; activates sector-specific items |
| `dealValueRange=>$5B` | Increases complexity score; activates governance-heavy items |
| `buyerMaturity=first-time` | Adds extra governance + IMO setup items |
| `targetErp=SAP/Oracle` | Activates specific ERP migration items in IT workstream |

---

## WORKSTREAMS (24 total)

**Finance Track (7):** TSA, Technical Accounting, Financial Reporting & Consolidation, FP&A, Operational Finance, Income Tax, Treasury

**Controls & Governance (2):** Controls, Governance & Compliance

**IT Track (6):** IT Strategy & Governance, IT > Enterprise Systems, IT > Infrastructure, IT > Data & Analytics, IT > IT Vendor Management, IT > Client-Facing & Digital

**Other (8):** ESG, Integration Management, Facilities, Human Resources, Legal, Communications

**Custom workstreams** (user-defined): R&D, Commercial, Supply Chain, Customer Success, or any free-text entry

---

## PERSISTENCE MODEL

| Layer | Trigger | Latency |
|---|---|---|
| `localStorage` | Every state change | Immediate |
| Neon PostgreSQL | Debounced 2s after last change | ~2–4s |
| Vercel Blob | On synthesized document save | ~1–3s |

Save status indicator: `idle → saving → saved → error` (visible in nav bar)

---

## AI GUIDANCE (per item)

**Access:** select any checklist item → "AI →" button in row or click row → detail pane → guidance loads  
**Source:** `/api/ai-guidance` (Claude claude-haiku-4-5-20251001)  
**Context sent:** item description, workstream, phase, priority, status, deal structure, integration model, cross-border, TSA, sector  
**Returns:** actionable guidance text (risks, coordination needs, sequencing advice)

**SteerCo AI modes:**
- `draft_all` — drafts all 10 narrative sections
- `executive_summary` — standalone exec summary
- `pressure_test` — completeness, consistency, McKinsey/Bain assessment + prospective insights

---

## STATUS & PRIORITY VALUES

**Statuses:** `not_started` · `in_progress` · `blocked` · `complete` · `na`  
**Priorities:** `critical` · `high` · `medium` · `low`  
**Phases:** `pre_close` · `day_1` · `day_30` · `day_60` · `day_90` · `year_1`  
**RAG:** `red` · `amber` · `green` (auto-computed or manually overridden)

---

## PERMISSION ROLES

| Role | Capabilities |
|---|---|
| `admin` | Full access — all actions, settings, imports |
| `imo_lead` | Checklist edits, narratives, synthesis, snapshots |
| `workstream_lead` | Own workstream edits, assign owners, draft reports |
| `viewer` | Navigate + filter only; no mutations |
| `external` | No app actions |

---

*Last updated: auto-generated from repo scan — April 2026*
