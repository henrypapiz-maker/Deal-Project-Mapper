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
| `lib/types.ts` | All TypeScript interfaces (`GeneratedDeal`, `ChecklistItem`, `TeamMember`, …) |
| `lib/decision-tree.ts` | `generateDeal(intake)` → maps 12 intake fields to 443-item checklist + risks |
| `lib/checklist-master.ts` | All 443 FRC checklist items (large file, don't rewrite) |
| `lib/db.ts` | Neon client + `ensureSchema()` migration |
| `app/page.tsx` | Top-level state: `localStorage` primary, Neon background sync |
| `components/dashboard/Dashboard.tsx` | Main dashboard (tabs: Overview, Checklist, …) |
| `app/api/deals/route.ts` | `GET` list / `POST` create deal |
| `app/api/deals/[id]/route.ts` | `GET` fetch / `PUT` update deal |
| `app/api/ai-guidance/route.ts` | Claude API call for per-item AI guidance |

## Data flow
1. User fills `IntakeForm` (12 fields) → `handleIntakeSubmit`
2. `generateDeal(intake)` runs synchronously (decision tree in `lib/decision-tree.ts`)
3. Deal `POST`-ed to `/api/deals` → `dealId` stored in deal state
4. All mutations: update React state → `saveDeal()` → localStorage + fire-and-forget `PUT /api/deals/[id]`
5. Resume: try `GET /api/deals/[id]` (Neon) first, fall back to localStorage blob

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
