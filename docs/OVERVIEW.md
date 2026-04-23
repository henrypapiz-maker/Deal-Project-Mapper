# DealMapper — Product Overview
> *Source document for presentation generation. Each `##` section maps to a slide.*

---

## 1 · What is DealMapper?

DealMapper is an AI-powered M&A integration management platform that replaces spreadsheets, disconnected status emails, and manual SteerCo decks with a single real-time workspace.

**Built for:**
- IMO Leads managing post-close integration programs
- Workstream Leads tracking tasks across Finance, IT, HR, Legal, and more
- SteerCo participants who need Board-ready status reports in minutes

**Core promise:** From deal intake to Board presentation — in one tool, with AI doing the heavy lifting.

---

## 2 · The Problem It Solves

Traditional M&A integration management suffers from:

- **Scattered data** — status in spreadsheets, risks in emails, timelines in slide decks that are always out of date
- **Manual reporting** — 4–8 hours to compile a SteerCo deck that is stale by the time it's presented
- **No single source of truth** — workstream leads work in silos; blockers aren't visible until it's too late
- **No AI assistance** — consultants spend time writing status language instead of solving integration problems
- **Weak audit trail** — no timestamped change history, no trend data across periods

---

## 3 · How It Works — End-to-End Workflow

```
1. INTAKE (5 min)
   Enter deal name, structure, model, close date,
   functional scope, cross-border status, TSA requirement
          ↓
2. GENERATE (instant)
   AI decision tree produces a tailored checklist of
   400–500 integration tasks across 24 workstreams
          ↓
3. MANAGE (ongoing)
   Track tasks, assign owners, log blockers,
   capture progress snapshots weekly
          ↓
4. REPORT (minutes)
   AI drafts all 10 SteerCo narrative sections;
   one-click slide deck export for Board meetings
          ↓
5. AGENT ASSIST (always-on)
   Ask the AI assistant anything — it navigates
   the app, filters data, updates statuses, and
   synthesizes documents on command
```

---

## 4 · Intake Wizard — Smart Deal Setup

The 3-tier intake form generates a deal-specific checklist in under 5 minutes.

| Tier | Fields | Why It Matters |
|------|--------|----------------|
| **Required** (4) | Deal name, structure, integration model, close date | Seeds all phase dates and task sequencing |
| **Context** (7) | Functional scope, cross-border, jurisdictions, TSA required, industry sector, deal value, entity count | Activates/deactivates entire workstreams; flags regulatory risks |
| **Advanced** (3) | Target GAAP, target ERP, buyer maturity | Triggers ERP migration tasks, governance items, compliance workstreams |

**Deal structures supported:** Stock Purchase · Asset Purchase · Forward Merger · Reverse Triangular Merger · Carve-Out · F-Reorganization

**Integration models:** Fully Integrated · Hybrid · Standalone

---

## 5 · The Dashboard — 8 Command-Center Tabs

| Tab | What You See | Key Actions |
|-----|--------------|-------------|
| **Live Status** | KPI cards, 24 workstream RAG cards, burndown chart, dependency matrix, RAG sparklines | Drill into any workstream; override RAG; capture snapshot |
| **Checklist** | Full task list with filters, search, detail pane, AI guidance per item | Add/edit/delete items; bulk assign; export CSV |
| **Team** | Roster cards, workload table (tasks per person), permission levels | Add/edit team members; set roles |
| **Risks** | Risk register (8 auto-detected + manual), dependency type matrix | Add risks; link to checklist items; change status |
| **Timeline** | Phase bars (Pre-Close → Day 1 → 30 → 60 → 90 → Year 1) with item counts | Expand workstream phase breakdown |
| **SteerCo** | 10-section narrative editor, AI drafter, pressure test, slide deck | Draft all sections; generate exec summary; export deck |
| **Admin** | Deal settings, export/import JSON, audit log, API status | Configure deal; manage team permissions |
| **✦ Agent** | Permissions matrix, prompt library, skills, synthesized documents | Manage AI behavior; download reports |

---

## 6 · Checklist — The Core Work Surface

**400–500 auto-generated tasks** organized across 24 workstreams, 6 phases, and 4 priority levels.

**Filtering (any combination):**
- Phase: Pre-Close · Day 1 · Day 30 · Day 60 · Day 90 · Year 1
- Status: Not Started · In Progress · Blocked · Complete · N/A · Overdue
- Priority: Critical · High · Medium · Low
- Workstream, Owner, Free-text search

**Item detail pane:**
- Full field edit (description, workstream, phase, priority, status, owner, section)
- Notes thread · Attachment links · Blocked reason
- AI guidance on demand (context-aware to deal structure, cross-border, TSA status)

**Custom items:** Add tasks not in the master template — link to any existing or new workstream (R&D, Commercial, Supply Chain, or any custom name).

**Bulk operations:** Select multiple items → bulk status change · bulk owner assignment

**Saved filter presets:** 3 built-in (Day 1 Critical Path, All Blocked, Overdue Items) + unlimited user-defined presets.

---

## 7 · 24 Workstreams — Full Integration Coverage

| Track | Workstreams |
|-------|-------------|
| **Finance (7)** | TSA · Technical Accounting · Financial Reporting & Consolidation · FP&A · Operational Finance · Income Tax · Treasury |
| **Controls & Governance (2)** | Controls · Governance & Compliance |
| **IT (6)** | IT Strategy & Governance · Enterprise Systems · Infrastructure · Data & Analytics · IT Vendor Management · Client-Facing & Digital |
| **Other (6)** | ESG · Integration Management · Facilities · Human Resources · Legal · Communications |
| **Custom** | R&D · Commercial · Supply Chain · Customer Success · any user-defined name |

Each workstream has its own:
- RAG status (auto-computed + manual override)
- Progress narrative
- Key risks and next steps
- Snapshot trend line

---

## 8 · Live Status — Real-Time Program Health

**KPI Cards (6):**
Total Items · % Complete · In Progress · Blocked · Overdue · Critical

**RAG auto-computation per workstream:**
- 🔴 Red: blocked > 20% or past-due > 15%
- 🟡 Amber: blocked > 10% or past-due > 8%
- 🟢 Green: otherwise
- Manual override available at any time

**Burndown Chart:** Completed vs. remaining trend across weekly snapshots (requires 2+ snapshots).

**Dependency Matrix:** Cross-workstream dependency counts — red if > 3 dependencies, blue for 1–3.

**Progress Snapshots:** Weekly point-in-time captures stored permanently for trend analysis. Capture via "Capture Progress" or agent command.

---

## 9 · SteerCo — Board-Ready in Minutes

**The problem:** A typical SteerCo packet takes 4–8 hours to compile across workstreams. DealMapper does it in under 3 minutes.

**10 AI-drafted narrative sections:**
1. Overall Status
2. Key Issues
3. Key Delays
4. Key Findings
5. Material Impacts
6. Material Dependencies
7. Material Operational Impacts
8. Key Decisions & Escalations
9. Financial Impacts
10. Overall Budget

**Report workflow:**
- "Draft All Narratives" → AI compiles all 10 sections referencing actual item IDs, workstream stats, and risk data
- "Generate Executive Summary" → 1-paragraph Board email ready in seconds
- "Run Pressure Test" → McKinsey/Bain-style completeness score, consistency check, coverage map, and improvement recommendations
- Inline iteration chat → refine any section with natural language
- "Generate Slide Deck" → PPTX export with title, exec summary, per-workstream slides, risk summary, and appendix

---

## 10 · AI Assistant — Your Hands-Free PMO

The ✦ agent is always available via the floating button. It understands the full deal context on every message.

**What it can do:**

| Capability | Example Prompt |
|-----------|----------------|
| Navigate the app | "Take me to the timeline" |
| Filter & surface data | "Show me all blocked items in IT" |
| Update task status | "Mark FIN-0042 as complete" |
| Bulk assign owners | "Assign all Day 1 Finance items to Sarah" |
| Draft SteerCo report | "Draft the SteerCo report" |
| Capture progress | "Generate a progress snapshot" |
| Synthesize documents | "Create a risk memo" · "Export checklist as CSV" |
| Run named skills | "Run skill: Weekly Checkpoint" |

**Context sent on every message:** active tab, active filters, KPIs, deal name/structure/model, team roster with IDs, checklist summary (up to 50 items), full deal summary.

**Library dropdown:** Quick-insert saved prompt templates without leaving the chat.

---

## 11 · Document Synthesis — AI-Generated Deliverables

The agent can generate and permanently save four document types:

| Document | Contents | Format |
|----------|----------|--------|
| **Status Report** | KPIs, workstream breakdown, blocked items, risks, next steps | Markdown |
| **Risk Memo** | Risk register, severity analysis, mitigation plans, trajectory | Markdown |
| **Task Report** | Per-owner task lists by priority and status | Markdown |
| **CSV Export** | All checklist items: ID, workstream, status, owner, dates | CSV |

**Flow:** Agent command → full deal data fetched from DB → Claude synthesis → saved to Vercel Blob + document metadata stored in DB → available in Agent → Documents panel with download link.

---

## 12 · Agent Admin — Control the AI Layer

The ✦ Agent tab gives program leads full control over AI behavior.

**Permissions Matrix:**
- Role × action-type checkbox grid (5 roles × 10 action types)
- Restrict what viewers, workstream leads, or external parties can ask the agent to do
- Changes persist immediately and apply to every subsequent agent call

**Prompt Library:**
- Save reusable prompt templates (global or deal-specific)
- Categorize by type (status check, bulk action, report, custom)
- "Use" button injects any prompt into the chat panel instantly

**Skills — Multi-Step Workflows:**
- Define named sequences of instructions (e.g., "Weekly Checkpoint")
- Example: snapshot → filter overdue → navigate SteerCo → draft report
- Invoke with "Run skill: [name]"

**Documents:**
- Library of all AI-synthesized deliverables
- Preview text, word count, creation date
- Download as Markdown or CSV

---

## 13 · Risk & Dependency Management

**8 Auto-Detected Risk Categories:**
Regulatory Delay · Tax Structure Leakage · TSA Dependency · Data Privacy Breach · Cultural Integration · Financial Reporting Gap · Stranded Costs · IT Integration Risk

Risk severity is auto-assessed from deal profile (e.g., cross-border = regulatory risk, Healthcare sector = data privacy risk elevated).

**Risk lifecycle:** Open → Acknowledged → Mitigated → Closed

**Dependency types per item:**
Predecessor · Internal Analysis · External SME · Data Aggregation · Validation Required · Key Decision · Other

Each dependency can be flagged for SteerCo escalation.

---

## 14 · Team & Permissions

**5 Permission Roles:**

| Role | What They Can Do |
|------|-----------------|
| **Admin** | Full access — all actions, settings, imports, permissions management |
| **IMO Lead** | Checklist edits, narratives, document synthesis, snapshot capture |
| **Workstream Lead** | Own workstream edits, assign owners, draft reports |
| **Viewer** | Navigate and filter only — no mutations |
| **External** | No app actions (read-only access if granted) |

Permissions are enforced both in the UI and at the API level — the agent automatically strips disallowed actions before executing.

---

## 15 · Data Persistence — Three-Layer Architecture

| Layer | What's Stored | Latency |
|-------|--------------|---------|
| **localStorage** | Full deal state (checklist, team, risks, snapshots) | Immediate — offline capable |
| **Neon PostgreSQL** | All deal data, team, risks, agent tables, audit log | ~2–4s debounced sync |
| **Vercel Blob** | Synthesized document files (Markdown, CSV) | ~1–3s on document save |

**Auto-save indicator** in nav bar: `idle → saving → saved → error`

**Export / Import:** Full deal state can be exported as JSON and re-imported — useful for deal handoffs, backups, or template cloning.

**Audit Log:** Every field change is timestamped with before/after values — accessible in Admin tab.

---

## 16 · Key Metrics & Scale

- **24 workstreams** across Finance, Controls & Governance, IT, and Other
- **400–500 checklist items** generated per deal from a master template of 489 items
- **6 integration phases** from Pre-Close through Year 1
- **10 SteerCo sections** AI-drafted in under 60 seconds
- **5 permission roles** with API-level enforcement
- **4 AI-synthesized document types** saved permanently
- **3-layer persistence** for reliability (browser → DB → Blob)
- **8 risk categories** auto-detected from deal profile

---

## 17 · Roadmap Themes *(optional slide)*

Areas positioned for future expansion:

**Storage & Intelligence**
- **Blob Storage & Document CDN** — wire `BLOB_READ_WRITE_TOKEN` to move synthesized documents off the DB base64 fallback onto Vercel Blob CDN; enables direct browser download URLs, version history, and document sharing links
- **Vector Embeddings & Semantic Search** — embed all 489 checklist items and synthesized documents using `text-embedding-3-small`; store vectors in pgvector (Neon-native); enable semantic agent queries ("find tasks similar to ERP cutover"), RAG over deal history, and cross-deal benchmarking

**Collaboration & Delivery**
- **Multi-deal portfolio view** — aggregate RAG status across concurrent deals
- **Email / Slack digest** — weekly snapshot pushed to stakeholders
- **DOCX / PDF export** — polished deliverables with branding

**Platform & Security**
- **SSO / SAML** — enterprise identity integration
- **Comparative benchmarking** — program health vs. deal type norms
- **Mobile-optimized view** — workstream leads on the go
