# Workstream Taxonomy v1 — 4 Tracks, 24 Workstreams

## Track Structure

```
FINANCE (8 workstreams)
├── TSA                                   FIN-TSA     FIN-0001–0070
├── Technical Accounting                  FIN-TECH    FIN-0071–0090
├── Financial Reporting & Consolidation   FIN-CONS    FIN-0091–0122
├── FP&A                                  FIN-FPA     FIN-0305–0332
├── Operational Finance                   FIN-OPS     FIN-0123–0190
├── Income Tax                            FIN-TAX     FIN-0235–0272
├── Treasury                              FIN-TRE     FIN-0273–0304
└── (items shared across Finance track)

CONTROLS & GOVERNANCE (2 workstreams)
├── Controls                              CGV-CTL     CGV-0191–0220
└── Governance & Compliance               CGV-GOV     CGV-0221–0234

IT (6 sub-workstreams under IT parent)
├── IT Strategy & Governance              IT-STR      IT-0444–0460
├── IT > Enterprise Systems               IT-ES       IT-0461–0470
├── IT > Infrastructure                   IT-INF      IT-0471–0478
├── IT > Data & Analytics                 IT-DA       IT-0479–0483
├── IT > IT Vendor Management             IT-VM       IT-0484–0486
└── IT > Client-Facing & Digital          IT-CF       IT-0487–0489

OTHER (8 workstreams)
├── ESG                                   ESG         FIN-0369–0390
├── Integration Management                INT         FIN-0391–0425
├── Facilities                            FAC         FIN-0426–0443
├── Human Resources                       HR          HR-0490–0504
├── Legal                                 LGL         LGL-0505–0518
├── Communications                        COM         COM-0519–0531
├── Deal Mechanics                        DM          (custom items)
└── (additional workstreams as needed)
```

## Item ID Prefixes

| Prefix | Track | Range |
|--------|-------|-------|
| FIN- | Finance | 0001–0443 |
| CGV- | Controls & Governance | 0191–0234 |
| IT- | IT | 0444–0489 |
| HR- | Other (Human Resources) | 0490–0504 |
| LGL- | Other (Legal) | 0505–0518 |
| COM- | Other (Communications) | 0519–0531 |

## Dependency Classification Types

| Type Code | Label | Description |
|-----------|-------|-------------|
| PRED | Predecessor | Must complete first |
| INT_ANALYSIS | Internal Analysis Required | Needs internal team analysis |
| EXT_SME | External SME Analysis Required | Needs external advisor input |
| REG_APPROVAL | Regulatory Approval Required | Blocked pending regulatory action |

## Risk Categories

| Category | Description |
|----------|-------------|
| financial_reporting_gap | GAAP conversion, consolidation risks |
| regulatory_delay | Antitrust, CFIUS, MAS, FSA approvals |
| tsa_dependency | TSA exit timeline risks |
| stranded_costs | Costs that can't be eliminated post-close |
| tax_structure_leakage | Transfer pricing, Pillar Two, NOL issues |
| data_privacy_breach | Cross-border data transfer, PDPA, GDPR |
