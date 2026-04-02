# Feature Inventory — DealMapper v0.8.0

## Core Platform

| # | Feature | Version | Status |
|---|---------|---------|--------|
| 1 | 3-tier deal intake form (structure, context, advanced) | v0.1 | ✅ Live |
| 2 | Decision tree engine (generates checklist from intake) | v0.1 | ✅ Live |
| 3 | 531-item master checklist (Finance, Controls, IT) | v0.3 | ✅ Live |
| 4 | 24-workstream taxonomy across 4 tracks | v0.4 | ✅ Live |
| 5 | Workstream ID prefix system (FIN-, CGV-, IT-, ESG-, etc.) | v0.4 | ✅ Live |
| 6 | Functional scope filtering (IT + Finance items) | v0.2 | ✅ Live |
| 7 | Priority override (manual override of auto-computed priority) | v0.2 | ✅ Live |

## Dashboard — 7 Tabs

### Tab 1: Live Status
| # | Feature | Status |
|---|---------|--------|
| 8 | 6 KPI cards (Active, Complete, In Progress, Blocked, Past Due, Unassigned) | ✅ Live |
| 9 | Clickable KPI cards (filter to relevant items) | ✅ Live |
| 10 | Executive summary with program RAG | ✅ Live |
| 11 | Workstream progress bars with RAG | ✅ Live |
| 12 | Recent activity feed (last 20 changes) | ✅ Live |
| 13 | Dependency matrix heatmap | ✅ Live |

### Tab 2: Checklist Maintenance
| # | Feature | Status |
|---|---------|--------|
| 14 | 5-filter bar (Phase, Workstream, Priority, Status, Owner) | ✅ Live |
| 15 | Text search across item descriptions | ✅ Live |
| 16 | Clickable column sort (ID, Workstream, Task, Phase, Priority, Status, Owner) | ✅ Live |
| 17 | Saved filter views (Day 1 Critical, All Blocked, Overdue, custom) | ✅ Live |
| 18 | Inline status update dropdown | ✅ Live |
| 19 | Inline priority override dropdown | ✅ Live |
| 20 | Inline owner assignment dropdown | ✅ Live |
| 21 | Blocked reason text field | ✅ Live |
| 22 | Item notes + attachments panel | ✅ Live |
| 23 | AI guidance per item (Claude API) | ✅ Live |
| 24 | Add custom task | ✅ Live |
| 25 | Bulk status update (multi-select) | ✅ Live |
| 26 | N/A toggle with justification | ✅ Live |
| 27 | CSV export of filtered checklist | ✅ Live |
| 28 | Show/hide N/A items toggle | ✅ Live |

### Tab 3: Team Assignments
| # | Feature | Status |
|---|---------|--------|
| 29 | Add person (name, role, email) | ✅ Live |
| 30 | Team roster with workload stats | ✅ Live |
| 31 | Bulk assign by workstream | ✅ Live |
| 32 | Line-item assignment from team tab | ✅ Live |

### Tab 4: Risk & Dependency Management
| # | Feature | Status |
|---|---------|--------|
| 33 | Auto-generated risk alerts from intake | ✅ Live |
| 34 | Custom risk creation (category, severity, description) | ✅ Live |
| 35 | Risk-to-checklist item linking | ✅ Live |
| 36 | Ad-hoc dependency linking (item → item) | ✅ Live |
| 37 | Classified dependency types (Predecessor, Internal Analysis, External SME, Regulatory) | ✅ Live |
| 38 | Risk heat map visualization | ✅ Live |
| 39 | Dependency graph visualization | ✅ Live |

### Tab 5: Timeline
| # | Feature | Status |
|---|---------|--------|
| 40 | Phase-based timeline (Pre-Close → Day 1 → ... → Year 1) | ✅ Live |
| 41 | Milestone markers | ✅ Live |

### Tab 6: SteerCo
| # | Feature | Status |
|---|---------|--------|
| 42 | Bowler table (4 views: Executive, IMO, Workstream, SteerCo) | ✅ Live |
| 43 | RAG override per workstream per period | ✅ Live |
| 44 | 10-section executive narrative editor | ✅ Live |
| 45 | Snapshot capture (freeze current state) | ✅ Live |
| 46 | Historical snapshot comparison | ✅ Live |
| 47 | Bowler CSV export | ✅ Live |
| 48 | AI report drafting assistant (Draft All, Draft Section, Enhance) | ✅ Live |
| 49 | Pressure test (completeness score, coverage map, recommendations) | ✅ Live |
| 50 | McKinsey playbook assessment | ✅ Live |
| 51 | Bain 10-step health check (0-100 score) | ✅ Live |
| 52 | Prospective guidance (velocity, risk trajectory, critical path) | ✅ Live |
| 53 | 11-slide board-grade deck (McKinsey/Bain format) | ✅ Live |
| 54 | Slide deck print with page breaks | ✅ Live |
| 55 | Per-slide copy to clipboard | ✅ Live |
| 56 | Save narratives to DB | ✅ Live |
| 57 | Copy summary to clipboard | ✅ Live |

### Tab 7: Admin
| # | Feature | Status |
|---|---------|--------|
| 58 | Role-based permission levels (Admin, IMO Lead, Workstream Lead, Viewer) | ✅ Live |
| 59 | Deal settings management | ✅ Live |
| 60 | Autosave indicator | ✅ Live |

## Infrastructure

| # | Feature | Status |
|---|---------|--------|
| 61 | Neon Postgres backend (14 tables) | ✅ Live |
| 62 | Debounced autosave to DB | ✅ Live |
| 63 | localStorage persistence (offline fallback) | ✅ Live |
| 64 | Schema migration v2 → v3 | ✅ Live |
| 65 | Multi-deal portfolio (create, load, delete, archive) | ✅ Live |
| 66 | Claude API integration (Haiku for guidance, Sonnet for reports) | ✅ Live |
| 67 | Vercel production deployment | ✅ Live |
| 68 | GitHub CI/CD (push to main → deploy) | ✅ Live |
| 69 | Contextual help drawer (per-tab) | ✅ Live |
| 70 | Browser back button handling | ✅ Live |
| 71 | Print stylesheet (@media print) | ✅ Live |

## Pending / Gaps

| # | Feature | Priority | Status |
|---|---------|----------|--------|
| G1 | Hong Kong jurisdiction in dropdown | P2 | ❌ Gap |
| G2 | Bowler Table snapshot hydration (requires 2 clicks) | P0 | ⚠️ Workaround |
| G3 | Notes counter visual update | P1 | ⚠️ Known issue |
| G4 | Pre-Close phase on Timeline | P2 | ❌ Gap |
| G5 | Multi-deal portfolio comparison view | P3 | ❌ Gap |
| G6 | Team workload balance indicator | P3 | ❌ Gap |
| G7 | Due dates on checklist items (phase → date mapping) | P3 | ❌ Gap |
| G8 | Real-time multi-user collaboration | P3 | ❌ Gap |
| G9 | Authentication (NextAuth / Clerk) | P2 | ❌ Gap |
| G10 | Coral Reef data recovery from Chrome localStorage | P1 | ❌ Gap |
