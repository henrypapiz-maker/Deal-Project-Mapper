"use client";

import React, { useState } from "react";
import type { GeneratedDeal } from "@/lib/types";
import { WORKSTREAM_TRACK_MAP, TRACK_ORDER } from "@/lib/bowler";

// ── Types ─────────────────────────────────────────────────────

interface SlidePreviewProps {
  deal: GeneratedDeal;
  scNarrative: Record<string, string>;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────

function splitSentences(text: string, max = 3): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function splitLines(text: string, max = 8): string[] {
  if (!text) return [];
  return text
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

function ragColor(rag: "red" | "amber" | "green" | string): string {
  if (rag === "red") return "#EF4444";
  if (rag === "amber") return "#F59E0B";
  return "#10B981";
}

function RagDot({ rag, size = 10 }: { rag: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: ragColor(rag),
        flexShrink: 0,
      }}
    />
  );
}

// ── Slide Styles ──────────────────────────────────────────────

const SLIDE_BASE: React.CSSProperties = {
  width: 960,
  height: 540,
  background: "#ffffff",
  position: "relative",
  overflow: "hidden",
  fontFamily: "'Segoe UI', Arial, sans-serif",
  boxSizing: "border-box",
  flexShrink: 0,
};

const SLIDE_HEADER: React.CSSProperties = {
  background: "#0F1B2D",
  color: "#F1F5F9",
  padding: "14px 28px",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const SLIDE_FOOTER: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  background: "#0F1B2D",
  color: "#94A3B8",
  fontSize: 9,
  padding: "5px 20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const SLIDE_BODY: React.CSSProperties = {
  padding: "18px 28px 36px 28px",
};

// ── Individual Slides ─────────────────────────────────────────

function Slide1Title({ deal }: { deal: GeneratedDeal }) {
  const { dealName, dealStructure, integrationModel, closeDate } = deal.intake;
  const structureLabels: Record<string, string> = {
    stock_purchase: "Stock Purchase",
    asset_purchase: "Asset Purchase",
    merger_forward: "Forward Merger",
    merger_reverse: "Reverse Merger",
    carve_out: "Carve-Out",
    f_reorg: "F-Reorganization",
  };
  const modelLabels: Record<string, string> = {
    fully_integrated: "Fully Integrated",
    hybrid: "Hybrid",
    standalone: "Standalone",
  };
  const firstPerson = deal.people[0]?.name ?? "IMO Team";
  const period = closeDate ? new Date(closeDate).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  return (
    <div style={{ ...SLIDE_BASE, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", background: "#0F1B2D" }}>
      <div style={{ textAlign: "center", padding: "0 60px" }}>
        <div style={{ fontSize: 11, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 14 }}>
          M&A Integration Program
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, color: "#F1F5F9", lineHeight: 1.15, marginBottom: 14 }}>
          {dealName}
        </div>
        <div style={{ fontSize: 15, color: "#94A3B8", marginBottom: 8 }}>
          {structureLabels[dealStructure] ?? dealStructure} &nbsp;·&nbsp; {modelLabels[integrationModel] ?? integrationModel}
        </div>
        {period && (
          <div style={{ fontSize: 13, color: "#64748B", marginBottom: 28 }}>
            Period: {period}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#94A3B8" }}>
          Prepared by: <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{firstPerson}</span>
        </div>
      </div>
      <div style={{ ...SLIDE_FOOTER, background: "#0a1220" }}>
        <span>DealMapper</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function Slide2ExecSummary({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const bullets = splitSentences(scNarrative.overallStatus ?? "", 3);
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];
  const pct = snapshot
    ? snapshot.summary.totalActive > 0
      ? Math.round((snapshot.summary.completed / snapshot.summary.totalActive) * 100)
      : 0
    : 0;
  const rag = pct >= 70 ? "green" : pct >= 40 ? "amber" : "red";

  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Executive Summary</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <RagDot rag={rag} size={20} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>
            Overall Integration Status — {rag === "green" ? "On Track" : rag === "amber" ? "At Risk" : "Critical"}
          </span>
        </div>
        {bullets.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
            {bullets.map((b, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{b}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>No overall status narrative available.</p>
        )}
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper — {deal.intake.dealName}</span>
        <span>Slide 2 of 9</span>
      </div>
    </div>
  );
}

function Slide3ProgramDashboard({ deal }: { deal: GeneratedDeal }) {
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];
  const stats = snapshot
    ? {
        active: snapshot.summary.totalActive,
        completed: snapshot.summary.completed,
        blocked: snapshot.summary.newlyBlocked,
        pastDue: snapshot.summary.pastDue,
        pct: snapshot.summary.totalActive > 0 ? Math.round((snapshot.summary.completed / snapshot.summary.totalActive) * 100) : 0,
      }
    : { active: 0, completed: 0, blocked: 0, pastDue: 0, pct: 0 };

  const programRag: "red" | "amber" | "green" =
    stats.blocked > stats.active * 0.1 ? "red" : stats.blocked > 0 || stats.pct < 40 ? "amber" : "green";

  const metrics = [
    { label: "Total Active", value: stats.active, color: "#3B82F6" },
    { label: "Completed", value: stats.completed, color: "#10B981" },
    { label: "Blocked", value: stats.blocked, color: "#EF4444" },
    { label: "Past Due", value: stats.pastDue, color: "#F59E0B" },
    { label: "% Complete", value: `${stats.pct}%`, color: "#6366F1" },
  ];

  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Program Dashboard</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 28 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          {metrics.map((m) => (
            <div
              key={m.label}
              style={{
                flex: 1,
                border: `1px solid #E2E8F0`,
                borderRadius: 8,
                padding: "14px 10px",
                textAlign: "center",
                borderTop: `4px solid ${m.color}`,
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
                {m.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: ragColor(programRag),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            {programRag}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
              Program RAG: {programRag === "green" ? "On Track" : programRag === "amber" ? "At Risk" : "Critical"}
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
              {stats.pct}% complete across {stats.active} active items
            </div>
          </div>
        </div>
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper — {deal.intake.dealName}</span>
        <span>Slide 3 of 9</span>
      </div>
    </div>
  );
}

function Slide4WorkstreamRAG({ deal }: { deal: GeneratedDeal }) {
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];

  // Build track-grouped rows
  const wsByTrack: Record<string, typeof snapshot.workstreams> = {};
  if (snapshot) {
    TRACK_ORDER.forEach((t) => { wsByTrack[t] = []; });
    snapshot.workstreams.forEach((ws) => {
      const track = WORKSTREAM_TRACK_MAP[ws.workstream] ?? "Other";
      if (!wsByTrack[track]) wsByTrack[track] = [];
      wsByTrack[track].push(ws);
    });
  }

  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Workstream RAG Summary</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 14 }}>
        {snapshot ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ textAlign: "left", padding: "5px 8px", borderBottom: "2px solid #E2E8F0", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Workstream</th>
                <th style={{ textAlign: "center", padding: "5px 8px", borderBottom: "2px solid #E2E8F0", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>RAG</th>
                <th style={{ textAlign: "center", padding: "5px 8px", borderBottom: "2px solid #E2E8F0", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>% Done</th>
                <th style={{ textAlign: "center", padding: "5px 8px", borderBottom: "2px solid #E2E8F0", color: "#64748B", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Blocked</th>
              </tr>
            </thead>
            <tbody>
              {TRACK_ORDER.flatMap((track) => {
                const rows = wsByTrack[track] ?? [];
                if (rows.length === 0) return [];
                return [
                  <tr key={`track-${track}`} style={{ background: "#F1F5F9" }}>
                    <td colSpan={4} style={{ padding: "4px 8px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "#334155" }}>
                      {track}
                    </td>
                  </tr>,
                  ...rows.map((ws) => {
                    const effectiveRag = deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride ?? ws.ragStatus;
                    return (
                      <tr key={ws.workstream} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "4px 8px 4px 16px", color: "#334155" }}>{ws.workstream}</td>
                        <td style={{ textAlign: "center", padding: "4px 8px" }}>
                          <RagDot rag={effectiveRag} size={10} />
                        </td>
                        <td style={{ textAlign: "center", padding: "4px 8px", color: "#334155" }}>{ws.pctComplete}%</td>
                        <td style={{ textAlign: "center", padding: "4px 8px", color: ws.blocked > 0 ? "#EF4444" : "#94A3B8" }}>{ws.blocked}</td>
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        ) : (
          <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>No snapshot data available.</p>
        )}
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper — {deal.intake.dealName}</span>
        <span>Slide 4 of 9</span>
      </div>
    </div>
  );
}

function Slide5KeyIssues({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const bullets = splitLines(scNarrative.keyIssues ?? "", 6);
  const blockedItems = deal.checklistItems.filter((i) => i.status === "blocked").slice(0, 5);

  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Key Issues &amp; Blockers</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 20, display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Key Issues
          </div>
          {bullets.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
              {bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic" }}>No key issues narrative provided.</p>
          )}
        </div>
        <div style={{ width: 1, background: "#E2E8F0" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
            Blocked Items ({deal.checklistItems.filter((i) => i.status === "blocked").length})
          </div>
          {blockedItems.length > 0 ? (
            blockedItems.map((item) => (
              <div key={item.id} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: "3px solid #EF4444" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#1E293B" }}>{item.itemId} — {item.description.slice(0, 60)}{item.description.length > 60 ? "…" : ""}</div>
                {item.blockedReason && (
                  <div style={{ fontSize: 10, color: "#EF4444", marginTop: 1 }}>{item.blockedReason.slice(0, 80)}</div>
                )}
              </div>
            ))
          ) : (
            <p style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic" }}>No blocked items.</p>
          )}
        </div>
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper — {deal.intake.dealName}</span>
        <span>Slide 5 of 9</span>
      </div>
    </div>
  );
}

function Slide6KeyRisks({ deal }: { deal: GeneratedDeal }) {
  const openRisks = deal.riskAlerts.filter((r) => r.status === "open").slice(0, 5);
  const severityColor: Record<string, string> = {
    critical: "#EF4444",
    high: "#F97316",
    medium: "#F59E0B",
    low: "#10B981",
  };
  const severityBg: Record<string, string> = {
    critical: "#FEF2F2",
    high: "#FFF7ED",
    medium: "#FFFBEB",
    low: "#F0FDF4",
  };

  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Key Risks</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 24 }}>
        {openRisks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {openRisks.map((risk) => (
              <div
                key={risk.id}
                style={{
                  border: `1px solid ${severityColor[risk.severity] ?? "#E2E8F0"}`,
                  borderRadius: 6,
                  padding: "10px 14px",
                  background: severityBg[risk.severity] ?? "#fff",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    background: severityColor[risk.severity] ?? "#64748B",
                    color: "#fff",
                    borderRadius: 4,
                    padding: "2px 7px",
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {risk.severity}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#1E293B", marginBottom: 3 }}>
                    {risk.description}
                  </div>
                  {risk.mitigation && (
                    <div style={{ fontSize: 10, color: "#64748B" }}>
                      Mitigation: {risk.mitigation.slice(0, 120)}{risk.mitigation.length > 120 ? "…" : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>No open risks on record.</p>
        )}
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper — {deal.intake.dealName}</span>
        <span>Slide 6 of 9</span>
      </div>
    </div>
  );
}

function Slide7FinancialImpacts({ scNarrative }: { scNarrative: Record<string, string> }) {
  const bullets = splitLines(scNarrative.financialImpacts ?? "", 8);
  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Financial Impacts</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 24 }}>
        {bullets.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "#334155", lineHeight: 1.9 }}>
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>No financial impacts narrative provided.</p>
        )}
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper</span>
        <span>Slide 7 of 9</span>
      </div>
    </div>
  );
}

function Slide8KeyDecisions({ scNarrative }: { scNarrative: Record<string, string> }) {
  const items = splitLines(scNarrative.keyDecisionsEscalations ?? "", 8);
  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Key Decisions &amp; Escalations</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 24 }}>
        {items.length > 0 ? (
          <ol style={{ margin: 0, paddingLeft: 22, fontSize: 13, color: "#334155", lineHeight: 1.9 }}>
            {items.map((item, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{item}</li>
            ))}
          </ol>
        ) : (
          <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>No key decisions or escalations provided.</p>
        )}
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper</span>
        <span>Slide 8 of 9</span>
      </div>
    </div>
  );
}

function Slide9NextSteps({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const budgetExcerpt = (scNarrative.overallBudget ?? "").slice(0, 280);
  const forwardItems = splitLines(scNarrative.keyDelays ?? scNarrative.materialDependencies ?? "", 5);
  const nextMilestones = deal.milestones.slice(0, 3);

  return (
    <div style={SLIDE_BASE}>
      <div style={SLIDE_HEADER}>Next Steps &amp; Forward Look</div>
      <div style={{ ...SLIDE_BODY, paddingTop: 18, display: "flex", gap: 20 }}>
        <div style={{ flex: 1 }}>
          {budgetExcerpt && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Budget Overview
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.6 }}>{budgetExcerpt}</p>
            </div>
          )}
          {forwardItems.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Forward-Looking Items
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155", lineHeight: 1.8 }}>
                {forwardItems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
          {!budgetExcerpt && forwardItems.length === 0 && (
            <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic" }}>No next steps narrative provided.</p>
          )}
        </div>
        {nextMilestones.length > 0 && (
          <div style={{ width: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Upcoming Milestones
            </div>
            {nextMilestones.map((m) => (
              <div
                key={m.phase}
                style={{
                  marginBottom: 8,
                  padding: "8px 10px",
                  border: "1px solid #E2E8F0",
                  borderRadius: 6,
                  background: "#F8FAFC",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1E293B" }}>{m.label}</div>
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{m.date}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={SLIDE_FOOTER}>
        <span>DealMapper — {deal.intake.dealName}</span>
        <span>Slide 9 of 9</span>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function SlidePreview({ deal, scNarrative, onClose }: SlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const TOTAL_SLIDES = 9;

  const slides = [
    <Slide1Title key={0} deal={deal} />,
    <Slide2ExecSummary key={1} deal={deal} scNarrative={scNarrative} />,
    <Slide3ProgramDashboard key={2} deal={deal} />,
    <Slide4WorkstreamRAG key={3} deal={deal} />,
    <Slide5KeyIssues key={4} deal={deal} scNarrative={scNarrative} />,
    <Slide6KeyRisks key={5} deal={deal} />,
    <Slide7FinancialImpacts key={6} scNarrative={scNarrative} />,
    <Slide8KeyDecisions key={7} scNarrative={scNarrative} />,
    <Slide9NextSteps key={8} deal={deal} scNarrative={scNarrative} />,
  ];

  function handlePrev() {
    setCurrentSlide((p) => Math.max(0, p - 1));
  }

  function handleNext() {
    setCurrentSlide((p) => Math.min(TOTAL_SLIDES - 1, p + 1));
  }

  function handlePrint() {
    window.print();
  }

  async function handleCopySlide() {
    const slideEl = document.getElementById(`slide-content-${currentSlide}`);
    if (!slideEl) return;
    await navigator.clipboard.writeText(slideEl.innerText ?? "");
  }

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #slide-print-container,
          #slide-print-container * { visibility: visible !important; }
          #slide-print-container { position: fixed; top: 0; left: 0; width: 100vw; }
          .slide-print-item { page-break-after: always; width: 960px; height: 540px; }
          .slide-print-item:last-child { page-break-after: avoid; }
          #slide-preview-controls { display: none !important; }
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Full-screen overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          animation: "fadeIn 0.2s ease",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Slide indicator */}
        <div
          style={{
            color: "#94A3B8",
            fontSize: 12,
            marginBottom: 12,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          Slide {currentSlide + 1} of {TOTAL_SLIDES}
        </div>

        {/* Slide stage */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Left arrow */}
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            style={{
              background: currentSlide === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
              color: currentSlide === 0 ? "#475569" : "#F1F5F9",
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              fontSize: 20,
              cursor: currentSlide === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ←
          </button>

          {/* Slide display */}
          <div
            style={{
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div id={`slide-content-${currentSlide}`}>
              {slides[currentSlide]}
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={handleNext}
            disabled={currentSlide === TOTAL_SLIDES - 1}
            style={{
              background: currentSlide === TOTAL_SLIDES - 1 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.12)",
              color: currentSlide === TOTAL_SLIDES - 1 ? "#475569" : "#F1F5F9",
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              fontSize: 20,
              cursor: currentSlide === TOTAL_SLIDES - 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            →
          </button>
        </div>

        {/* Dot navigation */}
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              style={{
                width: i === currentSlide ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background: i === currentSlide ? "#3B82F6" : "#475569",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.15s, background 0.15s",
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div
          id="slide-preview-controls"
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            style={controlBtnStyle(currentSlide === 0)}
          >
            ← Prev
          </button>
          <button
            onClick={handleNext}
            disabled={currentSlide === TOTAL_SLIDES - 1}
            style={controlBtnStyle(currentSlide === TOTAL_SLIDES - 1)}
          >
            Next →
          </button>
          <button onClick={handlePrint} style={controlBtnStyle(false, "#3B82F6")}>
            Print All Slides
          </button>
          <button onClick={handleCopySlide} style={controlBtnStyle(false, "#10B981")}>
            Copy Slide
          </button>
          <button onClick={onClose} style={controlBtnStyle(false, "#EF4444")}>
            Close
          </button>
        </div>
      </div>

      {/* Hidden print container (all slides) */}
      <div id="slide-print-container" style={{ display: "none" }}>
        {slides.map((slide, i) => (
          <div key={i} className="slide-print-item">
            {slide}
          </div>
        ))}
      </div>
    </>
  );
}

function controlBtnStyle(disabled: boolean, accentColor?: string): React.CSSProperties {
  return {
    background: disabled
      ? "rgba(255,255,255,0.05)"
      : accentColor
      ? accentColor
      : "rgba(255,255,255,0.12)",
    color: disabled ? "#475569" : "#F1F5F9",
    border: "none",
    borderRadius: 6,
    padding: "7px 16px",
    fontSize: 12,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
