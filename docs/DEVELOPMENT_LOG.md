# DealMapper — Development Log & Technical Documentation

**Project:** Deal Project Mapper (M&A Integration Engine)
**Repository:** https://github.com/henrypapiz-maker/Deal-Project-Mapper
**Production URL:** https://deal-project-mapper.vercel.app
**Development Period:** March 31 – April 1, 2026 (~36 hours)
**Stack:** Next.js 14.2 · React 18 · TypeScript · Neon Postgres · Vercel · Anthropic Claude API

---

## Table of Contents

1. [Version History](#1-version-history)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema (Neon Postgres)](#3-database-schema)
4. [Feature Inventory](#4-feature-inventory)
5. [Workstream Taxonomy](#5-workstream-taxonomy)
6. [Checklist Master Data](#6-checklist-master-data)
7. [API Routes](#7-api-routes)
8. [Type System](#8-type-system)
9. [Bug Fixes & Patches](#9-bug-fixes--patches)
10. [Pressure Test Results](#10-pressure-test-results)
11. [Known Limitations](#11-known-limitations)
12. [Future Development Recommendations](#12-future-development-recommendations)

---

## 1. Version History

| Version | Commit | Date | Summary |
|---------|--------|------|---------|
| v0.1.0 | `bee5b11` | Mar 31 | Initial: IT taxonomy, functional scope, priority override |
| v0.2.0 | `b1fae66` | Mar 31 | Expanded to 489-item production checklist |
| v0.2.1 | `81cdeb8` | Mar 31 | UI redesign v2, hydration fix, accurate counts |
| v0.2.2 | `beb46b2` | Mar 31 | +41 practitioner-critical items (Legal, Comms, Deal Mechanics) |
| v0.3.0 | `4a9dc8e` | Mar 31 | Workstream taxonomy v1, dependency visualization, ID prefixes |
| v0.3.1 | `228a069` | Mar 31 | Track-level filters, add-task, duplicate resolution |
| v0.3.2 | `ad0a8ae` | Mar 31 | Waves 5-9: owner assignment, persistence, bulk updates, N/A toggle, audit trail |
| v0.4.0 | `f663236` | Apr 1 | SteerCo tab, notes, saved filters, team management, AI fix |
| v0.4.1 | `ba8ee7c` | Apr 1 | Audit trail, text search, stale ref cleanup |
| v0.5.0 | `de19829` | Apr 1 | Neon Postgres as primary storage |
| v0.5.1 | `15f7de0` | Apr 1 | SVG charts, dependency matrix, exec summary, risk enhancement |
| v0.5.2 | `35668de` | Apr 1 | Risk & Dependency Management hub, fix assignments |
| v0.5.3 | `26ff83a` | Apr 1 | Bowler table reporting engine with Neon DB backend |
| v0.5.4 | `78ca290` | Apr 1 | Classified dependency linking with type, detail, SteerCo escalation |
| v0.5.5 | `14ded04` | Apr 1 | Multi-deal support, SteerCo narrative sections, immediate DB save |
| v0.5.6 | `45c82e9` | Apr 1 | Contextual help drawer with tab-specific content |
| v0.6.0 | `7885b9b` | Apr 1 | 15 of 18 QA bugs from beta test report resolved |
| v0.6.1 | `e4b2c6e` | Apr 1 | 12 pressure test findings (P0-P3) resolved |

**Total commits in 36 hours: 31**

---

## 2. Architecture Overview

### File Structure (20 source files, 7,508 lines)

```
app/
  api/
    ai-guidance/route.ts    (86 lines)  — Claude AI guidance endpoint
    bowler/route.ts          (216 lines) — Bowler table CRUD + snapshot generation
    deals/route.ts           (391 lines) — Deal CRUD, save/load from Neon
    periods/route.ts         (51 lines)  — Reporting period management
    steerco/route.ts         (74 lines)  — SteerCo narrative persistence
    views/route.ts           (46 lines)  — View preference persistence
  layout.tsx                 (26 lines)  — App shell, metadata
  page.tsx                   (790 lines) — App state machine, all callbacks

components/
  dashboard/
    BowlerTable.tsx          (327 lines) — Time-phased RAG grid component
    Dashboard.tsx            (2,527 lines) — Main dashboard (6 tabs, inline styles)
    HelpDrawer.tsx           (349 lines) — Contextual help overlay
  intake/
    IntakeForm.tsx           (644 lines) — 3-tier deal intake wizard

lib/
  bowler.ts                  (287 lines) — Bowler table view presets, taxonomy map
  checklist-master.ts        (726 lines) — 531-item master checklist template
  db.ts                      (9 lines)   — Neon serverless SQL client
  decision-tree.ts           (328 lines) — Deal generation engine
  persistence.ts             (68 lines)  — localStorage save/load with migration
  progress.ts                (131 lines) — Progress snapshot generator
  types.ts                   (355 lines) — All TypeScript interfaces and types
```

### State Management

- **Client:** React useState in `page.tsx` (single source of truth)
- **Persistence:** Dual-write — localStorage (offline/instant) + Neon Postgres (durable)
- **Migration:** `persistence.ts` handles v2→v3 schema migration on load
- **Callbacks:** 12 callbacks from `page.tsx` → `Dashboard.tsx`:
  - `onUpdateStatus`, `onUpdatePriority`, `onUpdateBlockedReason`
  - `onReset`, `onAddTask`, `onAddPerson`, `onAssignOwner`
  - `onAddNote`, `onSaveSnapshot`, `onSaveFilter`, `onDeleteFilter`
  - `onUpdateRagOverride`

### Authentication & API

- **Claude AI:** Anthropic API via `x-api-key` header, model: `claude-haiku-4-20250414`
- **Database:** Neon Postgres serverless via `@neondatabase/serverless`
- **Deployment:** Vercel (auto-deploy on push to `main`)
- **Environment Variables:**
  - `ANTHROPIC_API_KEY` — Claude API key (must be set in Vercel dashboard)
  - `DATABASE_URL` — Neon Postgres connection string

---

## 3. Database Schema

### Neon Postgres Tables

**`deals`** — Core deal record
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_name | TEXT | Deal code name |
| deal_structure | TEXT | stock_purchase, asset_purchase, merger, carve_out |
| integration_model | TEXT | fully_integrated, hybrid, standalone |
| close_date | DATE | Target close date |
| cross_border | BOOLEAN | Cross-border flag |
| jurisdictions | TEXT[] | Array of jurisdiction codes |
| tsa_required | TEXT | yes, no, tbd |
| functional_scope | TEXT[] | Active functional areas |
| sector | TEXT | Industry sector |
| deal_value | TEXT | Value range |
| target_entities | INTEGER | Number of legal entities |
| target_gaap | TEXT | Accounting standard |
| target_erp | TEXT | ERP system |
| acquirer_maturity | TEXT | M&A maturity level |
| status | TEXT | pre_close, active, complete, archived |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

**`checklist_items`** — All checklist line items per deal
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| item_id | TEXT | Display ID (FIN-0001, CGV-0191, IT-0444) |
| workstream | TEXT | Workstream name |
| section | TEXT | Section within workstream |
| description | TEXT | Task description |
| phase | TEXT | day_1, day_30, day_60, day_90, year_1 |
| priority | TEXT | critical, high, medium, low |
| status | TEXT | not_started, in_progress, complete, blocked, na |
| owner_id | UUID | Assigned team member |
| blocked_reason | TEXT | Why blocked (optional) |
| na_justification | TEXT | Why N/A (optional) |
| notes | JSONB | Array of Note objects |
| attachments | JSONB | Array of Attachment objects |
| dependencies | TEXT[] | Dependency item IDs |
| tsa_relevant | BOOLEAN | TSA flag |
| cross_border_flag | BOOLEAN | Cross-border flag |
| risk_indicators | TEXT[] | Risk category tags |
| functional_area | TEXT | finance, tax, treasury, operations, it, hr, legal, comms |
| milestone_date | DATE | Computed due date |

**`team_members`** — People assigned to a deal
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| name | TEXT | Full name |
| role | TEXT | Role/title |
| email | TEXT | Email address |

**`risk_alerts`** — Risk register entries
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| category | TEXT | Risk category |
| severity | TEXT | critical, high, medium, low |
| description | TEXT | Risk description |
| mitigation | TEXT | Mitigation strategy |
| status | TEXT | open, acknowledged, mitigated, closed |
| source | TEXT | auto, manual, narrative |
| linked_items | TEXT[] | Linked checklist item IDs |
| management_notes | TEXT | Management commentary |

**`milestones`** — Integration timeline milestones
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| name | TEXT | Milestone name |
| date | DATE | Target date |
| phase | TEXT | Associated phase |

**`progress_snapshots`** — Point-in-time progress records
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| period_end | DATE | Reporting period end date |
| summary | JSONB | Aggregate stats |
| workstreams | JSONB | Per-workstream breakdown |
| owners | JSONB | Per-owner breakdown |
| created_at | TIMESTAMPTZ | Snapshot timestamp |

**`saved_filters`** — User-defined filter views
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| name | TEXT | Filter name |
| filters | JSONB | Filter state object |
| is_preset | BOOLEAN | Built-in vs custom |

**`reporting_periods`** — Weekly reporting periods per deal
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| period_label | TEXT | "Week 1", "Week 2", etc. |
| period_start | DATE | Period start date |
| period_end | DATE | Period end date |
| sequence_num | INTEGER | Order in sequence |
| is_current | BOOLEAN | Current period flag |

**`bowler_cells`** — Bowler table data points
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| period_id | UUID (FK→reporting_periods) | Reporting period |
| level | TEXT | program, track, workstream |
| row_key | TEXT | Track or workstream name (null for program) |
| computed_rag | TEXT | Auto-computed RAG (red, amber, green) |
| override_rag | TEXT | Manual RAG override |
| metrics | JSONB | Stats: total, completed, blocked, pastDue, pctComplete |
| narrative | TEXT | Status narrative |
| key_risks | TEXT | Key risks text |
| next_steps | TEXT | Next steps text |
| updated_by | TEXT | Who last updated |
| updated_at | TIMESTAMPTZ | Last update |

**`steerco_narratives`** — SteerCo executive narrative sections
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| period_id | TEXT | Optional period reference |
| section_key | TEXT | Section identifier |
| content | TEXT | Narrative content |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

**`audit.status_history`** — Change log / audit trail
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| deal_id | UUID (FK→deals) | Parent deal |
| item_id | TEXT | Checklist item ID |
| field | TEXT | Changed field name |
| old_value | TEXT | Previous value |
| new_value | TEXT | New value |
| changed_by | TEXT | Who made the change |
| created_at | TIMESTAMPTZ | Change timestamp |

---

## 4. Feature Inventory

### Deal Management
- [x] 3-tier intake wizard (Core, Context, Advanced)
- [x] Multi-deal portfolio with DB persistence
- [x] Deal delete from portfolio
- [x] Resume Latest Deal (localStorage → DB fallback)
- [x] Deal status tracking (pre_close, active, complete, archived)

### Checklist Engine
- [x] 531-item master checklist template
- [x] 24 workstreams across 4 tracks (Finance, Controls, IT, Other)
- [x] Workstream-specific ID prefixes (FIN-, CGV-, IT-)
- [x] 5 filter dropdowns (Phase, Workstream, Priority, Status, Owner)
- [x] Text search across descriptions
- [x] Clickable column sort (all 7 columns)
- [x] Saved filter views (3 presets + custom)
- [x] Bulk status update on multi-selected items
- [x] Priority override (manual override of auto-computed)
- [x] Add custom tasks
- [x] N/A toggle with justification
- [x] CSV export
- [x] Show/hide N/A items

### Team Management
- [x] Add team members (name, role, email)
- [x] Bulk assign by workstream
- [x] Line-item assignment
- [x] Workload balance indicator (green/amber/red)
- [x] Team roster with stats (assigned, complete, blocked)

### AI Guidance
- [x] Claude AI contextual guidance per checklist item
- [x] Deal-context-aware system prompt
- [x] Structured error handling (no key, API error, network)
- [x] Model: claude-haiku-4-20250414

### Notes & Attachments
- [x] Item-level notes (structured Note type with timestamp)
- [x] Attachment metadata (name, URL, date)
- [x] Notes counter synced with live data

### Risk & Dependency Management
- [x] Auto-generated risk alerts (8 categories)
- [x] Manual risk creation with severity/description
- [x] Risk-to-checklist item linking
- [x] Risk status lifecycle (Open → Acknowledged → Mitigated → Closed)
- [x] Management notes per risk
- [x] Narrative-sourced risks
- [x] Auto vs manual deduplication
- [x] 7 classified dependency types (Predecessor, Internal Analysis, External SME, Data Aggregation, Validation, Key Decision, Other)
- [x] Free-text detail per dependency link
- [x] Risk heat map

### SteerCo Reporting
- [x] Bowler Table (time-phased RAG grid)
  - 4 view presets (Executive, IMO Dashboard, Workstream Detail, SteerCo Report)
  - Drill-through: Program → Track → Workstream
  - RAG override with persistence to deal state
  - CSV export
  - Per-cell narrative, key risks, next steps
- [x] Progress snapshot capture (syncs to both localStorage and Neon DB)
- [x] 10-section Executive Narrative (Overall Status, Key Issues, Key Delays, Key Findings, Material Impacts, Material Dependencies, Material Operational Impacts, Key Decisions & Escalations, Financial Impacts, Overall Budget & % Complete)
- [x] Save to DB + confirmation toast
- [x] Copy Summary to clipboard
- [x] Print / Export (browser print with light stylesheet)
- [x] Load Previous narrative from DB
- [x] Historical snapshot comparison

### Dashboard & Visualization
- [x] 6 KPI cards (Total, Complete, In Progress, Blocked, Overdue, Unassigned)
- [x] Clickable KPI cards → filtered checklist
- [x] Program Status banner with auto-computed RAG
- [x] Workstream progress bars with expandable details
- [x] SVG progress charts
- [x] Dependency matrix heatmap
- [x] Recent Activity feed (change log)

### Timeline
- [x] 6-phase vertical timeline (Pre-Close through Year 1)
- [x] Phase items with click-through to checklist
- [x] Cross-workstream dependency matrix

### Help System
- [x] Contextual help drawer (?  icon in nav)
- [x] Tab-specific content (all 6 tabs + general)
- [x] Color-coded callout boxes (info/tip/warning)

### Persistence & Infrastructure
- [x] Dual persistence: localStorage + Neon Postgres
- [x] Schema migration v2→v3
- [x] Multi-deal support with DB-first architecture
- [x] Vercel deployment with environment variables
- [x] GitHub CI (push to main → deploy)

---

## 5. Workstream Taxonomy

### 4 Tracks, 24 Workstreams

**Finance Track (10 workstreams):**
| Code | Workstream | ID Prefix | Items |
|------|-----------|-----------|-------|
| FIN-TSA | TSA | FIN- | ~70 |
| FIN-TECH | Technical Accounting | FIN- | ~20 |
| FIN-CONS | Financial Reporting & Consolidation | FIN- | ~52 |
| FIN-FPA | FP&A | FIN- | ~28 |
| FIN-OPS | Operational Finance | FIN- | ~68 |
| FIN-TAX | Income Tax | FIN- | ~38 |
| FIN-TRE | Treasury | FIN- | ~32 |
| FIN-IT | IT (Finance Systems) | FIN- | ~10 |
| FIN-HR | HR (Finance) | FIN- | ~8 |
| FIN-LGL | Legal (Finance) | FIN- | ~5 |

**Controls & Governance Track (2 workstreams):**
| Code | Workstream | ID Prefix | Items |
|------|-----------|-----------|-------|
| CGV-CTL | Controls | CGV- | ~44 |
| CGV-GOV | Governance & Compliance | CGV- | ~15 |

**IT Track (6 workstreams):**
| Code | Workstream | ID Prefix | Items |
|------|-----------|-----------|-------|
| IT-STR | IT Strategy & Governance | IT- | ~10 |
| IT-ENT | Enterprise Systems | IT- | ~8 |
| IT-INF | Infrastructure | IT- | ~8 |
| IT-DAT | Data & Analytics | IT- | ~8 |
| IT-VND | IT Vendor Management | IT- | ~6 |
| IT-DIG | Client-Facing & Digital | IT- | ~6 |

**Other Track (6 workstreams):**
| Code | Workstream | ID Prefix | Items |
|------|-----------|-----------|-------|
| ESG | ESG & Sustainability | FIN- | ~22 |
| INT | Integration Management | FIN- | ~35 |
| FAC | Facilities & Real Estate | FIN- | ~18 |
| HR | Human Resources | FIN- | ~15 |
| LGL | Legal & Contract Transition | FIN- | ~15 |
| COM | Communications & Change Management | FIN- | ~10 |

**Total: 531 items across 24 workstreams in 4 tracks**

### Bowler Table Track Mapping (`lib/bowler.ts`)

The `WORKSTREAM_TRACK_MAP` object maps each workstream name to its track for Bowler Table grouping. The `TRACK_ORDER` array defines display order: Finance → Controls & Governance → IT → Other.

---

## 6. Checklist Master Data

**File:** `lib/checklist-master.ts` (726 lines, 531 items)

### Item Schema
```typescript
{
  itemId: "FIN-0001",           // Workstream-prefixed ID
  workstream: "TSA",            // Workstream name
  section: "TSA Scoping",       // Section within workstream
  description: "Identify...",   // Task description
  phase: "day_1",               // Phase assignment
  priority: "critical",         // Priority level
  dependencies: ["FIN-0004"],   // Dependency item IDs
  tsaRelevant: true,            // TSA flag
  crossBorderFlag: false,       // Cross-border flag
  riskIndicators: ["tsa_dependency"], // Risk categories
  functionalArea: "operations", // Functional area
}
```

### ID Ranges
| Range | Track | Workstreams |
|-------|-------|-------------|
| FIN-0001 – FIN-0443 | Finance + Other | TSA, Consolidation, Ops Accounting, Tax, Treasury, FP&A, ESG, PMO, Facilities, HR, Legal, Comms |
| CGV-0191 – CGV-0234 | Controls & Governance | Controls, SOX, Governance |
| IT-0444 – IT-0489 | IT | Strategy, Enterprise, Infrastructure, Data, Vendor, Digital |
| FIN-0490 – FIN-0531 | Deal Mechanics | Practitioner-critical items (novations, comms, close mechanics) |

---

## 7. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/deals` | GET | List all deals |
| `/api/deals` | POST | Create or update a deal (full save) |
| `/api/deals?id=UUID` | GET | Load a specific deal with all related data |
| `/api/deals` | DELETE | Delete a deal and all related data |
| `/api/ai-guidance` | POST | Get Claude AI guidance for a checklist item |
| `/api/bowler` | GET | Fetch bowler cells for a deal/level/period |
| `/api/bowler` | POST | Create bowler cells from snapshot data |
| `/api/bowler` | PUT | Update a bowler cell (RAG override, narrative) |
| `/api/periods` | GET | List reporting periods for a deal |
| `/api/periods` | POST | Create reporting periods for a deal |
| `/api/steerco` | GET | Fetch SteerCo narratives |
| `/api/steerco` | POST | Save/update SteerCo narrative section |
| `/api/views` | GET | Fetch view preferences |
| `/api/views` | POST | Save view preference |

---

## 8. Type System

**File:** `lib/types.ts` (355 lines)

### Core Types
- `DealStructure`: stock_purchase | asset_purchase | merger | carve_out
- `IntegrationModel`: fully_integrated | hybrid | standalone
- `Phase`: pre_close | day_1 | day_30 | day_60 | day_90 | year_1
- `Priority`: critical | high | medium | low
- `ItemStatus`: not_started | in_progress | complete | blocked | na
- `RiskSeverity`: critical | high | medium | low
- `WorkstreamTrack`: Finance | Controls & Governance | IT | Other

### Key Interfaces
- `DealIntake` — 3-tier intake form data
- `ChecklistItem` — Line item with status, notes, attachments, dependencies
- `RiskAlert` — Risk register entry with lifecycle status
- `Person` — Team member with name, role, email
- `Note` — Structured note with id, text, timestamp, author
- `Attachment` — File metadata with name, URL, dates
- `ClassifiedDependency` — Typed dependency link with detail
- `ProgressSnapshot` — Point-in-time snapshot with workstream/owner breakdowns
- `WorkstreamSnapshot` — Per-workstream stats including RAG, narrative, highlighted items
- `OwnerSnapshot` — Per-owner stats
- `SavedFilter` — Named filter combination
- `ChangeEvent` — Audit trail entry
- `GeneratedDeal` — Complete deal state object (top-level)

### DependencyType (7 classifications)
```typescript
type DependencyType =
  | "Predecessor"
  | "Internal Analysis Required"
  | "External SME Analysis Required"
  | "Data Aggregation / Normalization"
  | "Validation Required"
  | "Key Decision Needed"
  | "Other";
```

---

## 9. Bug Fixes & Patches

### Beta Test Report Fixes (v0.6.0 — commit `7885b9b`)
| Bug | Severity | Fix |
|-----|----------|-----|
| Cross-border persistence | Critical | Fixed intake form to save jurisdiction data correctly |
| Browser back button | Critical | Added popstate handler for navigation |
| Duplicate deals + phantom records | Critical | Deduplication on save, delete on portfolio |
| Raw ISO timestamps | High | Formatted dates throughout UI |
| Version mismatch | High | Aligned all version strings to v0.6.0 |
| SteerCo copy mismatch | Medium | Standardized snapshot label format |
| Tier 2 optionality hint | Medium | Added "expand" hint text |
| URL routing | High | Added bookmark-friendly URL state |
| Functional scope toggles | High | Individual function toggles on intake |
| Portfolio search/sort | Medium | Added search, sort, pagination to portfolio |
| Default selections | Medium | Removed auto-select on required fields |
| Open label, ARIA, branding | Low | Accessibility and branding improvements |

### QA Brief Fixes (commit `e181827`)
| Bug | Severity | Fix |
|-----|----------|-----|
| Bowler "0 cells" rendering | P0 | Fixed cell query to match visible period IDs |
| Snapshot requires two clicks | P0 | Added DB commit wait + state refresh |
| ISO date in deal header | P1 | Added date formatter utility |
| "New Deal" nav label | P1 | Renamed to "← Deal Portfolio" |

### Pressure Test Fixes (v0.6.1 — commit `e4b2c6e`)
| Bug | Severity | Fix |
|-----|----------|-----|
| Bowler snapshot not syncing to DB | P0 | Added `/api/bowler` POST call on capture |
| Blocked reason field stale | P0 | useEffect syncs selectedItem with live data |
| Notes counter shows (0) | P1 | Same selectedItem sync fix |
| No bulk status update | P1 | Added dropdown for multi-select status change |
| RAG overrides lost on tab switch | P1 | Persisted to `deal.ragOverrides` in deal state |
| Hong Kong missing | P2 | Added 8 APAC jurisdictions |
| Duplicate risks in register | P2 | Auto-risks hidden when manual exists for same category |
| Unassigned KPI not clickable | P2 | Added click → filtered checklist navigation |
| Save to DB no confirmation | P2 | Added green "Saved!" flash toast |
| Timeline items not clickable | P2 | Added click → checklist with phase filter |
| No workload balance indicator | P3 | Added green/amber/red dot on team roster |
| No task creation confirmation | P3 | Added "Added!" flash on button |

**Total bugs fixed: 27**

---

## 10. Pressure Test Results

### Test Persona
**Rachel Moran**, SVP Integration Management at **Meridian National Insurance Group**, leading post-close integration of **Pacific Shield Re** (Singapore reinsurer, $3.2B, 7 APAC markets).

### Test Coverage
| Phase | Status | Details |
|-------|--------|---------|
| Deal Intake (3 tiers) | PASS | 529 items generated, all fields populated |
| Team Assignments (12 members) | PASS | All assigned by workstream |
| Checklist Maintenance | PASS | 54 complete, 40 in-progress, 3 blocked, 3 notes, 3 custom tasks |
| Risk & Dependencies | PASS | 4 custom risks, 3 dependency links, 10 total risks |
| SteerCo Report | PASS | Bowler table, RAG overrides, 10 narratives, export |
| Verification (16 items) | 15/16 PASS | 1 skipped (print dialog timeout) |

### Verification Checklist
- [x] Deal header: Stock Purchase, Hybrid, 6/7 jurisdictions, IFRS, SAP
- [x] Cross-Border shows jurisdiction list
- [x] 12 team members with correct assignments
- [x] Mix of Complete/In Progress/Blocked/Not Started
- [x] 3+ blocked items with detailed reasons
- [x] 3+ items with notes
- [x] 3+ custom tasks added
- [x] 4 custom risks in Risk & Dependencies
- [x] 10 open risks total
- [x] 3+ dependency links created
- [x] Bowler Table with snapshot data
- [x] 2+ RAG overrides applied
- [x] All 10 SteerCo narrative sections populated
- [x] Copy Summary tested
- [x] Export CSV tested
- [x] KPI cards accurate

---

## 11. Known Limitations

1. **Dashboard.tsx monolith** — 2,527 lines in a single component. Should be split into sub-components (SteerCoTab, RiskTab, etc.) for maintainability.
2. **No real-time collaboration** — Single-user localStorage + DB. No WebSocket or polling for multi-user.
3. **No authentication** — No user login. Anyone with the URL can access deals.
4. **No file upload** — Attachments store metadata only (name, URL). Actual files must be hosted elsewhere.
5. **Print export is basic** — Browser `window.print()` only. No PDF generation or PowerPoint export.
6. **Bowler Table period anchoring** — Periods anchor to close date, not current date.
7. **No mobile responsive design** — Desktop-only layout.
8. **Inline styles throughout** — No CSS modules or Tailwind utility classes in Dashboard.

---

## 12. Future Development Recommendations

### High Priority
1. **Split Dashboard.tsx** into 6 tab components + shared utilities
2. **Add authentication** (NextAuth.js or Clerk) for multi-user access
3. **Real-time sync** via polling or WebSocket for concurrent editing
4. **PDF/PowerPoint export** for SteerCo packages
5. **AI narrative drafting** — "Draft with AI" button for SteerCo sections

### Medium Priority
6. **Due dates per checklist item** (not just phase labels)
7. **Multi-deal portfolio comparison** view
8. **Email notifications** on status changes
9. **Role-based access** (IMO Lead vs Workstream Lead vs Executive)
10. **Integration with project management tools** (Jira, Monday.com)

### Low Priority
11. **Mobile responsive layout**
12. **Dark/light theme toggle**
13. **Keyboard shortcuts** for power users
14. **Undo/redo** on status changes
15. **Gantt chart** on Timeline tab

---

*Generated April 1, 2026. Last commit: `e4b2c6e`.*
