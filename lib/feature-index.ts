// Condensed feature reference injected into the agent system prompt.
// Full reference: docs/FEATURE_INDEX.md
export const FEATURE_INDEX_PROMPT = `
APP TABS — what lives where:
| Tab ID       | What's there |
|--------------|--------------|
| live_status  | KPI cards, workstream RAG grid (24 cards), burndown chart, dependency matrix, RAG trend sparklines |
| checklist    | Full item list with filters, add/edit items, bulk actions, CSV export, AI guidance per item |
| team         | Team roster, workload table per person, permission level management |
| risks        | Risk register (8 auto-detected categories + manual), dependency matrix, dependency type linking |
| timeline     | Phase milestones (Pre-Close→Day 1→Day 30→60→90→Year 1), per-workstream phase breakdown |
| steerco      | 10-section narrative drafter, executive summary, pressure test, slide deck generator, snapshots |
| admin        | Deal settings, team permissions, export/import JSON, audit log, API status test, Neon branch operations (Section J: branch status, cold-start guidance, schema migration procedures, write-back protocol) |
| agent        | Role permissions matrix, prompt library, named skills, synthesized documents |

CHECKLIST FILTER VALUES:
- phase: pre_close | day_1 | day_30 | day_60 | day_90 | year_1
- status: not_started | in_progress | blocked | complete | na | overdue
- priority: critical | high | medium | low
- workstream: any of the 24 workstream names or a custom name

DOCUMENT SYNTHESIS (synthesize_document):
- status_report: KPIs, workstream breakdown, blocked items, risks, next steps (Markdown)
- risk_memo: Risk register, severity breakdown, mitigations, trajectory (Markdown)
- task_report: Per-owner task lists by priority/status (Markdown)
- csv_export: All checklist items as CSV

SKILLS (run_skill): Named multi-step workflows defined in Agent → Skills tab.
Example: "Weekly Checkpoint" = snapshot → filter overdue → navigate steerco → draft report.

PERMISSION ROLES:
- admin: full access
- imo_lead: checklist edits, narratives, synthesis, snapshots
- workstream_lead: own workstream edits, assign owners, draft reports
- viewer: navigate + filter only, no mutations
- external: no app actions

WORKSTREAM TRACKS (24 total):
- Finance (7): TSA, Technical Accounting, Financial Reporting & Consolidation, FP&A, Operational Finance, Income Tax, Treasury
- Controls & Governance (2): Controls, Governance & Compliance
- IT (6): IT Strategy & Governance, IT > Enterprise Systems, IT > Infrastructure, IT > Data & Analytics, IT > IT Vendor Management, IT > Client-Facing & Digital
- Other (6): ESG, Integration Management, Facilities, Human Resources, Legal, Communications
- Custom: R&D, Commercial, Supply Chain, Customer Success, or any user-defined name

PHASE DATES (from close date):
- pre_close: before Day 0  |  day_1: close date  |  day_30: +30d  |  day_60: +60d  |  day_90: +90d  |  year_1: +365d

STEERCO NARRATIVE SECTIONS (10):
overallStatus | keyIssues | keyDelays | keyFindings | materialImpacts | materialDependencies | materialOperationalImpacts | keyDecisionsEscalations | financialImpacts | overallBudget

LIVE STATUS — RAG auto-computation:
- Red: blocked% > 20% OR past-due% > 15%
- Amber: blocked% > 10% OR past-due% > 8%
- Green: otherwise
RAG can be manually overridden per workstream via the workstream card detail panel.`;
