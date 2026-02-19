# M&A Integration Engine — Claude Code Memory

## Project
Next.js 14 app-router, TypeScript, Tailwind + heavy inline styles (JetBrains Mono dark theme).
All business logic lives in `lib/`; UI in `components/`; API routes in `app/api/`.

## Stack
- **Framework**: Next.js 14 (app router)
- **Language**: TypeScript strict
- **Styling**: Inline styles with a shared color palette `C` defined at top of each component — no Tailwind in component JSX
- **DB**: Neon Postgres via `@neondatabase/serverless` (`lib/db.ts`) — optional, falls back to localStorage
- **AI**: Anthropic Claude API (direct fetch in `/api/ai-guidance`) + `@ai-sdk/anthropic`

## Key files
| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces (`GeneratedDeal`, `ChecklistItem`, `AISuggestion`, …) |
| `lib/decision-tree.ts` | `generateDeal(intake)` → maps 12 intake fields to 443-item checklist + risks |
| `lib/checklist-master.ts` | All 443 FRC checklist items (large file, don't rewrite) |
| `lib/db.ts` | Neon client + `ensureSchema()` migration |
| `app/page.tsx` | Top-level state: `localStorage` primary, Neon background sync |
| `components/dashboard/Dashboard.tsx` | Main dashboard (tabs: Overview, Checklist, …) |
| `app/api/deals/route.ts` | `GET` list / `POST` create deal |
| `app/api/deals/[id]/route.ts` | `GET` fetch / `PUT` update deal |
| `app/api/ai-guidance/route.ts` | Claude API call for per-item AI guidance (prose, 3–5 sentences) |
| `app/api/ai-considerations/route.ts` | Claude API call for structured AI suggestions (two-trigger model) |

## Data flow
1. User fills `IntakeForm` (12 fields) → `handleIntakeSubmit`
2. `generateDeal(intake)` runs synchronously (decision tree in `lib/decision-tree.ts`)
3. Deal `POST`-ed to `/api/deals` → `dealId` stored in deal state; `aiSuggestions: []` initialized
4. All mutations: update React state → `saveDeal()` → localStorage + fire-and-forget `PUT /api/deals/[id]`
5. Resume: try `GET /api/deals/[id]` (Neon) first, fall back to localStorage blob

## AI Two-Trigger Model
The tool is bounded by the 443-item seeded checklist. AI supplements — never replaces — it.

### Trigger 1 — Deal Intake (deal thesis level)
- Fires async after `generateDeal()` completes (fire-and-forget, does not block dashboard render)
- Calls `POST /api/ai-considerations` with `mode: "deal"` + full `DealIntake`
- Returns 3–7 `AISuggestion` objects specific to the deal's sector/structure/jurisdictions/ERP/GAAP
- Stored in `deal.aiSuggestions[]` with `source: "deal_intake"`, `status: "pending"`
- Displayed in Overview tab "AI Considerations" panel; user must Accept or Dismiss each

### Trigger 2 — Item Update (execution discovery level)
- Fires when a checklist item status changes to `in_progress`, `complete`, or `blocked`
- Calls `POST /api/ai-considerations` with `mode: "item"` + item context + `DealIntake`
- Returns 0–3 additional steps discovered from executing that item
- Stored in `deal.aiSuggestions[]` with `source: "item_update"`, `triggerItemId` set
- Displayed in the checklist AI guidance panel under "Consider Adding to Workstream"
- Deduplicated against existing pending suggestions for the same trigger item

### Acceptance
- Accepting a suggestion creates a real `ChecklistItem` with `isAiGenerated: true`
- Item ID format: `AI-XXXXXX` (distinguishable from `FRC-XXXX` seeded items)
- Dismissed suggestions are hidden; accepted ones show count in Overview panel
- Graceful degradation: if `ANTHROPIC_API_KEY` is absent, endpoint returns `{ suggestions: [] }`

## Environment variables
```
ANTHROPIC_API_KEY=   # required for AI guidance
DATABASE_URL=        # optional Neon connection string; omit for localStorage-only mode
```

## Git
- **Active branch**: `claude/start-prototype-dev-9BrjT`
- Always develop on this branch; push with `git push -u origin claude/start-prototype-dev-9BrjT`
- Commit messages: imperative, short subject + bullet body, end with session URL
- Session URL: `https://claude.ai/code/session_019oGJi2894jiCXfV4pJmJeR`

## Conventions
- No new files unless absolutely necessary — prefer editing existing ones
- All team members are admin (no role differentiation yet)
- Graceful degradation: every DB/API call must be a no-op if `DATABASE_URL` is absent
- `saveDeal()` in `page.tsx` is the single source of truth for persistence — route all mutations through it
- Do not add comments, docstrings, or error handling for scenarios that can't happen
- Run `npm run build` to verify before every commit
