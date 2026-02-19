# M&A Integration Engine

**AI-Driven Deal Workflow System — Prototype Package v1.0 Beta**

*February 2026 | DRAFT*

---

## Overview

The M&A Integration Engine transforms deal management from static spreadsheets into an adaptive, AI-driven workflow system. A consultant enters 5–12 intake fields and receives a fully configured, contextually-aware integration program within 30 seconds — complete with risk assessment, AI guidance prompts, and phase-appropriate milestones.

**Target Persona:** Consultant or PMO advisor on a deal team, managing post-close integration from Day 1 through Year 1.

**MVP Scope:** Variant A (Reactive Monitor) — Single-agent, event-driven. All actions require human confirmation. 4–6 week development effort.

---

## Package Contents

### Core Documents

| File | Description | Pages |
|------|-------------|-------|
| `MA_Integration_Engine_PRD_v1.docx` | **Comprehensive PRD** — 10 sections covering functional requirements (18 FRs), training data architecture (3-layer strategy), 7 discrete training tools, data model (13 tables), technology stack, NFRs, implementation roadmap, and open questions. Prototype-ready specification. | ~30 |
| `MA_Training_Model_Framework.docx` | **Knowledge Base** — Deal structure taxonomy, legal entity types, cross-border regulatory framework (CFIUS, EUMR, HSR, FSR, NSI Act), international tax (Pillar Two, GILTI, transfer pricing), TSA decision framework, due diligence knowledge base, integration risk taxonomy (7 categories), PRD cross-reference. 70+ authoritative sources. | ~25 |
| `MA_Decision_Tree_Agentic_Workflow.docx` | **Logic Specification** — 12-field intake form (3 tiers), decision cascade logic, dynamic checklist engine (5-state lifecycle, 7 adaptation triggers), 3 phased agentic variants (Reactive Monitor → Proactive Advisor → Autonomous Orchestrator), technology architecture, consolidated input requirements, variant comparison matrix. | ~25 |

### Data & UI Artifacts

| File | Description |
|------|-------------|
| `Finance_Checklist_PRD_Reformatted.xlsx` | **Master Checklist** — 443 line items (FRC-0001 to FRC-0443) across 12 workstreams. 7 analytical tabs: Main Checklist, Phase Timeline View, Importance Matrix, Dependencies, Day 1 Critical Path, PRD FR Traceability, Summary Statistics. |
| `PMO_Dashboard_Wireframe.jsx` | **Dashboard Wireframe** — Interactive React component with 4 tabs (Overview, Checklist, Risks, Timeline). Deal context bar, KPI cards, workstream progress heat map, risk register, milestone countdown. Sample deal: "Project Meridian" (reverse triangular merger, cross-border US/EU/UK, technology, $1B–$5B). |
| `Neon_Data_Model.jsx` | **Database Schema** — Interactive schema browser with 3 views (Tables, Relationships, SQL). 9 tables across 3 schemas. Full column definitions, FK relationships, sample DDL with PostgreSQL triggers, materialized views, and row-level security. |

### Source Data

| File | Description |
|------|-------------|
| `Finance_-_Initial_Finance_Readiness_Checklist_Integration_Revised_1-29-26.xlsx` | **Original Source** — Raw finance readiness checklist that was reformatted into the 443-item structured checklist with PRD taxonomy mapping. |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION CONTAINER                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  React +  │  │  Claude  │  │  Neon    │  │ docx-js │ │
│  │ Tailwind  │  │   API    │  │ Postgres │  │ pptx-js │ │
│  │ Dashboard │  │ Reasoning│  │  + JSONB  │  │ Export  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       └──────────────┴─────────────┴─────────────┘      │
│                     Vercel Serverless                     │
└─────────────────────────────────────────────────────────┘
                            │
                    Neon PostgreSQL
                   (shared database)
                            │
┌─────────────────────────────────────────────────────────┐
│                   TRAINING CONTAINER                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Prompt  │  │   Eval   │  │ Scenario │  │Knowledge│ │
│  │  Studio  │  │ Harness  │  │Simulator │  │Ingestion│ │
│  │  (T-1)   │  │  (T-3)   │  │  (T-5)   │  │  (T-2)  │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                    Docker / Cloud Run                     │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Phase |
|-------|-----------|-------|
| Database | Neon (Serverless Postgres) + pgvector | Phase 1 |
| AI Reasoning | Claude API (Sonnet/Opus) | Phase 1 |
| Frontend | React + Tailwind CSS | Phase 1 |
| Document Engine | docx-js / pptx-js | Phase 1 |
| Hosting | Vercel Serverless | Phase 1 |
| Agent Orchestration | LangGraph (Python) | Phase 2 |
| Tool Integration | MCP (Model Context Protocol) | Phase 2 |
| Vector Search | pgvector (Neon extension) | Phase 2–3 |

## Training Data Strategy

The system uses a three-layer knowledge approach:

1. **Structured Prompt Engineering (Phase 1)** — System prompts encode the Training Model Framework directly. Guidance templates stored in `config.guidance_library`. Risk detection rules as JSON predicates in `config.risk_rules`. Fastest to iterate, lowest cost.

2. **RAG via pgvector (Phase 2–3)** — Vector embeddings of 70+ authoritative M&A sources stored alongside relational data in Neon. Hybrid retrieval combines semantic search with structured SQL filters. Eliminates need for a separate vector database.

3. **Fine-Tuning (Reserved)** — Only pursued when Layers 1–2 hit measurable performance ceilings. The `audit.ai_feedback` table captures accept/reject signals from Day 1, building the labeled dataset for eventual fine-tuning.

## Database Schema (13 Tables, 4 Schemas)

| Schema | Tables | Purpose |
|--------|--------|---------|
| `public` | deals, checklist_items, team_members, risk_alerts, tsa_services | Core transactional data |
| `config` | risk_rules, guidance_library, prompt_versions | Pre-loaded reference data |
| `audit` | status_history, ai_feedback | Immutable event logs |
| `knowledge` | documents, chunks | RAG embeddings (Phase 2+) |
| `agents` | agent_state | Agent memory (Phase 2+) |

## Implementation Roadmap

| Timeline | Phase | Key Deliverables |
|----------|-------|-----------------|
| Weeks 1–2 | Foundation | Intake form, decision tree engine, checklist generation, Prompt Studio |
| Weeks 3–4 | Core Engine | State machine, risk scanner, deadline monitor, AI guidance |
| Weeks 5–6 | Polish & Validate | Full dashboard, document export, end-to-end validation |
| Weeks 7–12 | Phase 2 Prep | RAG pipeline, pgvector embeddings, multi-agent design |
| Weeks 13–24 | Phase 2 Deploy | LangGraph orchestration, 5 specialized agents, MCP integration |

## Phased Agentic Variants

| Variant | AI Role | Dev Effort | Best For |
|---------|---------|-----------|----------|
| **A: Reactive Monitor** (MVP) | Observer — surfaces info reactively | 4–6 weeks | First-time AI in M&A; proof of concept |
| **B: Proactive Advisor** | Advisor — generates recommendations | 8–12 weeks | Complex cross-border deals |
| **C: Autonomous Orchestrator** | Executor — acts within guardrails | 16–24 weeks | Serial acquirers; PE platforms |

## How to Use This Package

### For Prototyping (Manus / Claude Code)
1. Start with the **PRD** (`MA_Integration_Engine_PRD_v1.docx`) for the complete specification
2. Use the **Neon Data Model** (`Neon_Data_Model.jsx`) to set up the database — the SQL tab has production-ready DDL
3. Load the **Finance Readiness Checklist** (`Finance_Checklist_PRD_Reformatted.xlsx`) as seed data for `checklist_items`
4. Reference the **Decision Tree** (`MA_Decision_Tree_Agentic_Workflow.docx`) Section 3.2 for the workflow generation pseudocode
5. Use the **Dashboard Wireframe** (`PMO_Dashboard_Wireframe.jsx`) as the frontend specification

### For AI Training
1. Extract prompt templates from the **Training Model Framework** Sections 5.1 and 6 for the `guidance_library` and `risk_rules` tables
2. Set up the **Prompt Studio** (Training Tool T-1) and **Evaluation Harness** (T-3) in the training container
3. Use the **Scenario Simulator** (T-5) to validate decision tree logic before deployment

### For Stakeholder Communication
1. The **PRD** Section 2.3 defines success metrics
2. The **Decision Tree** Section 8 provides the variant comparison matrix
3. The **Dashboard Wireframe** demonstrates the end-user experience

---

## Open Questions (Pending Decision)

- Q1: Multi-deal support from Day 1 or single-deal MVP?
- Q2: Authentication provider (Clerk vs Auth0 vs Supabase Auth)?
- Q3: Web search for Phase 2 agents or pre-ingested data only?
- Q4: Approval workflow for AI risk alerts on SteerCo dashboard?
- Q5: Existing document repository for Phase 3 vector search?
- Q6: Pricing model (standalone SaaS vs. consulting bundle)?
- Q7: Embedding model (OpenAI vs Cohere vs open-source)?

---

*M&A Integration Engine — Prototype Package v1.0 Beta — February 2026*
