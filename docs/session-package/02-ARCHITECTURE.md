# Architecture — DealMapper v0.8.0

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript (strict) |
| Styling | Inline styles (no CSS framework) |
| Database | Neon Postgres (serverless) |
| ORM | @neondatabase/serverless (raw SQL) |
| AI | Anthropic Claude API (Haiku + Sonnet) |
| Hosting | Vercel (production) |
| VCS | GitHub (main branch deploys) |

## File Map (23 source files, 12,385 lines)

```
Deal-Project-Mapper/
├── app/
│   ├── layout.tsx                    (26 lines)  — HTML shell, metadata
│   ├── page.tsx                      (790 lines) — App state machine, all callbacks
│   └── api/
│       ├── ai-guidance/route.ts      (185 lines) — Claude API (6 modes)
│       ├── bowler/route.ts           (216 lines) — Bowler table CRUD + snapshots
│       ├── deals/route.ts            (391 lines) — Deal CRUD + DDL migration
│       ├── periods/route.ts          (51 lines)  — Reporting period generation
│       ├── steerco/route.ts          (74 lines)  — SteerCo narrative CRUD
│       └── views/route.ts            (46 lines)  — View preference storage
├── components/
│   └── dashboard/
│       ├── Dashboard.tsx             (2527 lines) — Main dashboard (7 tabs)
│       ├── BowlerTable.tsx           (389 lines)  — Bowler table component
│       ├── HelpDrawer.tsx            (349 lines)  — Contextual help per tab
│       ├── ReportDrafter.tsx         (~800 lines) — AI drafting assistant
│       └── SlidePreview.tsx          (1766 lines) — 11-slide board deck
│   └── intake/
│       └── IntakeForm.tsx            (644 lines)  — 3-tier deal intake
├── lib/
│   ├── bowler.ts                     (287 lines)  — Workstream taxonomy + view presets
│   ├── checklist-master.ts           (726 lines)  — 531-item master checklist
│   ├── db.ts                         (9 lines)    — Neon connection
│   ├── decision-tree.ts              (328 lines)  — Intake → deal generation
│   ├── persistence.ts                (68 lines)   — localStorage save/load/migrate
│   ├── progress.ts                   (131 lines)  — Snapshot generator + RAG computation
│   ├── report-engine.ts              (~1200 lines) — Context assembly + AI prompts
│   └── types.ts                      (355 lines)  — All TypeScript interfaces
└── docs/
    └── session-package/              — This documentation package
```

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  IntakeForm  │────>│ decision-tree│────>│  page.tsx       │
│  (3 tiers)   │     │ .ts          │     │  (state machine)│
└─────────────┘     └──────────────┘     └───────┬────────┘
                                                  │
                         ┌────────────────────────┤
                         │                        │
                    ┌────▼─────┐           ┌──────▼──────┐
                    │ localStorage│         │  Neon DB     │
                    │ (offline)  │         │  (14 tables) │
                    └────┬─────┘           └──────┬──────┘
                         │                        │
                         └────────┬───────────────┘
                                  │
                           ┌──────▼──────┐
                           │ Dashboard.tsx│
                           │  (7 tabs)   │
                           └──────┬──────┘
                                  │
              ┌───────────┬───────┼───────┬────────────┐
              │           │       │       │            │
         ┌────▼───┐ ┌────▼──┐ ┌──▼───┐ ┌▼────────┐ ┌▼──────────┐
         │Checklist│ │ Team  │ │Risks │ │SteerCo  │ │BowlerTable│
         │  Tab   │ │  Tab  │ │ Tab  │ │  Tab    │ │           │
         └────────┘ └───────┘ └──────┘ └────┬────┘ └───────────┘
                                            │
                                  ┌─────────┼─────────┐
                                  │         │         │
                            ┌─────▼──┐ ┌───▼────┐ ┌──▼──────┐
                            │Report  │ │Slide   │ │AI API   │
                            │Drafter │ │Preview │ │(Claude) │
                            └────────┘ └────────┘ └─────────┘
```

## State Management

- **Single source of truth:** `page.tsx` holds `deal: GeneratedDeal | null`
- **13 callbacks** passed to Dashboard: onUpdateStatus, onUpdatePriority, onUpdateBlockedReason, onReset, onAddTask, onAddPerson, onAssignOwner, onAddNote, onAddAttachment, onSaveFilter, onDeleteFilter, onAddRisk, onAddDependency
- **Auto-save:** Every state change triggers debounced save to both localStorage and Neon DB
- **DB-primary:** New deals saved to DB immediately; load from DB on portfolio view

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/deals` | GET, POST, PUT, DELETE | Deal CRUD + DDL migration |
| `/api/ai-guidance` | POST | Claude AI (6 modes: guidance, draft_section, draft_all, enhance, pressure_test, chat) |
| `/api/bowler` | GET, POST, PUT | Bowler cells read/snapshot/update |
| `/api/periods` | GET, POST | Reporting period generation |
| `/api/steerco` | GET, POST | SteerCo narrative CRUD |
| `/api/views` | GET, POST | User view preference storage |
