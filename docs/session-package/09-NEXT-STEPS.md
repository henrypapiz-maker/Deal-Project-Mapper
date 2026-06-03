# Next Steps — Prioritized Backlog

*Last updated: Session 2, June 2026*

---

## ✅ Completed (Session 2)

| Item | Shipped in |
|------|-----------|
| Multi-deal portfolio view with search, sort, pagination | v0.5.5 / Session 1 |
| Admin archive/unarchive deals (soft delete) | v0.7.1 / Session 2 |
| Admin export deal to JSON | v0.7.1 / Session 2 |
| Admin bulk select + archive/delete | v0.7.1 / Session 2 |
| Intake form UX overhaul (field reorder, Tier 0, workstream badges) | v0.7.0 / Session 2 |
| 3 new functional areas (Commercial, Compliance, Regulatory) | v0.7.0 / Session 2 |
| Prompt Library structured fields (role, context, format, reasoning, example) | v0.7.1 / Session 2 |
| General Context Bucket (Tier 3) | v0.7.0 / Session 2 |
| Prompt Library: field-level containers + Historic Repository tier | Session 2 |

---

## P0 — Must Fix Before Next Demo

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Bowler Table snapshot hydration (React state disconnect) | Medium | SteerCo core feature broken |
| 2 | Notes counter visual update after add | Low | Trust erosion |
| 3 | Verify `commercials`, `compliance`, `regulatory` mapped in `decision-tree.ts` | Low | New function areas show 0 checklist items |

---

## P1 — High Value Features

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 4 | Authentication (NextAuth / Clerk) | High | Multi-user, role enforcement, security |
| 5 | Real autosave verification (confirm DB writes succeed visually) | Medium | Data integrity trust |
| 6 | Due date mapping (phase → actual date from close date) | Medium | Overdue tracking functional |
| 7 | Pre-Close phase on Timeline tab | Low | Complete timeline view |
| 8 | Risk register deduplication (auto vs manual) | Medium | Cleaner risk view |
| 9 | Prompt Library: enrich remaining 52 seed prompts with role/context/format/reasoning | Medium | Full structured prompt coverage |
| 10 | Prompt Library: use `contextSource` to prefetch data slices for AI API calls | High | Smarter AI responses with targeted context |

---

## P2 — Polish & Enhancement

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 11 | Team workload balance indicator / heat map | Medium | Resource planning |
| 12 | Timeline click-through to checklist items | Medium | Navigation |
| 13 | PPT file export (actual .pptx via pptxgenjs) | High | Real deliverable |
| 14 | Excel export of full deal data | Medium | External reporting |
| 15 | Notification system (email on blocked items) | High | Proactive management |
| 16 | Export deal as PDF (currently JSON only) | Medium | Exec-friendly output |
| 17 | Tier 0 profile: "last used" sort + usage count | Low | Better profile management |
| 18 | Admin mode: per-deal status edit from portfolio (pre_close → complete etc.) | Low | Data governance |

---

## P3 — Future Vision

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 19 | Real-time multi-user collaboration (WebSockets) | Very High | Team productivity |
| 20 | Deal template library (Insurance, Tech, Healthcare) | Medium | Faster setup |
| 21 | Integration with external tools (Jira, Asana, Monday) | High | Workflow integration |
| 22 | Mobile responsive design | High | On-the-go access |
| 23 | Historical deal benchmarking | Very High | Pattern recognition |
| 24 | Multi-deal portfolio comparison view | High | Serial acquirer value |

---

## Technical Debt

| # | Item | Effort |
|---|------|--------|
| T1 | Split Dashboard.tsx (~2,600 lines) into sub-components | High |
| T2 | Add proper error boundaries | Medium |
| T3 | Add unit tests (Vitest framework exists but tests outdated) | High |
| T4 | Migrate inline styles to Tailwind CSS | High |
| T5 | Add proper TypeScript enums for all DB ENUM types | Low |
| T6 | API route input validation (zod) | Medium |
| T7 | Enrich remaining 52 seed prompts with new structural fields | Medium |
| T8 | Add `contextSource`-aware data prefetch to `/api/assistant` route | High |
