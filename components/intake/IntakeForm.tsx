"use client";

import { useState } from "react";
import type { DealIntake, DealStructure, IntegrationModel, TsaRequired } from "@/lib/types";

const COLORS = {
  bg: "#f0f4f0",
  card: "#ffffff",
  accent: "#22c55e",
  accentDark: "#16a34a",
  accentBg: "#f0fdf4",
  accentBorder: "#bbf7d0",
  blue: "#2563eb",
  blueBg: "#eff6ff",
  success: "#16a34a",
  warning: "#d97706",
  warningBg: "#fffbeb",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  border: "#e2e8e2",
  text: "#111827",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
};

const DEAL_STRUCTURES: { value: DealStructure; label: string; desc: string }[] = [
  { value: "stock_purchase", label: "Stock Purchase", desc: "Acquires all outstanding shares; inherits all liabilities" },
  { value: "asset_purchase", label: "Asset Purchase", desc: "Selective asset acquisition; excludes most liabilities" },
  { value: "merger_forward", label: "Forward Merger", desc: "Target merges into acquirer; target ceases to exist" },
  { value: "merger_reverse", label: "Reverse Triangular Merger", desc: "Sub merges into target; target survives as subsidiary" },
  { value: "carve_out", label: "Carve-Out", desc: "Business unit carved from parent; high TSA complexity" },
  { value: "f_reorg", label: "F-Reorganization", desc: "Tax-free holding company restructuring" },
];

const INTEGRATION_MODELS: { value: IntegrationModel; label: string; desc: string }[] = [
  { value: "fully_integrated", label: "Fully Integrated", desc: "All systems, teams, and processes unified into acquirer" },
  { value: "hybrid", label: "Hybrid", desc: "Partial integration; some functions remain standalone" },
  { value: "standalone", label: "Standalone", desc: "Target operates independently post-close" },
];

const JURISDICTIONS = [
  { code: "US", label: "United States" },
  { code: "EU-DE", label: "Germany (EU)" },
  { code: "EU-FR", label: "France (EU)" },
  { code: "EU-NL", label: "Netherlands (EU)" },
  { code: "EU-IE", label: "Ireland (EU)" },
  { code: "EU-LU", label: "Luxembourg (EU)" },
  { code: "EU-ES", label: "Spain (EU)" },
  { code: "UK", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "AU", label: "Australia" },
  { code: "JP", label: "Japan" },
  { code: "SG", label: "Singapore" },
  { code: "CH", label: "Switzerland" },
  { code: "IN", label: "India" },
];

const SECTORS = [
  "Technology", "Healthcare", "Financial Services", "Manufacturing",
  "Consumer & Retail", "Energy & Utilities", "Real Estate", "Media & Entertainment",
  "Professional Services", "Life Sciences", "Defense & Aerospace", "Other",
];

const VALUE_RANGES = ["<$50M", "$50M–$250M", "$250M–$500M", "$500M–$1B", "$1B–$5B", ">$5B"];

const GAAP_OPTIONS = ["US GAAP", "IFRS", "Local GAAP", "Multiple", "Unknown"];
const ERP_OPTIONS = ["SAP", "Oracle", "NetSuite", "Workday", "Microsoft Dynamics", "QuickBooks", "Other", "Unknown"];
const BUYER_MATURITY_OPTIONS = [
  { value: "first", label: "First-Time Acquirer", desc: "No prior acquisitions at this scale" },
  { value: "occasional", label: "Occasional Acquirer", desc: "1–3 deals in past 5 years" },
  { value: "serial", label: "Serial Acquirer", desc: "Active M&A program; 3+ deals/year" },
  { value: "pe", label: "PE / Financial Sponsor", desc: "Private equity or fund buyer" },
];

interface Props {
  onSubmit: (intake: DealIntake) => void;
}

const EMPTY_INTAKE: DealIntake = {
  dealName: "",
  dealStructure: "stock_purchase",
  integrationModel: "fully_integrated",
  closeDate: "",
  crossBorder: false,
  jurisdictions: [],
  tsaRequired: "tbd",
  industrySector: "",
  dealValueRange: "",
  targetEntities: 1,
  targetGaap: "",
  targetErp: "",
  buyerMaturity: "occasional",
};

export default function IntakeForm({ onSubmit }: Props) {
  const [tier, setTier] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<DealIntake>(EMPTY_INTAKE);
  const [errors, setErrors] = useState<Partial<Record<keyof DealIntake, string>>>({});

  function set<K extends keyof DealIntake>(key: K, value: DealIntake[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleJurisdiction(code: string) {
    const next = form.jurisdictions.includes(code)
      ? form.jurisdictions.filter((j) => j !== code)
      : [...form.jurisdictions, code];
    set("jurisdictions", next);
    // Auto-set crossBorder if non-US selected
    const hasNonUS = next.some((j) => !j.startsWith("US"));
    set("crossBorder", hasNonUS);
  }

  function validateTier1(): boolean {
    const e: typeof errors = {};
    if (!form.dealName.trim()) e.dealName = "Deal name is required";
    if (!form.closeDate) e.closeDate = "Close date is required";
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

  const tierLabels = ["Core Deal Info", "Context & Complexity", "Advanced Configuration"];
  const tierDescriptions = [
    "4 required fields — always collected",
    "5 fields — drives workstream activation",
    "3 fields — precision tuning for AI guidance",
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 720, margin: "0 auto" }}>

      {/* Intro */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          Fill in your deal details below. The engine will generate a fully configured integration
          checklist, risk assessment, and AI guidance within seconds.
        </p>
      </div>

      {/* Tier Progress */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28 }}>
        {[1, 2, 3].map((t) => (
          <div key={t} style={{ flex: 1, cursor: "pointer" }} onClick={() => {
            if (t < tier || (t === 2 && validateTier1())) setTier(t as 1 | 2 | 3);
            if (t === 1) setTier(1);
          }}>
            <div style={{
              height: 3, background: t <= tier ? COLORS.accent : COLORS.border,
              transition: "background 0.3s",
              borderRadius: t === 1 ? "2px 0 0 2px" : t === 3 ? "0 2px 2px 0" : 0
            }} />
            <div style={{ padding: "8px 4px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: t <= tier ? COLORS.accentDark : COLORS.textLight }}>
                Tier {t}
              </div>
              <div style={{ fontSize: 12, color: t === tier ? COLORS.text : COLORS.textMuted, fontWeight: t === tier ? 600 : 400 }}>
                {tierLabels[t - 1]}
              </div>
              <div style={{ fontSize: 11, color: COLORS.textLight }}>{tierDescriptions[t - 1]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== TIER 1 ===== */}
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
          </Field>

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

      {/* ===== TIER 2 ===== */}
      {tier === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
                    background: form.crossBorder === opt.value ? COLORS.accentBg : COLORS.card,
                    color: form.crossBorder === opt.value ? COLORS.accent : COLORS.textMuted,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

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
                      background: form.jurisdictions.includes(j.code) ? COLORS.accentBg : COLORS.card,
                      color: form.jurisdictions.includes(j.code) ? COLORS.accent : COLORS.textMuted,
                      fontSize: 10, fontWeight: 600, cursor: "pointer", textAlign: "left",
                    }}
                  >
                    {j.label}
                  </button>
                ))}
              </div>
              {form.jurisdictions.length >= 3 && (
                <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.dangerBg, border: `1px solid #fecaca`, fontSize: 11, color: COLORS.danger }}>
                  ⚠ {form.jurisdictions.length} jurisdictions selected — Regulatory Delay risk elevated (Critical)
                </div>
              )}
            </Field>
          )}

          <Field label="TSA Required?">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(["yes", "no", "tbd"] as TsaRequired[]).map((v) => (
                <button
                  key={v}
                  onClick={() => set("tsaRequired", v)}
                  style={{
                    padding: "8px", borderRadius: 6, border: `2px solid`,
                    borderColor: form.tsaRequired === v ? COLORS.accent : COLORS.border,
                    background: form.tsaRequired === v ? COLORS.accentBg : COLORS.card,
                    color: form.tsaRequired === v ? COLORS.accent : COLORS.textMuted,
                    fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
                  }}
                >
                  {v === "tbd" ? "TBD" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            {form.tsaRequired === "yes" && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.warningBg, border: `1px solid #fde68a`, fontSize: 11, color: COLORS.warning }}>
                ⚠ TSA required — TSA Assessment workstream fully activated
              </div>
            )}
            {form.tsaRequired === "no" && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.accentBg, border: `1px solid ${COLORS.accentBorder}`, fontSize: 11, color: COLORS.success }}>
                ✓ No TSA — TSA checklist items will be marked N/A
              </div>
            )}
          </Field>

          <Field label="Industry / Sector">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => set("industrySector", s)}
                  style={{
                    padding: "6px 8px", borderRadius: 4, border: `1px solid`,
                    borderColor: form.industrySector === s ? COLORS.accent : COLORS.border,
                    background: form.industrySector === s ? COLORS.accentBg : COLORS.card,
                    color: form.industrySector === s ? COLORS.accent : COLORS.textMuted,
                    fontSize: 10, cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
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

      {/* ===== TIER 3 ===== */}
      {tier === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ padding: "10px 14px", borderRadius: 6, background: COLORS.accentBg, border: `1px solid ${COLORS.accentBorder}`, fontSize: 11, color: COLORS.accentDark }}>
            Tier 3 inputs fine-tune AI guidance quality and GAAP/ERP-specific checklist items.
            Skip any field you don&apos;t know yet — you can update later.
          </div>

          <Field label="Target Accounting Standard (GAAP)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {GAAP_OPTIONS.map((g) => (
                <button
                  key={g}
                  onClick={() => set("targetGaap", g)}
                  style={{
                    padding: "8px", borderRadius: 4, border: `1px solid`,
                    borderColor: form.targetGaap === g ? COLORS.accent : COLORS.border,
                    background: form.targetGaap === g ? COLORS.accentBg : COLORS.card,
                    color: form.targetGaap === g ? COLORS.accent : COLORS.textMuted,
                    fontSize: 11, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            {form.targetGaap && form.targetGaap !== "US GAAP" && form.targetGaap !== "Unknown" && (
              <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, background: COLORS.warningBg, border: `1px solid #fde68a`, fontSize: 11, color: COLORS.warning }}>
                ⚠ {form.targetGaap} target — Financial Reporting Gap risk elevated. GAAP conversion workstream activated.
              </div>
            )}
          </Field>

          <Field label="Target ERP System">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {ERP_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => set("targetErp", e)}
                  style={{
                    padding: "6px 8px", borderRadius: 4, border: `1px solid`,
                    borderColor: form.targetErp === e ? COLORS.accent : COLORS.border,
                    background: form.targetErp === e ? COLORS.accentBg : COLORS.card,
                    color: form.targetErp === e ? COLORS.accent : COLORS.textMuted,
                    fontSize: 10, cursor: "pointer",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>

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
              background: (!form.dealName || !form.closeDate) ? COLORS.border : COLORS.accent,
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
        <label style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted }}>
          {label}{required && <span style={{ color: COLORS.danger, marginLeft: 2 }}>*</span>}
        </label>
        {hint && <div style={{ fontSize: 11, color: COLORS.textLight, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
      {error && <div style={{ fontSize: 11, color: COLORS.danger, marginTop: 4 }}>{error}</div>}
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
        padding: "12px 14px", borderRadius: 8, border: `2px solid`,
        borderColor: selected ? COLORS.accent : COLORS.border,
        background: selected ? COLORS.accentBg : COLORS.card,
        textAlign: "left", cursor: "pointer", transition: "all 0.15s",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: selected ? COLORS.accentDark : COLORS.text }}>{label}</div>
      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{desc}</div>
      {warning && (
        <div style={{ fontSize: 11, color: COLORS.warning, marginTop: 4, fontWeight: 600 }}>⚠ {warning}</div>
      )}
    </button>
  );
}

function inputStyle(hasError?: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1px solid ${hasError ? COLORS.danger : COLORS.border}`,
    background: COLORS.card, color: COLORS.text,
    fontSize: 13, fontFamily: "inherit",
    outline: "none",
  };
}

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.card, color: COLORS.text,
  fontSize: 13, fontFamily: "inherit", outline: "none",
  appearance: "none",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "11px 24px", borderRadius: 8, border: "none",
  background: COLORS.accent,
  color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  fontFamily: "inherit",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "11px 24px", borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.card, color: COLORS.textMuted,
  fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
};
