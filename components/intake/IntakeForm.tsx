"use client";

import { useState } from "react";
import type { DealIntake, DealStructure, IntegrationModel, TsaRequired, FunctionalArea } from "@/lib/types";

const COLORS = {
  navy: "#0F1B2D",
  deepBlue: "#1B2A4A",
  accent: "#3B82F6",
  accentLight: "#60A5FA",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
};

const DEAL_STRUCTURES: { value: DealStructure; label: string; desc: string }[] = [
  { value: "stock_purchase",  label: "Stock Purchase",            desc: "Acquires all outstanding shares; inherits all liabilities" },
  { value: "asset_purchase",  label: "Asset Purchase",            desc: "Selective asset acquisition; excludes most liabilities" },
  { value: "merger_forward",  label: "Forward Merger",            desc: "Target merges into acquirer; target ceases to exist" },
  { value: "merger_reverse",  label: "Reverse Triangular Merger", desc: "Sub merges into target; target survives as subsidiary" },
  { value: "carve_out",       label: "Carve-Out",                 desc: "Business unit carved from parent; high TSA complexity" },
  { value: "f_reorg",         label: "F-Reorganization",          desc: "Tax-free holding company restructuring" },
];

const INTEGRATION_MODELS: { value: IntegrationModel; label: string; desc: string }[] = [
  { value: "fully_integrated", label: "Fully Integrated", desc: "All systems, teams, and processes unified into acquirer" },
  { value: "hybrid",           label: "Hybrid",           desc: "Partial integration; some functions remain standalone" },
  { value: "standalone",       label: "Standalone",       desc: "Target operates independently post-close" },
];

const JURISDICTIONS = [
  { code: "US",    label: "United States" },
  { code: "EU-DE", label: "Germany (EU)" },
  { code: "EU-FR", label: "France (EU)" },
  { code: "EU-NL", label: "Netherlands (EU)" },
  { code: "EU-IE", label: "Ireland (EU)" },
  { code: "EU-LU", label: "Luxembourg (EU)" },
  { code: "EU-ES", label: "Spain (EU)" },
  { code: "UK",    label: "United Kingdom" },
  { code: "CA",    label: "Canada" },
  { code: "AU",    label: "Australia" },
  { code: "JP",    label: "Japan" },
  { code: "SG",    label: "Singapore" },
  { code: "HK",    label: "Hong Kong" },
  { code: "KR",    label: "South Korea" },
  { code: "PH",    label: "Philippines" },
  { code: "TH",    label: "Thailand" },
  { code: "VN",    label: "Vietnam" },
  { code: "TW",    label: "Taiwan" },
  { code: "MY",    label: "Malaysia" },
  { code: "ID",    label: "Indonesia" },
  { code: "CH",    label: "Switzerland" },
  { code: "IN",    label: "India" },
];

// Codes in the preset list above (for detecting custom entries)
const PRESET_JURISDICTION_CODES = new Set(JURISDICTIONS.map(j => j.code));

const SECTORS = [
  "Technology", "Healthcare", "Financial Services", "Manufacturing",
  "Consumer & Retail", "Energy & Utilities", "Real Estate", "Media & Entertainment",
  "Professional Services", "Life Sciences", "Defense & Aerospace",
];
// Sectors shown as buttons (without "Other" — handled separately)
const SECTOR_PRESETS = new Set(SECTORS);

const VALUE_RANGES = ["<$50M", "$50M–$250M", "$250M–$500M", "$500M–$1B", "$1B–$5B", ">$5B"];

const GAAP_OPTIONS = ["US GAAP", "IFRS", "Local GAAP", "Multiple", "Unknown"];
const GAAP_PRESETS = new Set(GAAP_OPTIONS);

const ERP_OPTIONS = ["SAP", "Oracle", "NetSuite", "Workday", "Microsoft Dynamics", "QuickBooks", "Unknown"];
const ERP_PRESETS = new Set(ERP_OPTIONS);
// "Other" handled separately with free-text

// ─── Additional context topic suggestions ────────────────────────────────────
const CONTEXT_TOPICS: { id: string; label: string; icon: string; placeholder: string }[] = [
  {
    id: "contracts",
    label: "Contract & Commercial",
    icon: "📋",
    placeholder: "e.g. complex earn-out provisions, revenue-sharing arrangements, change-of-control clauses, IP licensing terms, minimum purchase commitments, price adjustment mechanisms…",
  },
  {
    id: "customers",
    label: "Client & Customer",
    icon: "🤝",
    placeholder: "e.g. key account dependencies, customer consent / assignment requirements, revenue concentration risks, CRM migration, loyalty programme obligations, NPS / SLA commitments…",
  },
  {
    id: "employees",
    label: "Employee & People",
    icon: "👤",
    placeholder: "e.g. key person retention packages, works council / union consultation obligations, change-in-control payments, headcount synergy targets, TUPE / WARN Act applicability…",
  },
  {
    id: "regulatory",
    label: "Regulatory & Compliance",
    icon: "⚖",
    placeholder: "e.g. pending investigations or consent orders, industry-specific licences, antitrust / HSR filing status, CFIUS review, data-protection authority notifications, environmental permits…",
  },
  {
    id: "operational",
    label: "Operational Dependencies",
    icon: "⚙",
    placeholder: "e.g. critical vendor or sole-source supplier relationships, outsourced functions, shared-service dependencies, logistics or warehouse obligations, manufacturing constraints…",
  },
  {
    id: "financial",
    label: "Financial Considerations",
    icon: "◆",
    placeholder: "e.g. working capital peg and target, debt assumptions or payoff requirements, pension / OPEB liabilities, contingent liabilities, earnout mechanics, intercompany balances…",
  },
  {
    id: "technology",
    label: "Technology & IP",
    icon: "◈",
    placeholder: "e.g. licensed or owned IP and patents, open-source obligations, key software licence assignments, proprietary data assets, source-code escrow, cybersecurity posture…",
  },
  {
    id: "cultural",
    label: "Cultural & Change",
    icon: "◉",
    placeholder: "e.g. cultural integration challenges, org structure decisions pending, leadership alignment gaps, employee communication plan, change-readiness assessment findings…",
  },
];

const BUYER_MATURITY_OPTIONS = [
  { value: "first",      label: "First-Time Acquirer",    desc: "No prior acquisitions at this scale" },
  { value: "occasional", label: "Occasional Acquirer",    desc: "1–3 deals in past 5 years" },
  { value: "serial",     label: "Serial Acquirer",        desc: "Active M&A program; 3+ deals/year" },
  { value: "pe",         label: "PE / Financial Sponsor", desc: "Private equity or fund buyer" },
];

const FUNCTION_OPTIONS: { code: string; label: string }[] = [
  { code: "finance",        label: "Finance & Accounting" },
  { code: "tax",            label: "Tax" },
  { code: "treasury",       label: "Treasury" },
  { code: "it",             label: "IT & Systems" },
  { code: "hr",             label: "HR & People" },
  { code: "legal",          label: "Legal" },
  { code: "communications", label: "Communications" },
  { code: "facilities",     label: "Facilities" },
  { code: "esg",            label: "ESG" },
  { code: "controls",       label: "Controls & Governance" },
  { code: "fpa",            label: "FP&A" },
  { code: "operations",     label: "Operations" },
];
const PRESET_FUNCTION_CODES = new Set([...FUNCTION_OPTIONS.map(f => f.code), "all"]);

interface Props {
  onSubmit: (intake: DealIntake) => void;
}

const EMPTY_INTAKE: DealIntake = {
  dealName: "",
  dealStructure: "" as any,
  integrationModel: "" as any,
  closeDate: "",
  functionalScope: ["all"],
  crossBorder: false,
  jurisdictions: [],
  tsaRequired: "tbd",
  industrySector: "",
  dealValueRange: "",
  targetEntities: 1,
  targetGaap: "",
  targetErp: "",
  buyerMaturity: "occasional",
  dealStructureNotes: "",
  integrationModelNotes: "",
  tsaNotes: "",
  additionalContext: [],
};

export default function IntakeForm({ onSubmit }: Props) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<DealIntake>(EMPTY_INTAKE);
  const [errors, setErrors] = useState<Partial<Record<keyof DealIntake, string>>>({});

  // ── Custom-entry local state ──────────────────────────────────
  const [customJurisdiction, setCustomJurisdiction] = useState("");
  const [customFunctionLabel, setCustomFunctionLabel] = useState("");
  const [sectorOtherMode, setSectorOtherMode] = useState(false);
  const [customSectorText, setCustomSectorText] = useState("");
  const [erpOtherMode, setErpOtherMode] = useState(false);
  const [customErpText, setCustomErpText] = useState("");
  const [gaapOtherMode, setGaapOtherMode] = useState(false);
  const [customGaapText, setCustomGaapText] = useState("");
  const [customContextTopic, setCustomContextTopic] = useState("");

  function set<K extends keyof DealIntake>(key: K, value: DealIntake[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleJurisdiction(code: string) {
    const next = form.jurisdictions.includes(code)
      ? form.jurisdictions.filter((j) => j !== code)
      : [...form.jurisdictions, code];
    set("jurisdictions", next);
    if (next.length > 1 || next.some((j) => !j.startsWith("US"))) {
      set("crossBorder", true);
    }
  }

  function addCustomJurisdiction() {
    const val = customJurisdiction.trim();
    if (!val || form.jurisdictions.includes(val)) return;
    set("jurisdictions", [...form.jurisdictions, val]);
    set("crossBorder", true);
    setCustomJurisdiction("");
  }

  function addCustomFunction() {
    const val = customFunctionLabel.trim();
    if (!val) return;
    const current: string[] = form.functionalScope.includes("all" as any)
      ? FUNCTION_OPTIONS.map(f => f.code)
      : [...form.functionalScope as string[]];
    if (current.includes(val)) return;
    set("functionalScope", [...current.filter(c => c !== "all"), val] as any);
    setCustomFunctionLabel("");
  }

  function removeCustomFunction(code: string) {
    const next = (form.functionalScope as string[]).filter(c => c !== code);
    set("functionalScope", (next.length === 0 ? ["all"] : next) as any);
  }

  function addContextTopic(id: string, label: string, placeholder: string = "") {
    const existing = form.additionalContext ?? [];
    if (existing.find(e => e.topic === id)) return; // already added
    set("additionalContext", [...existing, { topic: id, label, notes: "" }]);
  }

  function removeContextTopic(id: string) {
    set("additionalContext", (form.additionalContext ?? []).filter(e => e.topic !== id));
  }

  function updateContextNotes(id: string, notes: string) {
    set("additionalContext", (form.additionalContext ?? []).map(e =>
      e.topic === id ? { ...e, notes } : e
    ));
  }

  function validateTier1(): boolean {
    const e: typeof errors = {};
    if (!form.dealName.trim())    e.dealName = "Deal name is required";
    if (!form.dealStructure)      e.dealStructure = "Select a deal structure";
    if (!form.integrationModel)   e.integrationModel = "Select an integration model";
    if (!form.closeDate)          e.closeDate = "Close date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (tier === 1 && !validateTier1()) return;
    setTier((t) => Math.min(t + 1, 3) as 1 | 2 | 3);
  }

  function handleBack() {
    setTier((t) => Math.max(t - 1, 1) as 1 | 2 | 3);
  }

  function handleSubmit() {
    onSubmit(form);
  }

  const tierLabels       = ["Core Deal Info", "Context & Complexity", "Advanced Configuration"];
  const tierDescriptions = [
    "4 required fields — always collected",
    "6 fields — drives workstream activation & scope",
    "3 fields — precision tuning for AI guidance",
  ];

  // Derived helpers
  const customJurisdictions = form.jurisdictions.filter(j => !PRESET_JURISDICTION_CODES.has(j));
  const customFunctions = (form.functionalScope as string[]).filter(
    c => !PRESET_FUNCTION_CODES.has(c)
  );
  const isSectorCustom = !!form.industrySector && !SECTOR_PRESETS.has(form.industrySector);
  const isErpCustom    = !!form.targetErp && !ERP_PRESETS.has(form.targetErp) && form.targetErp !== "Other";
  const isGaapCustom   = !!form.targetGaap && !GAAP_PRESETS.has(form.targetGaap);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 28px" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff",
          }}>M</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: COLORS.text }}>
              M&A Integration Engine
            </div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Deal Intake Configuration</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6, marginTop: 12 }}>
          Fill in your deal details below. The engine will generate a fully configured integration
          checklist, risk assessment, and AI guidance within seconds.
        </p>
      </div>

      {/* Tier Progress */}
      <div style={{ display: "flex", gap: 0, marginBottom: 32 }}>
        {[1, 2, 3].map((t) => (
          <div key={t} style={{ flex: 1, cursor: "pointer" }} onClick={() => {
            if (t < tier || (t === 2 && validateTier1())) setTier(t as 1 | 2 | 3);
            if (t === 1) setTier(1);
          }}>
            <div style={{
              height: 3, background: t <= tier ? COLORS.accent : COLORS.border,
              transition: "background 0.3s",
              borderRadius: t === 1 ? "2px 0 0 2px" : t === 3 ? "0 2px 2px 0" : 0,
            }} />
            <div style={{ padding: "8px 4px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: t <= tier ? COLORS.accent : COLORS.textMuted }}>
                Tier {t}
              </div>
              <div style={{ fontSize: 10, color: t === tier ? COLORS.text : COLORS.textMuted, fontWeight: t === tier ? 700 : 400 }}>
                {tierLabels[t - 1]}
              </div>
              <div style={{ fontSize: 9, color: COLORS.textMuted }}>{tierDescriptions[t - 1]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════ TIER 1 ═══════════════════════════════ */}
      {tier === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          <Field label="Deal Code Name" required error={errors.dealName}>
            <input
              type="text"
              value={form.dealName}
              onChange={(e) => set("dealName", e.target.value)}
              placeholder='e.g., "Project Meridian"'
              style={inputStyle(!!errors.dealName)}
            />
          </Field>

          {/* ── Deal Structure ── */}
          <Field label="Deal Structure" required>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {DEAL_STRUCTURES.map((opt) => (
                <SelectCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={form.dealStructure === opt.value}
                  onClick={() => set("dealStructure", opt.value)}
                  warning={opt.value === "carve_out" ? "High TSA complexity" : undefined}
                />
              ))}
            </div>
            {/* Optional context notes — appears once a structure is chosen */}
            {form.dealStructure && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>
                  📝 Optional — add structure-specific context (e.g. partial carve-out with 18-month TSA obligations, specific asset exclusions, retained liabilities):
                </div>
                <textarea
                  value={form.dealStructureNotes ?? ""}
                  onChange={(e) => set("dealStructureNotes", e.target.value)}
                  placeholder="Describe any nuances about this deal's structure…"
                  rows={2}
                  style={{ ...inputStyle(), resize: "vertical", fontSize: 11 }}
                />
              </div>
            )}
          </Field>

          {/* ── Integration Model ── */}
          <Field label="Integration Model" required>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {INTEGRATION_MODELS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={form.integrationModel === opt.value}
                  onClick={() => set("integrationModel", opt.value)}
                />
              ))}
            </div>
            {/* Optional model notes */}
            {form.integrationModel && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>
                  📝 Optional — describe integration boundaries (e.g. IT fully integrated, Finance standalone for 12 months, HR systems retained):
                </div>
                <textarea
                  value={form.integrationModelNotes ?? ""}
                  onChange={(e) => set("integrationModelNotes", e.target.value)}
                  placeholder="Describe integration scope, timeline, or function-level distinctions…"
                  rows={2}
                  style={{ ...inputStyle(), resize: "vertical", fontSize: 11 }}
                />
              </div>
            )}
          </Field>

          <Field label="Target Close Date" required error={errors.closeDate}>
            <input
              type="date"
              value={form.closeDate}
              onChange={(e) => set("closeDate", e.target.value)}
              style={inputStyle(!!errors.closeDate)}
            />
            <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
              Used to calculate all milestone dates (Day 1, 30, 60, 90, Year 1)
            </div>
          </Field>
        </div>
      )}

      {/* ═══════════════════════════════ TIER 2 ═══════════════════════════════ */}
      {tier === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 11, color: COLORS.textMuted, padding: "8px 12px", borderRadius: 6, background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}20` }}>
            💡 These fields help refine your integration plan. Skip any field you don&apos;t know yet — they can be updated later.
          </div>

          {/* ── Cross-Border ── */}
          <Field label="Cross-Border Deal?">
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Yes — Cross-Border", value: true },
                { label: "No — Domestic Only", value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => {
                    set("crossBorder", opt.value);
                    if (!opt.value) set("jurisdictions", []);
                  }}
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 6, border: `2px solid`,
                    borderColor: form.crossBorder === opt.value ? COLORS.accent : COLORS.border,
                    background: form.crossBorder === opt.value ? COLORS.accent + "18" : COLORS.cardBg,
                    color: form.crossBorder === opt.value ? COLORS.accent : COLORS.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* ── Jurisdictions ── */}
          {form.crossBorder && (
            <Field label="Jurisdictions" hint="Select all jurisdictions with material operations or regulatory filing requirements">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {JURISDICTIONS.map((j) => (
                  <button
                    key={j.code}
                    onClick={() => toggleJurisdiction(j.code)}
                    style={{
                      padding: "6px 10px", borderRadius: 4, border: `1px solid`,
                      borderColor: form.jurisdictions.includes(j.code) ? COLORS.accent : COLORS.border,
                      background: form.jurisdictions.includes(j.code) ? COLORS.accent + "22" : COLORS.cardBg,
                      color: form.jurisdictions.includes(j.code) ? COLORS.accent : COLORS.textMuted,
                      fontSize: 10, fontWeight: 600, cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {j.label}
                  </button>
                ))}
              </div>

              {/* Custom jurisdiction chips */}
              {customJurisdictions.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                  {customJurisdictions.map((j) => (
                    <span key={j} style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 12,
                      background: COLORS.success + "22", border: `1px solid ${COLORS.success}44`,
                      fontSize: 10, fontWeight: 600, color: COLORS.success,
                    }}>
                      {j}
                      <button
                        onClick={() => toggleJurisdiction(j)}
                        style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add custom jurisdiction */}
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={customJurisdiction}
                  onChange={(e) => setCustomJurisdiction(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomJurisdiction(); } }}
                  placeholder="Add country not in list (e.g. Brazil, UAE, South Africa)…"
                  style={{ ...inputStyle(), flex: 1, fontSize: 11 }}
                />
                <button
                  onClick={addCustomJurisdiction}
                  disabled={!customJurisdiction.trim()}
                  style={{
                    padding: "0 14px", borderRadius: 6, border: `1px solid ${COLORS.accent}`,
                    background: `${COLORS.accent}22`, color: COLORS.accent,
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    opacity: customJurisdiction.trim() ? 1 : 0.4,
                  }}
                >
                  + Add
                </button>
              </div>

              {form.jurisdictions.length >= 3 && (
                <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.danger + "18", border: `1px solid ${COLORS.danger}33`, fontSize: 10, color: COLORS.danger }}>
                  ⚠ {form.jurisdictions.length} jurisdictions selected — Regulatory Delay risk elevated (Critical)
                </div>
              )}
            </Field>
          )}

          {/* ── TSA Required ── */}
          <Field label="TSA Required?">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(["yes", "no", "tbd"] as TsaRequired[]).map((v) => (
                <button
                  key={v}
                  onClick={() => set("tsaRequired", v)}
                  style={{
                    padding: "8px", borderRadius: 6, border: `2px solid`,
                    borderColor: form.tsaRequired === v ? COLORS.accent : COLORS.border,
                    background: form.tsaRequired === v ? COLORS.accent + "18" : COLORS.cardBg,
                    color: form.tsaRequired === v ? COLORS.accent : COLORS.textMuted,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
                  }}
                >
                  {v === "tbd" ? "TBD" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {form.tsaRequired === "yes" && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.warning + "18", border: `1px solid ${COLORS.warning}33`, fontSize: 10, color: COLORS.warning }}>
                ⚠ TSA required — TSA Assessment workstream fully activated
              </div>
            )}
            {form.tsaRequired === "no" && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.success + "18", border: `1px solid ${COLORS.success}33`, fontSize: 10, color: COLORS.success }}>
                ✓ No TSA — TSA checklist items will be marked N/A
              </div>
            )}
            {/* TSA context notes — shown when Yes or TBD */}
            {(form.tsaRequired === "yes" || form.tsaRequired === "tbd") && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 4 }}>
                  📝 Optional — describe TSA scope, expected duration, or functions covered:
                </div>
                <input
                  type="text"
                  value={form.tsaNotes ?? ""}
                  onChange={(e) => set("tsaNotes", e.target.value)}
                  placeholder="e.g. 12-month TSA covering IT and Finance, Finance exit in month 6…"
                  style={{ ...inputStyle(), fontSize: 11 }}
                />
              </div>
            )}
          </Field>

          {/* ── Functional Scope ── */}
          <Field label="Functional Scope" hint="Select which functions are in scope. Unselected functions will have checklist items marked N/A.">
            <div style={{ marginBottom: 8 }}>
              <button
                onClick={() => set("functionalScope", ["all"])}
                style={{
                  padding: "6px 14px", borderRadius: 4, border: `2px solid`,
                  borderColor: form.functionalScope.includes("all") ? COLORS.accent : COLORS.border,
                  background: form.functionalScope.includes("all") ? COLORS.accent + "18" : COLORS.cardBg,
                  color: form.functionalScope.includes("all") ? COLORS.accent : COLORS.textMuted,
                  fontSize: 10, fontWeight: 700, cursor: "pointer",
                }}
              >
                {form.functionalScope.includes("all") ? "✓ All Functions" : "All Functions"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {FUNCTION_OPTIONS.map((fn) => {
                const isSelected = form.functionalScope.includes("all" as any) || form.functionalScope.includes(fn.code as any);
                return (
                  <button
                    key={fn.code}
                    onClick={() => {
                      const currentCodes: string[] = form.functionalScope.includes("all" as any)
                        ? FUNCTION_OPTIONS.map((f) => f.code)
                        : [...form.functionalScope];
                      const next = isSelected
                        ? currentCodes.filter((c) => c !== fn.code)
                        : [...currentCodes.filter((c) => c !== "all"), fn.code];
                      const allSelected = FUNCTION_OPTIONS.every((f) => next.includes(f.code));
                      set("functionalScope", (allSelected ? ["all"] : next) as any);
                    }}
                    style={{
                      padding: "6px 10px", borderRadius: 4, border: `1px solid`,
                      borderColor: isSelected ? COLORS.accent : COLORS.border,
                      background: isSelected ? COLORS.accent + "22" : COLORS.cardBg,
                      color: isSelected ? COLORS.accent : COLORS.textMuted,
                      fontSize: 10, fontWeight: 600, cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {fn.label}
                  </button>
                );
              })}
            </div>

            {/* Custom function chips */}
            {customFunctions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {customFunctions.map((fn) => (
                  <span key={fn} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 12,
                    background: COLORS.success + "22", border: `1px solid ${COLORS.success}44`,
                    fontSize: 10, fontWeight: 600, color: COLORS.success,
                  }}>
                    {fn}
                    <button
                      onClick={() => removeCustomFunction(fn)}
                      style={{ background: "none", border: "none", color: COLORS.success, cursor: "pointer", padding: 0, fontSize: 12, lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {/* Add custom function */}
            <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
              <input
                type="text"
                value={customFunctionLabel}
                onChange={(e) => setCustomFunctionLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFunction(); } }}
                placeholder="Add function not listed (e.g. Supply Chain, R&D, Procurement, Sales)…"
                style={{ ...inputStyle(), flex: 1, fontSize: 11 }}
              />
              <button
                onClick={addCustomFunction}
                disabled={!customFunctionLabel.trim()}
                style={{
                  padding: "0 14px", borderRadius: 6, border: `1px solid ${COLORS.accent}`,
                  background: `${COLORS.accent}22`, color: COLORS.accent,
                  fontSize: 11, fontWeight: 600, cursor: "pointer",
                  opacity: customFunctionLabel.trim() ? 1 : 0.4,
                }}
              >
                + Add
              </button>
            </div>

            {(form.functionalScope.includes("all") || form.functionalScope.includes("it")) && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.accent + "18", border: `1px solid ${COLORS.accent}33`, fontSize: 10, color: COLORS.accent }}>
                IT & Systems selected — 10 IT workstreams activated (Governance, Enterprise Apps, Infrastructure, ITGC, etc.)
              </div>
            )}
          </Field>

          {/* ── Industry / Sector ── */}
          <Field label="Industry / Sector">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSectorOtherMode(false);
                    setCustomSectorText("");
                    set("industrySector", s);
                  }}
                  style={{
                    padding: "6px 8px", borderRadius: 4, border: `1px solid`,
                    borderColor: form.industrySector === s && !sectorOtherMode ? COLORS.accent : COLORS.border,
                    background: form.industrySector === s && !sectorOtherMode ? COLORS.accent + "22" : COLORS.cardBg,
                    color: form.industrySector === s && !sectorOtherMode ? COLORS.accent : COLORS.textMuted,
                    fontSize: 10, cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
              {/* "Other" button */}
              <button
                onClick={() => {
                  setSectorOtherMode(true);
                  set("industrySector", customSectorText || "");
                }}
                style={{
                  padding: "6px 8px", borderRadius: 4, border: `1px solid`,
                  borderColor: sectorOtherMode || isSectorCustom ? COLORS.accent : COLORS.border,
                  background: sectorOtherMode || isSectorCustom ? COLORS.accent + "22" : COLORS.cardBg,
                  color: sectorOtherMode || isSectorCustom ? COLORS.accent : COLORS.textMuted,
                  fontSize: 10, cursor: "pointer",
                }}
              >
                Other
              </button>
            </div>
            {/* Custom sector text input */}
            {(sectorOtherMode || isSectorCustom) && (
              <input
                autoFocus={sectorOtherMode && !isSectorCustom}
                type="text"
                value={form.industrySector || customSectorText}
                onChange={(e) => {
                  setCustomSectorText(e.target.value);
                  set("industrySector", e.target.value);
                }}
                placeholder="Specify your sector (e.g. EdTech, AgriTech, Gaming, Logistics)…"
                style={{ ...inputStyle(), marginTop: 8, fontSize: 11 }}
              />
            )}
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Deal Value Range">
              <select
                value={form.dealValueRange}
                onChange={(e) => set("dealValueRange", e.target.value)}
                style={selectStyle}
              >
                <option value="">Select range…</option>
                {VALUE_RANGES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>

            <Field label="Target Legal Entities" hint="Number of legal entities being acquired">
              <input
                type="number"
                min={1}
                max={500}
                value={form.targetEntities}
                onChange={(e) => set("targetEntities", parseInt(e.target.value) || 1)}
                style={inputStyle()}
              />
            </Field>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ TIER 3 ═══════════════════════════════ */}
      {tier === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ padding: "10px 14px", borderRadius: 6, background: COLORS.accent + "18", border: `1px solid ${COLORS.accent}33`, fontSize: 10, color: COLORS.accent }}>
            Tier 3 inputs fine-tune AI guidance quality and GAAP/ERP-specific checklist items.
            Skip any field you don&apos;t know yet — you can update later.
          </div>

          {/* ── Target GAAP ── */}
          <Field label="Target Accounting Standard (GAAP)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {GAAP_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setGaapOtherMode(false);
                    setCustomGaapText("");
                    set("targetGaap", g);
                  }}
                  style={{
                    padding: "8px", borderRadius: 4, border: `1px solid`,
                    borderColor: form.targetGaap === g && !gaapOtherMode ? COLORS.accent : COLORS.border,
                    background: form.targetGaap === g && !gaapOtherMode ? COLORS.accent + "22" : COLORS.cardBg,
                    color: form.targetGaap === g && !gaapOtherMode ? COLORS.accent : COLORS.textMuted,
                    fontSize: 11, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {g}
                </button>
              ))}
              {/* "Other" GAAP button */}
              <button
                onClick={() => {
                  setGaapOtherMode(true);
                  set("targetGaap", customGaapText || "");
                }}
                style={{
                  padding: "8px", borderRadius: 4, border: `1px solid`,
                  borderColor: gaapOtherMode || isGaapCustom ? COLORS.accent : COLORS.border,
                  background: gaapOtherMode || isGaapCustom ? COLORS.accent + "22" : COLORS.cardBg,
                  color: gaapOtherMode || isGaapCustom ? COLORS.accent : COLORS.textMuted,
                  fontSize: 11, cursor: "pointer", fontWeight: 600,
                }}
              >
                Other
              </button>
            </div>
            {/* Custom GAAP text input */}
            {(gaapOtherMode || isGaapCustom) && (
              <input
                autoFocus={gaapOtherMode && !isGaapCustom}
                type="text"
                value={form.targetGaap || customGaapText}
                onChange={(e) => {
                  setCustomGaapText(e.target.value);
                  set("targetGaap", e.target.value);
                }}
                placeholder="Specify accounting standard (e.g. J-GAAP, Ind AS, CAS, German HGB)…"
                style={{ ...inputStyle(), marginTop: 8, fontSize: 11 }}
              />
            )}
            {form.targetGaap && form.targetGaap !== "US GAAP" && form.targetGaap !== "Unknown" && !gaapOtherMode && !isGaapCustom && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.warning + "18", border: `1px solid ${COLORS.warning}33`, fontSize: 10, color: COLORS.warning }}>
                ⚠ {form.targetGaap} target — Financial Reporting Gap risk elevated. GAAP conversion workstream activated.
              </div>
            )}
            {isGaapCustom && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.warning + "18", border: `1px solid ${COLORS.warning}33`, fontSize: 10, color: COLORS.warning }}>
                ⚠ Non-standard GAAP ({form.targetGaap}) — Financial Reporting Gap risk elevated. GAAP conversion workstream activated.
              </div>
            )}
          </Field>

          {/* ── Target ERP ── */}
          <Field label="Target ERP System">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {ERP_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setErpOtherMode(false);
                    setCustomErpText("");
                    set("targetErp", e);
                  }}
                  style={{
                    padding: "6px 8px", borderRadius: 4, border: `1px solid`,
                    borderColor: form.targetErp === e && !erpOtherMode ? COLORS.accent : COLORS.border,
                    background: form.targetErp === e && !erpOtherMode ? COLORS.accent + "22" : COLORS.cardBg,
                    color: form.targetErp === e && !erpOtherMode ? COLORS.accent : COLORS.textMuted,
                    fontSize: 10, cursor: "pointer",
                  }}
                >
                  {e}
                </button>
              ))}
              {/* "Other" ERP button */}
              <button
                onClick={() => {
                  setErpOtherMode(true);
                  set("targetErp", customErpText || "");
                }}
                style={{
                  padding: "6px 8px", borderRadius: 4, border: `1px solid`,
                  borderColor: erpOtherMode || isErpCustom ? COLORS.accent : COLORS.border,
                  background: erpOtherMode || isErpCustom ? COLORS.accent + "22" : COLORS.cardBg,
                  color: erpOtherMode || isErpCustom ? COLORS.accent : COLORS.textMuted,
                  fontSize: 10, cursor: "pointer",
                }}
              >
                Other
              </button>
            </div>
            {/* Custom ERP text input */}
            {(erpOtherMode || isErpCustom) && (
              <input
                autoFocus={erpOtherMode && !isErpCustom}
                type="text"
                value={form.targetErp || customErpText}
                onChange={(e) => {
                  setCustomErpText(e.target.value);
                  set("targetErp", e.target.value);
                }}
                placeholder="Specify ERP system (e.g. Sage, Infor, Epicor, Unit4, IFS, Netsol)…"
                style={{ ...inputStyle(), marginTop: 8, fontSize: 11 }}
              />
            )}
          </Field>

          {/* ── Buyer Maturity ── */}
          <Field label="Acquirer M&A Maturity">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {BUYER_MATURITY_OPTIONS.map((opt) => (
                <SelectCard
                  key={opt.value}
                  label={opt.label}
                  desc={opt.desc}
                  selected={form.buyerMaturity === opt.value}
                  onClick={() => set("buyerMaturity", opt.value)}
                />
              ))}
            </div>
          </Field>

          {/* ══ ADDITIONAL CONTEXT BUCKET ══════════════════════════════════════ */}
          <div style={{ marginTop: 8 }}>
            {/* Section divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
              <span style={{
                fontSize: 10, fontWeight: 800, letterSpacing: 1.2,
                color: COLORS.textMuted, whiteSpace: "nowrap", textTransform: "uppercase",
              }}>
                Additional Context — Optional
              </span>
              <div style={{ flex: 1, height: 1, background: COLORS.border }} />
            </div>

            <div style={{
              padding: 16, borderRadius: 10,
              background: "#141F33",
              border: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>
                General Context Bucket
              </div>
              <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.55, marginBottom: 14 }}>
                Capture any deal-specific nuances that don&apos;t fit the structured fields above — contract terms,
                client or customer considerations, employee matters, or anything else your team needs to track.
              </div>

              {/* Suggested topic chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                {CONTEXT_TOPICS.map((t) => {
                  const isAdded = !!(form.additionalContext ?? []).find(e => e.topic === t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => isAdded ? removeContextTopic(t.id) : addContextTopic(t.id, t.label)}
                      style={{
                        padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${isAdded ? COLORS.accent : COLORS.border}`,
                        background: isAdded ? `${COLORS.accent}22` : "transparent",
                        color: isAdded ? COLORS.accent : COLORS.textMuted,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 12 }}>{t.icon}</span>
                      {t.label}
                      {isAdded && <span style={{ fontSize: 13, lineHeight: 1, marginLeft: 2, opacity: 0.7 }}>×</span>}
                    </button>
                  );
                })}
              </div>

              {/* Active context entries */}
              {(form.additionalContext ?? []).length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                  {(form.additionalContext ?? []).map((entry) => {
                    const def = CONTEXT_TOPICS.find(t => t.id === entry.topic);
                    return (
                      <div key={entry.topic} style={{
                        borderRadius: 8, border: `1px solid ${COLORS.accent}33`,
                        background: `${COLORS.accent}08`, overflow: "hidden",
                      }}>
                        {/* Entry header */}
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px",
                          borderBottom: `1px solid ${COLORS.accent}22`,
                          background: `${COLORS.accent}0D`,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, display: "flex", alignItems: "center", gap: 6 }}>
                            {def && <span style={{ fontSize: 13 }}>{def.icon}</span>}
                            {entry.label}
                          </span>
                          <button
                            onClick={() => removeContextTopic(entry.topic)}
                            style={{ background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}
                            title="Remove this section"
                          >×</button>
                        </div>
                        {/* Textarea */}
                        <textarea
                          value={entry.notes}
                          onChange={(e) => updateContextNotes(entry.topic, e.target.value)}
                          placeholder={def?.placeholder ?? `Add notes about ${entry.label}…`}
                          rows={3}
                          style={{
                            width: "100%", padding: "10px 12px",
                            background: "transparent", border: "none",
                            color: COLORS.text, fontSize: 12,
                            fontFamily: "inherit", outline: "none",
                            resize: "vertical", lineHeight: 1.55,
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add custom topic */}
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={customContextTopic}
                  onChange={(e) => setCustomContextTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && customContextTopic.trim()) {
                      e.preventDefault();
                      addContextTopic(
                        `custom_${Date.now()}`,
                        customContextTopic.trim()
                      );
                      setCustomContextTopic("");
                    }
                  }}
                  placeholder="Add a custom topic (e.g. Environmental, Insurance, Post-close Obligations)…"
                  style={{ ...inputStyle(), flex: 1, fontSize: 11 }}
                />
                <button
                  onClick={() => {
                    if (customContextTopic.trim()) {
                      addContextTopic(`custom_${Date.now()}`, customContextTopic.trim());
                      setCustomContextTopic("");
                    }
                  }}
                  disabled={!customContextTopic.trim()}
                  style={{
                    padding: "0 14px", borderRadius: 6,
                    border: `1px solid ${COLORS.accent}`,
                    background: `${COLORS.accent}22`, color: COLORS.accent,
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    opacity: customContextTopic.trim() ? 1 : 0.4,
                    whiteSpace: "nowrap",
                  }}
                >
                  + Add
                </button>
              </div>

              {(form.additionalContext ?? []).length === 0 && (
                <div style={{ marginTop: 10, fontSize: 10, color: COLORS.textMuted, textAlign: "center" }}>
                  Click a topic above to add it, or type a custom one and press Enter / + Add
                </div>
              )}
            </div>
          </div>
          {/* ══ end additional context ══════════════════════════════════════════ */}

        </div>
      )}

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
        {tier > 1 ? (
          <button onClick={handleBack} style={secondaryBtnStyle}>← Back</button>
        ) : <div />}

        {tier < 3 ? (
          <button onClick={handleNext} style={primaryBtnStyle}>
            Continue to Tier {tier + 1} →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!form.dealName || !form.closeDate}
            style={{
              ...primaryBtnStyle,
              background: (!form.dealName || !form.closeDate)
                ? COLORS.border
                : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`,
              cursor: (!form.dealName || !form.closeDate) ? "not-allowed" : "pointer",
            }}
          >
            Generate Integration Plan →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label, required, hint, error, children
}: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#94A3B8" }}>
          {label}{required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
        </label>
        {hint && <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
      {error && <div style={{ fontSize: 10, color: "#EF4444", marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function SelectCard({
  label, desc, selected, onClick, warning
}: {
  label: string; desc: string; selected: boolean; onClick: () => void; warning?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 14px", borderRadius: 6, border: `2px solid`,
        borderColor: selected ? COLORS.accent : COLORS.border,
        background: selected ? COLORS.accent + "18" : COLORS.cardBg,
        textAlign: "left", cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: selected ? COLORS.accent : COLORS.text }}>{label}</div>
      <div style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 2 }}>{desc}</div>
      {warning && (
        <div style={{ fontSize: 9, color: COLORS.warning, marginTop: 4, fontWeight: 600 }}>⚠ {warning}</div>
      )}
    </button>
  );
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 6,
    border: `1px solid ${hasError ? COLORS.danger : COLORS.border}`,
    background: COLORS.cardBg, color: COLORS.text,
    fontSize: 12, fontFamily: "inherit", outline: "none",
    boxSizing: "border-box",
  };
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 6,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.cardBg, color: COLORS.text,
  fontSize: 12, fontFamily: "inherit", outline: "none",
  appearance: "none",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "12px 24px", borderRadius: 6, border: "none",
  background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentLight})`,
  color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: 0.5,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "12px 24px", borderRadius: 6,
  border: `1px solid ${COLORS.border}`,
  background: "transparent", color: COLORS.textMuted,
  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
