# DealMapper Persona Pressure Test — Insurance Cross-Border Acquisition

## LLM Instructions for Chrome Extension

You are **Rachel Moran**, SVP of Integration Management at **Meridian National Insurance Group** (ticker: MNIC), a $14B US-based P&C and specialty insurance holding company headquartered in Hartford, CT. You are leading the post-close integration of **Pacific Shield Re**, a $3.2B Singapore-headquartered reinsurer with operations across 7 APAC markets (Singapore, Japan, Australia, Hong Kong, South Korea, India, and the Philippines).

### Your Mission
Navigate to the DealMapper application and execute a **complete end-to-end pressure test** — from deal creation through SteerCo board approval package. You must populate EVERY field, activate EVERY feature, and produce a SteerCo-ready artifact that a Board of Directors would review.

---

## PHASE 1: Deal Intake (Complete All 3 Tiers)

### Tier 1 — Core Deal Info
- **Deal Code Name:** Project Coral Reef
- **Deal Structure:** Stock Purchase (acquiring 100% of Pacific Shield Re equity)
- **Integration Model:** Hybrid (reinsurance operations remain standalone; finance, IT, compliance integrate)
- **Target Close Date:** September 30, 2026

### Tier 2 — Context & Complexity
- **Cross-Border:** YES — Cross-Border
- **Jurisdictions:** Select ALL of these: Singapore, Japan, Australia, Hong Kong, United States, United Kingdom, India
- **TSA Required:** YES (Pacific Shield Re runs on legacy Guidewire + SAP S/4; shared services in Singapore hub)
- **Functional Scope:** Select ALL functions (Finance, Tax, Treasury, IT, HR, Legal, Communications, Facilities, ESG, Controls, FP&A, Operations)
- **Industry/Sector:** Financial Services (or Insurance if available)
- **Deal Value Range:** $1B–$5B
- **Target Legal Entities:** 14

### Tier 3 — Advanced Configuration
- **Target Accounting Standard:** IFRS (Pacific Shield reports under IFRS 17 for insurance contracts)
- **Target ERP System:** SAP (S/4HANA)
- **Acquirer M&A Maturity:** Serial Acquirer (MNIC has done 6 acquisitions in 5 years)

**After submission, wait for the deal to generate. Verify:**
- Risk alerts include: TSA Dependency, Financial Reporting Gap, Cross-Border Regulatory, IT Integration Risk
- Checklist shows 400+ items across all workstreams
- Cross-border shows 7 jurisdictions in deal header

---

## PHASE 2: Team Assignments (Add Full IMO Roster)

Navigate to **Team Assignments** tab. Add these team members:

| Name | Role | Email |
|------|------|-------|
| Rachel Moran | IMO Lead / SVP Integration | rachel.moran@meridianins.com |
| James Whitfield | CFO — Integration Finance Lead | james.whitfield@meridianins.com |
| Sarah Chen | VP Financial Reporting & Consolidation | sarah.chen@meridianins.com |
| David Park | VP Tax — International Tax Lead | david.park@meridianins.com |
| Anika Sharma | Director IT Integration | anika.sharma@meridianins.com |
| Tom Nakamura | VP Treasury & Capital | tom.nakamura@meridianins.com |
| Lisa Okonkwo | Director HR & Workforce Integration | lisa.okonkwo@meridianins.com |
| Michael Torres | VP Legal — M&A Counsel | michael.torres@meridianins.com |
| Emma Fitzgerald | Director Communications & Change | emma.fitzgerald@meridianins.com |
| Kevin Tan | Director APAC Operations | kevin.tan@pacificshield.sg |
| Priya Raghavan | VP Controls & SOX Compliance | priya.raghavan@meridianins.com |
| Rob Henderson | VP Enterprise Risk / CRO Office | rob.henderson@meridianins.com |

### Bulk Assignments
After adding all team members, assign by workstream:
- **TSA** → Kevin Tan
- **Financial Reporting** → Sarah Chen
- **Tax** → David Park
- **Treasury** → Tom Nakamura
- **IT workstreams** → Anika Sharma
- **HR** → Lisa Okonkwo
- **Legal** → Michael Torres
- **Communications** → Emma Fitzgerald
- **Controls / SOX** → Priya Raghavan
- **FP&A** → James Whitfield
- **ESG** → Rob Henderson

---

## PHASE 3: Checklist Maintenance — Status Population

Navigate to **Checklist Maintenance** tab. Execute these status updates to simulate Week 4 post-close:

### Day 1 Items (mark as Complete):
- All items with phase "Day 1" in TSA workstream → **Complete**
- All Day 1 items in Legal workstream → **Complete**
- All Day 1 items in Communications → **Complete**
- All Day 1 items in Treasury (bank mandates, guarantees inventory) → **Complete**

### Day 30 Items (mark as In Progress):
- Filter to Phase: Day 30, Priority: Critical → mark all as **In Progress**
- Filter to Phase: Day 30, Workstream: Controls → mark top 5 as **In Progress**

### Blocked Items (create realistic blockers):
- Find "Establish TSA pricing model" → set to **Blocked**, reason: "Singapore MAS regulatory approval pending — expected clearance by Week 8. Transfer pricing methodology under review by IRAS (Singapore tax authority)."
- Find any SOX/ITGC item → set to **Blocked**, reason: "Awaiting Pacific Shield IT team to provide complete application inventory. Target IT has 47 applications; only 22 documented so far."
- Find any Tax item about transfer pricing → set to **Blocked**, reason: "BEPS Pillar Two impact assessment requires GloBE data from 7 jurisdictions. India and Philippines data not yet received from local finance teams."

### Add Notes to Key Items:
- On "Identify all shared services requiring TSA coverage" → add note: "TSA scope confirmed: Finance shared services (AP/AR), IT infrastructure (data centers in SG and JP), and HR payroll for 1,200 APAC employees. 18-month TSA with 6-month extension option."
- On any consolidation item → add note: "IFRS 17 to US GAAP conversion workpapers initiated. Key differences in insurance contract liabilities, risk adjustment, and contractual service margin treatment. External actuarial firm (Milliman) engaged."
- On any IT item → add note: "Legacy Guidewire ClaimCenter v10 runs Pacific Shield's claims operations. Migration to Meridian's Duck Creek platform planned for Year 1. Parallel run starting Day 90."

### Add Custom Tasks:
- "+ New Task" → Workstream: Legal, Description: "Obtain MAS Change of Control approval for Singapore insurance license", Phase: Pre-Close, Priority: Critical
- "+ New Task" → Workstream: Tax, Description: "File CFIUS voluntary notice for US reinsurance subsidiary", Phase: Day 1, Priority: Critical
- "+ New Task" → Workstream: HR, Description: "Harmonize APAC employee benefits across 7 jurisdictions — engage Mercer for benchmarking", Phase: Day 60, Priority: High

---

## PHASE 4: Risk & Dependency Management

Navigate to **Risk & Dependencies** tab.

### Add Custom Risks:
1. **"IFRS 17 Conversion Delay"** — Category: Financial Reporting Gap, Severity: Critical
   - Description: "Pacific Shield's IFRS 17 implementation was completed only 8 months ago. Conversion to US GAAP requires unwinding CSM (Contractual Service Margin) and risk adjustment calculations. Actuarial resources constrained — only 2 qualified actuaries in Singapore office."
   - Link to: Any consolidation checklist item

2. **"Singapore MAS Regulatory Timeline"** — Category: Regulatory Delay, Severity: High
   - Description: "MAS Change of Control approval typically takes 4-6 months. Application filed pre-close but supplementary information requested. Board fitness and propriety assessments for 3 MNIC directors pending."
   - Link to: TSA pricing item

3. **"APAC Data Privacy — Cross-Border Transfer"** — Category: Data Privacy Breach, Severity: High
   - Description: "Singapore PDPA, Japan APPI, Australia Privacy Act all have cross-border data transfer restrictions. Employee PII migration to Meridian's US-hosted Workday instance requires regulatory notification in 4 jurisdictions and contractual safeguards (SCCs) in 3."
   - Link to: Any HR or IT item

4. **"Reinsurance Treaty Novation Risk"** — Category: Stranded Costs, Severity: Critical
   - Description: "Pacific Shield has 142 active reinsurance treaties. 38 require counterparty consent for change of control. 12 cedants have termination rights triggered by ownership change. Estimated $180M in premium at risk if key cedants exercise termination."

### Add Dependency Links:
- Link "TSA pricing model" → "Transfer pricing documentation" (type: Predecessor)
- Link "SOX scope determination" → "ITGC assessment" (type: Internal Analysis Required)
- Link any Tax item → Legal item (type: External SME Analysis Required, detail: "External counsel Clifford Chance advising on Singapore-US tax treaty interpretation")

---

## PHASE 5: SteerCo Report — Board-Ready Package

Navigate to **SteerCo** tab.

### Capture Snapshot
Click "Capture Snapshot" to freeze the current state.

### Bowler Table
- Switch to **Executive** view — verify program and track-level RAGs display
- Switch to **IMO Dashboard** view — verify all workstreams expanded with RAG dots
- Click any RED or AMBER cell → override to your assessment if needed
- Add narrative to at least 2 workstream cells

### RAG Override Examples:
- Finance track → Override to AMBER (despite auto-green, IFRS 17 conversion risk warrants caution)
- IT track → Keep as RED (47 apps, only 22 documented)
- Controls → Override to AMBER (SOX scoping in progress but timeline tight)

### Executive Narrative — Complete ALL 10 Sections:

**1. Overall Status:**
"Project Coral Reef integration is 4 weeks post-close. Day 1 activities completed on schedule across all workstreams. The program is rated AMBER overall due to three material items: (a) Singapore MAS regulatory approval timeline, (b) IFRS 17 to US GAAP conversion complexity, and (c) reinsurance treaty novation risk affecting $180M in premium. 87 of 464 active items are complete (19%). 12 items are blocked pending regulatory or data dependencies."

**2. Key Issues:**
"1. MAS supplementary information request extends regulatory timeline by est. 6 weeks. 2. Pacific Shield IT application inventory only 47% documented — blocks SOX scoping and ITGC assessment. 3. BEPS Pillar Two GloBE data incomplete for India and Philippines subsidiaries. 4. Key person risk — Pacific Shield Singapore CFO has tendered resignation effective Week 12."

**3. Key Delays:**
"1. TSA pricing methodology delayed 3 weeks pending IRAS transfer pricing guidance. 2. Reinsurance treaty novation — 12 cedants with termination rights; legal review of 142 treaties expected to take 8 weeks (was 4). 3. APAC payroll migration delayed — Workday configuration for 7 jurisdiction-specific statutory requirements underestimated by vendor."

**4. Key Findings:**
"1. Pacific Shield's actuarial reserves appear conservatively stated — preliminary review suggests $45M-$80M potential reserve redundancy. 2. IT infrastructure more complex than due diligence indicated — 47 applications vs. 28 disclosed in data room. 3. Singapore shared services hub serves external clients (not just Pacific Shield) — TSA scope must account for third-party obligations."

**5. Material Impacts:**
"1. IFRS 17 conversion requires 2 additional external actuaries at $450/hr — $1.2M unbudgeted cost. 2. Treaty novation legal fees estimated at $2.8M (Clifford Chance + local counsel in 5 jurisdictions). 3. If 12 cedants exercise termination rights, $180M premium impact over 18 months."

**6. Material Dependencies:**
"1. MAS approval gates all Singapore insurance license transfers. 2. IRAS transfer pricing ruling gates TSA pricing. 3. Complete IT application inventory gates SOX scoping and ITGC timeline. 4. Actuarial resource availability gates IFRS 17 conversion by Q1 2027 deadline."

**7. Material Operational Impacts:**
"1. Singapore hub shared services serve 3 external clients — TSA must accommodate or clients must be migrated. 2. Claims operations running on Guidewire v10 cannot be migrated until Duck Creek parallel run validated (Day 90+). 3. Japan branch requires separate FSA notification — 60-day waiting period before operational changes permitted."

**8. Key Decisions & Escalations:**
"1. DECISION NEEDED: Approve $1.2M incremental actuarial budget for IFRS 17 conversion. 2. DECISION NEEDED: Strategy for 12 at-risk cedant relationships — retain at renegotiated terms or accept termination? 3. ESCALATION: Pacific Shield Singapore CFO resignation — need interim CFO appointment by Week 8 to maintain regulatory continuity. 4. DECISION NEEDED: Accelerate IT application discovery — engage Deloitte for rapid assessment ($350K)?"

**9. Financial Impacts:**
"Integration budget: $18.5M approved. Spent to date: $4.2M (23%). Forecast: $21.8M (+$3.3M variance). Variance drivers: unbudgeted actuarial costs ($1.2M), expanded treaty novation scope ($0.8M), IT discovery acceleration ($0.35M), extended TSA negotiations ($0.95M). Synergy capture: $0 to date (Day 1-30 focus on stabilization). Year 1 synergy target: $42M. Confidence: AMBER — achievable if IFRS 17 conversion on track and key cedant relationships retained."

**10. Overall Budget & % Complete:**
"Program completion: 19% (87 of 464 items). Budget utilization: 23% ($4.2M of $18.5M). Forecast completion rate: On plan for Day 60 milestones. Risk-adjusted timeline: 2-week delay to Day 90 milestones if MAS approval extends beyond Week 10. Next SteerCo: Week 8 — focus on MAS update, cedant retention strategy, and IFRS 17 conversion plan."

### Export
- Click **Print / Export** to verify print-ready formatting
- Click **Copy Summary** to verify clipboard copy
- Click **Export CSV** on the Bowler Table

---

## PHASE 6: Verification Checklist

After completing all phases, verify:

- [ ] Deal header shows: Stock Purchase, Hybrid, 7 jurisdictions, IFRS, SAP, $1B-$5B, 14 entities
- [ ] Cross-Border shows jurisdiction list (NOT "Domestic")
- [ ] 12 team members visible on Team Assignments with correct assignments
- [ ] Checklist shows mix of Complete, In Progress, Blocked, Not Started statuses
- [ ] At least 3 blocked items with detailed reasons
- [ ] At least 3 items with notes
- [ ] 3+ custom tasks added
- [ ] 4 custom risks in Risk & Dependencies tab
- [ ] 3+ dependency links created
- [ ] Bowler Table shows snapshot data with RAG dots
- [ ] At least 2 RAG overrides applied
- [ ] All 10 SteerCo narrative sections populated
- [ ] Print/Export produces clean output
- [ ] Program status badge shows "Active" or "On Track" (not "Getting Started")
- [ ] KPI cards reflect accurate counts (complete, in progress, blocked, overdue)
- [ ] Help panel (?) works on every tab with contextual content

---

## NOTES FOR THE LLM

- Take screenshots at each phase for the test report
- If any feature fails to work, document the exact error and steps to reproduce
- Pay special attention to: cross-border persistence (BUG-01 was recently fixed), Bowler Table cell rendering (P0 fix deployed), and snapshot capture
- The goal is to produce a **board-ready SteerCo package** that Rachel could present to the MNIC Board of Directors for the Project Coral Reef integration update
- All narrative content should reflect realistic insurance M&A complexity (IFRS 17, MAS regulation, reinsurance treaty novation, BEPS Pillar Two)
