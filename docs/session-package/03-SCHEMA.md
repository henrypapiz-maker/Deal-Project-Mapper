# Neon Database Schema — 14 Tables

**Connection:** `postgresql://neondb_owner:***@ep-ancient-mountain-ai7vu90g-pooler.c-4.us-east-1.aws.neon.tech/neondb`

## Table: `deals`
Primary deal record. One row per integration deal.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| name | VARCHAR | Deal code name |
| deal_structure | ENUM | stock_purchase, asset_purchase, merger_reverse, carve_out |
| integration_model | ENUM | full, hybrid, standalone |
| close_date | DATE | Target or actual close date |
| cross_border | BOOLEAN | |
| jurisdictions | JSONB | Array of jurisdiction strings |
| tsa_required | ENUM | yes, no, tbd |
| industry_sector | VARCHAR | |
| shared_services | JSONB | Array of shared service categories |
| deal_value_range | VARCHAR | e.g., "$1B-$5B" |
| target_entities | INTEGER | Number of legal entities |
| target_gaap | VARCHAR | US GAAP, IFRS, etc. |
| target_erp | VARCHAR | SAP, Oracle, etc. |
| buyer_maturity | VARCHAR | first_time, occasional, serial |
| acquirer_gaap | VARCHAR | |
| acquirer_fye | DATE | Fiscal year end |
| functional_scope | JSONB | Array of active functions |
| status | VARCHAR | active, archived |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| archived_at | TIMESTAMPTZ | |

## Table: `checklist_items`
One row per checklist item per deal.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| deal_id | UUID (FK → deals) | |
| item_id | VARCHAR | FIN-0001, CGV-0192, IT-0444, etc. |
| workstream | VARCHAR | TSA, Financial Reporting, etc. |
| section | VARCHAR | Sub-section within workstream |
| description | TEXT | Item description |
| phase | VARCHAR | pre_close, day_1, day_30, day_60, day_90, year_1 |
| milestone_date | DATE | Computed from close date + phase |
| priority | ENUM | critical, high, medium, low |
| status | ENUM | not_started, in_progress, complete, blocked, na |
| owner_id | UUID (FK → team_members) | |
| dependencies | JSONB | Array of item IDs |
| tsa_relevant | BOOLEAN | |
| cross_border_flag | BOOLEAN | |
| risk_indicators | JSONB | Array of risk category strings |
| functional_area | VARCHAR | finance, tax, treasury, operations, it, hr |
| ai_guidance | TEXT | Cached AI guidance |
| notes | JSONB | Array of {id, text, timestamp, author} |
| attachments | JSONB | Array of {id, name, url, addedAt} |
| evidence_url | VARCHAR | Link to supporting evidence |
| blocked_reason | TEXT | |
| na_justification | TEXT | |
| updated_at | TIMESTAMPTZ | |

## Table: `team_members`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| deal_id | UUID (FK → deals) | |
| name | VARCHAR | Full name |
| email | VARCHAR | |
| role | VARCHAR | IMO Lead, Workstream Lead, etc. |
| workstreams | JSONB | Array of assigned workstream names |
| created_at | TIMESTAMPTZ | |

## Table: `risk_alerts`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| deal_id | UUID (FK → deals) | |
| category | VARCHAR | financial_reporting_gap, regulatory_delay, etc. |
| severity | VARCHAR | critical, high, medium, low |
| description | TEXT | |
| indicators | JSONB | |
| affected_items | JSONB | Array of linked item IDs |
| mitigation | TEXT | |
| status | VARCHAR | open, mitigated, closed |
| created_at | TIMESTAMPTZ | |
| resolved_at | TIMESTAMPTZ | |

## Table: `reporting_periods`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| deal_id | UUID (FK → deals) | |
| period_label | VARCHAR | "Week 1", "Day 30", etc. |
| period_type | VARCHAR | weekly, milestone |
| period_start | DATE | |
| period_end | DATE | |
| is_current | BOOLEAN | |
| sequence_num | INTEGER | |
| created_at | TIMESTAMPTZ | |

## Table: `bowler_cells`
One row per workstream per period. Forms the bowler table grid.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| deal_id | UUID (FK → deals) | |
| period_id | UUID (FK → reporting_periods) | |
| level | VARCHAR | program, track, workstream |
| row_key | VARCHAR | Track name or workstream name (null for program) |
| computed_rag | VARCHAR | Auto-computed from item stats |
| override_rag | VARCHAR | Manual override by IMO/SteerCo |
| override_by | UUID | Who overrode |
| override_at | TIMESTAMPTZ | When overrode |
| metrics | JSONB | {total, completed, inProgress, blocked, pastDue, pctComplete} |
| narrative | TEXT | Period narrative for this workstream |
| key_risks | TEXT | |
| next_steps | TEXT | |
| highlighted_items | JSONB | Item IDs called out for SteerCo |
| attachments | JSONB | |
| author_id | UUID | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## Table: `steerco_narratives`
One row per reporting period. Stores the 10-section executive narrative.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | |
| deal_id | UUID (FK → deals) | |
| period_id | UUID (FK → reporting_periods) | |
| period_label | VARCHAR | |
| overall_status | TEXT | Section 1 |
| key_issues | TEXT | Section 2 |
| key_delays | TEXT | Section 3 |
| key_findings | TEXT | Section 4 |
| material_impacts | TEXT | Section 5 |
| material_dependencies | TEXT | Section 6 |
| material_operational_impacts | TEXT | Section 7 |
| key_decisions_escalations | TEXT | Section 8 |
| financial_impacts | TEXT | Section 9 |
| overall_budget | TEXT | Section 10 |
| pct_complete | NUMERIC | |
| author_id | UUID | |
| status | VARCHAR | draft, ai_draft, final |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

## Table: `progress_snapshots`

| Column | Type |
|--------|------|
| id | UUID (PK) |
| deal_id | UUID (FK) |
| period_end | DATE |
| summary | JSONB |
| workstreams | JSONB |
| owners | JSONB |
| created_at | TIMESTAMPTZ |

## Table: `item_period_status`
Historical status per item per period (for trend tracking).

| Column | Type |
|--------|------|
| id | UUID (PK) |
| deal_id | UUID (FK) |
| period_id | UUID (FK) |
| item_id | VARCHAR |
| status | VARCHAR |
| priority | VARCHAR |
| owner_id | UUID |
| blocked_reason | TEXT |
| notes_count | INTEGER |
| attachments_count | INTEGER |
| created_at | TIMESTAMPTZ |

## Tables: `milestones`, `saved_filters`, `tsa_services`, `report_exports`, `view_preferences`
Supporting tables for milestones, user-saved filter views, TSA service tracking, export history, and user view preferences.
