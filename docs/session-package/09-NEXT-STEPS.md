# Next Steps — Prioritized Backlog

## P0 — Must Fix Before Next Demo
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Bowler Table snapshot hydration (React state disconnect) | Medium | SteerCo core feature broken |
| 2 | Notes counter visual update after add | Low | Trust erosion |
| 3 | Coral Reef data recovery from Chrome localStorage → DB | Low | Pressure test data lost |

## P1 — High Value Features
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 4 | Authentication (NextAuth/Clerk) | High | Multi-user, security |
| 5 | Real autosave verification (confirm DB writes succeed) | Medium | Data integrity |
| 6 | Hong Kong + South Korea + Thailand jurisdictions | Low | APAC deal coverage |
| 7 | Due date mapping (phase → actual date from close date) | Medium | Overdue tracking functional |
| 8 | Pre-Close phase on Timeline tab | Low | Complete timeline view |
| 9 | Risk register deduplication (auto vs manual) | Medium | Cleaner risk view |

## P2 — Polish & Enhancement
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 10 | Multi-deal portfolio comparison view | High | Serial acquirer value |
| 11 | Team workload balance indicator / heat map | Medium | Resource planning |
| 12 | Timeline click-through to checklist items | Medium | Navigation |
| 13 | PPT file export (actual .pptx via pptxgenjs) | High | Real deliverable |
| 14 | Excel export of full deal data | Medium | External reporting |
| 15 | Notification system (email on blocked items) | High | Proactive management |

## P3 — Future Vision
| # | Item | Effort | Impact |
|---|------|--------|--------|
| 16 | Real-time multi-user collaboration (WebSockets) | Very High | Team productivity |
| 17 | Deal template library (Insurance, Tech, Healthcare) | Medium | Faster setup |
| 18 | Integration with external tools (Jira, Asana, Monday) | High | Workflow integration |
| 19 | Mobile responsive design | High | On-the-go access |
| 20 | Historical deal benchmarking | Very High | Pattern recognition |

## Technical Debt
| # | Item | Effort |
|---|------|--------|
| T1 | Split Dashboard.tsx (2527 lines) into sub-components | High |
| T2 | Add proper error boundaries | Medium |
| T3 | Add unit tests (Vitest framework exists but tests outdated) | High |
| T4 | Migrate inline styles to Tailwind CSS | High |
| T5 | Add proper TypeScript enums for all DB ENUM types | Low |
| T6 | API route input validation (zod) | Medium |
