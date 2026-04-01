"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { GeneratedDeal, WorkstreamSnapshot } from "@/lib/types";
import { WORKSTREAM_TRACK_MAP, TRACK_ORDER } from "@/lib/bowler";
import { computeProgramRAG } from "@/lib/progress";

// ── Props ──────────────────────────────────────────────────────────────────────

interface SlidePreviewProps {
  deal: GeneratedDeal;
  scNarrative: Record<string, string>;
  onClose: () => void;
}

// ── Design Tokens ─────────────────────────────────────────────────────────────

const C = {
  navyDark:   "#1A1A2E",
  navyAccent: "#1E3A5F",
  slateGray:  "#64748B",
  border:     "#D1D8E0",
  bgLight:    "#F7F9FC",
  bgMid:      "#EEF2F7",
  white:      "#FFFFFF",
  ragRed:     "#DC2626",
  ragAmber:   "#D97706",
  ragGreen:   "#059669",
  alert:      "#EF4444",
  progressBlue: "#2563EB",
  progressGray: "#CBD5E1",
};

const FONT = "'Segoe UI', 'Inter', 'Arial', sans-serif";
const TOTAL_SLIDES = 11;

// ── Helper Functions ───────────────────────────────────────────────────────────

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

function ragColor(rag: string): string {
  if (rag === "red")   return C.ragRed;
  if (rag === "amber") return C.ragAmber;
  return C.ragGreen;
}

function ragLabel(rag: string): string {
  if (rag === "red")   return "Critical";
  if (rag === "amber") return "At Risk";
  return "On Track";
}

function fmt(n: number): string {
  return n.toLocaleString();
}

function weekEnding(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + (diff === 0 ? 0 : diff));
  return friday.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ── Computed Stats ─────────────────────────────────────────────────────────────

function computeStats(deal: GeneratedDeal) {
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];
  if (snapshot) {
    const s = snapshot.summary;
    const total = s.totalActive;
    const completed = s.completed;
    const inProgress = s.newlyInProgress;
    const blocked = s.newlyBlocked;
    const pastDue = s.pastDue;
    const notStarted = s.unchanged;
    const unassigned = deal.checklistItems.filter(
      (i) => i.status !== "na" && !i.ownerId
    ).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const programRag = computeProgramRAG(snapshot.workstreams);
    return { total, completed, inProgress, blocked, pastDue, notStarted, unassigned, pct, programRag, snapshot };
  }

  // Fallback: compute from checklistItems directly
  const active = deal.checklistItems.filter((i) => i.status !== "na");
  const today = new Date().toISOString().split("T")[0];
  const completed = active.filter((i) => i.status === "complete").length;
  const inProgress = active.filter((i) => i.status === "in_progress").length;
  const blocked = active.filter((i) => i.status === "blocked").length;
  const notStarted = active.filter((i) => i.status === "not_started").length;
  const pastDue = active.filter(
    (i) => i.milestoneDate && i.milestoneDate < today && i.status !== "complete"
  ).length;
  const unassigned = active.filter((i) => !i.ownerId).length;
  const total = active.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const programRag: "red" | "amber" | "green" =
    blocked > total * 0.1 ? "red" : blocked > 0 || pct < 40 ? "amber" : "green";
  return { total, completed, inProgress, blocked, pastDue, notStarted, unassigned, pct, programRag, snapshot: null };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function RagCircle({ rag, size = 14 }: { rag: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: ragColor(rag),
        flexShrink: 0,
        verticalAlign: "middle",
      }}
    />
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: C.ragRed,   text: C.white },
    high:     { bg: C.ragAmber, text: C.white },
    medium:   { bg: C.progressBlue, text: C.white },
    low:      { bg: C.slateGray, text: C.white },
  };
  const c = colors[severity] ?? colors.low;
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        borderRadius: 3,
        padding: "1px 6px",
        fontSize: 8,
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: 0.4,
        flexShrink: 0,
      }}
    >
      {severity}
    </span>
  );
}

// ── Slide Layout ───────────────────────────────────────────────────────────────

const SLIDE_W = 960;
const SLIDE_H = 540;

function SlideShell({
  slideNum,
  dealName,
  children,
  actionTitle,
  noPadding,
}: {
  slideNum: number;
  dealName: string;
  children: React.ReactNode;
  actionTitle?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        background: C.white,
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
        boxSizing: "border-box",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: C.navyAccent, flexShrink: 0 }} />

      {/* Action title bar */}
      {actionTitle && (
        <div
          style={{
            background: C.navyAccent,
            color: C.white,
            padding: "8px 40px",
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.35,
            flexShrink: 0,
          }}
        >
          {actionTitle}
        </div>
      )}

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          ...(noPadding ? {} : { padding: "20px 40px 0 40px" }),
        }}
      >
        {children}
      </div>

      {/* Footer */}
      <div
        style={{
          height: 24,
          background: C.navyDark,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 8, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>
          CONFIDENTIAL — {dealName}
        </span>
        <span style={{ fontSize: 8, color: "#64748B" }}>DealMapper Intelligence</span>
        <span style={{ fontSize: 8, color: "#94A3B8" }}>Page {slideNum}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 1 — COVER
// ══════════════════════════════════════════════════════════════════════════════

function Slide1Cover({ deal }: { deal: GeneratedDeal }) {
  const { dealName, dealStructure, integrationModel } = deal.intake;
  const imoLead = deal.people[0]?.name ?? "IMO Team";
  const structureLabel: Record<string, string> = {
    stock_purchase: "Stock Purchase",
    asset_purchase: "Asset Purchase",
    merger_forward: "Forward Merger",
    merger_reverse: "Reverse Merger",
    carve_out: "Carve-Out",
    f_reorg: "F-Reorganization",
  };
  const modelLabel: Record<string, string> = {
    fully_integrated: "Fully Integrated",
    hybrid: "Hybrid",
    standalone: "Standalone",
  };

  return (
    <div
      style={{
        width: SLIDE_W,
        height: SLIDE_H,
        background: C.white,
        fontFamily: FONT,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left navy panel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: "100%",
          background: C.navyAccent,
        }}
      />
      {/* Top accent strip */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 320,
          right: 0,
          height: 4,
          background: C.ragAmber,
        }}
      />

      {/* Left panel content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 320,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "28px 24px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 9, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: 1.5, fontWeight: 700, marginBottom: 24 }}>
          M&amp;A Integration Program
        </div>
        <div style={{ width: 32, height: 2, background: C.ragAmber, marginBottom: 24 }} />
        <div style={{ fontSize: 11, color: "#CBD5E1", lineHeight: 1.6, marginBottom: 20 }}>
          {structureLabel[dealStructure] ?? dealStructure}
          <span style={{ color: "#64748B", margin: "0 8px" }}>·</span>
          {modelLabel[integrationModel] ?? integrationModel}
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>
          Week ending: <span style={{ color: "#F1F5F9" }}>{weekEnding()}</span>
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>
          Prepared for: <span style={{ color: "#F1F5F9" }}>Steering Committee</span>
        </div>
        <div style={{ fontSize: 10, color: "#94A3B8", marginBottom: 6 }}>
          Prepared by: <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{imoLead}</span>
        </div>
        <div style={{ marginTop: 32, borderTop: "1px solid #334155", paddingTop: 16 }}>
          <div style={{ fontSize: 8, color: "#475569", textTransform: "uppercase" as const, letterSpacing: 1, fontWeight: 700 }}>
            CONFIDENTIAL
          </div>
          <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>
            Not for distribution. Internal use only.
          </div>
        </div>
      </div>

      {/* Right panel — deal name */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 320,
          right: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "20px 28px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontSize: 11, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 1.5, fontWeight: 700, marginBottom: 16 }}>
          Integration Program Status Report
        </div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: C.navyDark,
            lineHeight: 1.2,
            marginBottom: 20,
            letterSpacing: -0.5,
          }}
        >
          {dealName}
        </div>
        <div style={{ width: 48, height: 3, background: C.navyAccent, marginBottom: 24 }} />
        <div style={{ fontSize: 12, color: C.slateGray, lineHeight: 1.5 }}>
          This report provides a comprehensive status update on the integration program, including workstream progress, key issues, risks, and decisions required from the Steering Committee.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 24,
          background: C.navyDark,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 20px",
        }}
      >
        <span style={{ fontSize: 8, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.3 }}>
          CONFIDENTIAL — {dealName}
        </span>
        <span style={{ fontSize: 8, color: "#64748B" }}>DealMapper Intelligence</span>
        <span style={{ fontSize: 8, color: "#94A3B8" }}>Page 1</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 2 — EXECUTIVE OVERVIEW (merged: exec summary + workstream RAG)
// ══════════════════════════════════════════════════════════════════════════════

function Slide2ExecOverview({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const stats = computeStats(deal);
  const { pct, programRag, completed, total, blocked, pastDue } = stats;
  const active = stats.inProgress;
  const bullets = splitSentences(scNarrative.overallStatus ?? "", 3);
  const issueCount = splitLines(scNarrative.keyIssues ?? "", 99).length;

  const actionTitle = `Program is rated ${ragLabel(programRag).toUpperCase()} with ${pct}% completion${issueCount > 0 ? `; ${issueCount} open issue${issueCount !== 1 ? "s" : ""} require attention` : ""}`;

  const metricCards = [
    { label: "Items Complete", value: fmt(completed), color: C.ragGreen },
    { label: "Items Active",   value: fmt(active),    color: C.progressBlue },
    { label: "Blocked",        value: fmt(blocked),   color: blocked > 0 ? C.ragRed : C.slateGray },
    { label: "Past Due",       value: fmt(pastDue),   color: pastDue > 0 ? C.ragAmber : C.slateGray },
  ];

  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];

  // Build workstream rows grouped by track — only RAG dot + % complete
  const wsByTrack: Record<string, WorkstreamSnapshot[]> = {};
  TRACK_ORDER.forEach((t) => { wsByTrack[t] = []; });
  if (snapshot) {
    snapshot.workstreams.forEach((ws) => {
      const track = WORKSTREAM_TRACK_MAP[ws.workstream] ?? "Other";
      if (!wsByTrack[track]) wsByTrack[track] = [];
      wsByTrack[track].push(ws);
    });
  }

  // Determine which workstreams need footnote markers
  // ¹ = has blocked items (see Slide 5 Key Issues), ² = referenced in Key Delays
  const blockedWsNames = new Set<string>(
    deal.checklistItems.filter((i) => i.status === "blocked").map((i) => i.workstream as string)
  );
  const delayText = (scNarrative.keyDelays ?? "").toLowerCase();

  return (
    <SlideShell slideNum={2} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 20, height: "100%", overflow: "hidden" }}>

        {/* LEFT COLUMN — RAG + KPIs + narrative */}
        <div style={{ flex: "0 0 240px", display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
          {/* Big RAG circle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: ragColor(programRag),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                boxShadow: `0 0 0 6px ${ragColor(programRag)}22`,
              }}
            >
              <span style={{ fontSize: 8, color: C.white, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                {programRag}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: C.navyDark }}>{ragLabel(programRag)}</div>
            <div style={{ fontSize: 9, color: C.slateGray }}>Overall Program Status</div>
          </div>

          {/* 4 metric cards in 2×2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {metricCards.map((m) => (
              <div
                key={m.label}
                style={{
                  border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${m.color}`,
                  borderRadius: 4,
                  padding: "6px 6px",
                  textAlign: "center",
                  background: C.white,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 7.5, color: C.slateGray, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.3, marginTop: 3 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Narrative */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 0.7, marginBottom: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 3 }}>
              Executive Narrative
            </div>
            {bullets.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {bullets.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 10,
                      color: C.navyDark,
                      lineHeight: 1.45,
                      marginBottom: 5,
                      paddingLeft: 10,
                      borderLeft: `2px solid ${C.navyAccent}`,
                    }}
                  >
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 10, color: C.slateGray, fontStyle: "italic", margin: 0 }}>
                No overall status narrative provided.
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* RIGHT COLUMN — workstream RAG table (RAG + % only) */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.7, marginBottom: 6, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 3 }}>
            Workstream Status at a Glance
          </div>
          {snapshot ? (
            <>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
                  <thead>
                    <tr style={{ background: C.bgMid }}>
                      {["WORKSTREAM", "RAG", "% DONE"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: h === "WORKSTREAM" ? "left" : "center",
                            padding: "4px 6px",
                            borderBottom: `2px solid ${C.navyAccent}`,
                            color: C.navyAccent,
                            fontWeight: 700,
                            textTransform: "uppercase" as const,
                            letterSpacing: 0.4,
                            fontSize: 8,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TRACK_ORDER.flatMap((track) => {
                      const rows = wsByTrack[track] ?? [];
                      if (rows.length === 0) return [];
                      return [
                        <tr key={`track-${track}`} style={{ background: C.bgMid }}>
                          <td
                            colSpan={3}
                            style={{
                              padding: "3px 6px",
                              fontSize: 7.5,
                              fontWeight: 800,
                              textTransform: "uppercase" as const,
                              letterSpacing: 0.8,
                              color: C.navyAccent,
                              borderTop: `1px solid ${C.border}`,
                            }}
                          >
                            {track}
                          </td>
                        </tr>,
                        ...rows.map((ws) => {
                          const eff = deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride ?? ws.ragStatus;
                          const hasBlocked = blockedWsNames.has(ws.workstream as string);
                          const inDelays = delayText.includes((ws.workstream as string).toLowerCase());
                          const sup = hasBlocked ? "¹" : inDelays ? "²" : "";
                          return (
                            <tr key={ws.workstream} style={{ borderBottom: `1px solid ${C.bgMid}` }}>
                              <td style={{ padding: "3px 6px 3px 12px", color: C.navyDark, fontWeight: 500, fontSize: 9 }}>
                                {ws.workstream}{sup && <sup style={{ color: C.ragAmber, fontWeight: 700, fontSize: 7 }}>{sup}</sup>}
                              </td>
                              <td style={{ textAlign: "center", padding: "3px 6px" }}>
                                <RagCircle rag={eff} size={9} />
                              </td>
                              <td style={{ textAlign: "center", padding: "3px 6px", color: C.navyDark, fontWeight: 600, fontSize: 9 }}>
                                {ws.pctComplete}%
                              </td>
                            </tr>
                          );
                        }),
                      ];
                    })}
                  </tbody>
                </table>
              </div>
              {/* Footnotes */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 5, marginTop: 4 }}>
                <div style={{ fontSize: 8, color: C.slateGray, lineHeight: 1.5 }}>
                  <sup style={{ color: C.ragAmber, fontWeight: 700 }}>¹</sup> See Slide 5: Key Issues &nbsp;&nbsp;
                  <sup style={{ color: C.ragAmber, fontWeight: 700 }}>²</sup> See Slide 7: Key Delays
                </div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic" }}>No snapshot data available.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — TABLE OF CONTENTS / INDEX
// ══════════════════════════════════════════════════════════════════════════════

const INDEX_ENTRIES = [
  { num: 1, title: "Executive Overview",                pageNum: 2 },
  { num: 2, title: "Workstream Progress",               pageNum: 4 },
  { num: 3, title: "Key Issues & Blockers",             pageNum: 5 },
  { num: 4, title: "Key Risks",                         pageNum: 6 },
  { num: 5, title: "Key Delays",                        pageNum: 7 },
  { num: 6, title: "Key Findings",                      pageNum: 8 },
  { num: 7, title: "Financial Summary & Budget",        pageNum: 9 },
  { num: 8, title: "Dependencies & Operational Impacts",pageNum: 10 },
  { num: 9, title: "Decisions & Escalations",           pageNum: 11 },
];

function Slide3TableOfContents({ deal }: { deal: GeneratedDeal }) {
  return (
    <SlideShell slideNum={3} dealName={deal.intake.dealName}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", paddingTop: 8 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
            Integration Program Status Report
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.navyDark, letterSpacing: -0.3, lineHeight: 1 }}>
            Table of Contents
          </div>
          <div style={{ width: 40, height: 3, background: C.navyAccent, marginTop: 8 }} />
        </div>

        {/* Index entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {INDEX_ENTRIES.map((entry, i) => (
            <div
              key={entry.num}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 0,
                padding: "7px 0",
                borderBottom: i < INDEX_ENTRIES.length - 1 ? `1px solid ${C.bgMid}` : "none",
              }}
            >
              {/* Number badge */}
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: C.navyAccent,
                  color: C.white,
                  fontSize: 10,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {entry.num}
              </span>

              {/* Title */}
              <span style={{ fontSize: 13, fontWeight: 600, color: C.navyDark, flex: 1 }}>
                {entry.title}
              </span>

              {/* Dot leaders */}
              <span
                style={{
                  flex: "0 1 120px",
                  borderBottom: `1px dotted ${C.border}`,
                  marginBottom: 3,
                  marginLeft: 8,
                  marginRight: 8,
                }}
              />

              {/* Page number */}
              <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: C.navyAccent, minWidth: 24, textAlign: "right" }}>
                {entry.pageNum}
              </span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — WORKSTREAM PROGRESS (SVG bars + target line + commentary)
// ══════════════════════════════════════════════════════════════════════════════

function Slide4WorkstreamProgress({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];

  // Derive target % from program phase / days from close
  const currentMilestone = deal.milestones.find((m) => new Date(m.date) >= new Date());
  const targetPct = currentMilestone ? Math.min(Math.round((currentMilestone.daysFromClose / 100) * 100), 100) : 30;

  if (!snapshot || snapshot.workstreams.length === 0) {
    return (
      <SlideShell slideNum={4} dealName={deal.intake.dealName} actionTitle="Workstream progress bars — no snapshot data">
        <p style={{ fontSize: 12, color: C.slateGray, fontStyle: "italic" }}>No workstream data available.</p>
      </SlideShell>
    );
  }

  // Remove workstreams with 0% AND 0 in-progress
  const active = snapshot.workstreams.filter((ws) => ws.pctComplete > 0 || ws.inProgress > 0);
  // Sort ascending by pctComplete (worst at top)
  const sorted = [...active].sort((a, b) => a.pctComplete - b.pctComplete);
  const displayed = sorted.slice(0, 13);

  const activeCount = active.length;
  const totalCount  = snapshot.workstreams.length;
  const notStartedCount = totalCount - activeCount;

  // Commentary — pull from narrative or auto-generate
  const narrativeOverall = scNarrative.overallStatus ?? "";
  const commentaryLine = narrativeOverall.length > 20
    ? narrativeOverall.split(/(?<=[.!?])\s+/)[0] ?? ""
    : notStartedCount > 0
    ? `${notStartedCount} workstream${notStartedCount !== 1 ? "s" : ""} have not yet commenced; dependencies or pending vendor approvals may be the cause.`
    : "";

  const redCount = snapshot.workstreams.filter((w) => (deal.ragOverrides?.[w.workstream] ?? w.ragOverride ?? w.ragStatus) === "red").length;
  const actionTitle = `${activeCount} of ${totalCount} workstreams have active work underway${redCount > 0 ? `; ${redCount} rated RED` : ""}`;

  const SVG_W = 840;
  const ROW_H = 22;
  const LABEL_W = 195;
  const BAR_AREA_W = 555;
  const MARGIN_TOP = 8;
  const svgHeight = MARGIN_TOP + displayed.length * ROW_H + 10;

  return (
    <SlideShell slideNum={4} dealName={deal.intake.dealName} actionTitle={actionTitle} noPadding>
      <div style={{ padding: "10px 40px 0 40px" }}>
        {/* Legend */}
        <div style={{ display: "flex", marginBottom: 6, paddingLeft: LABEL_W + 14 }}>
          {[
            { label: "Complete",    color: C.ragGreen },
            { label: "In Progress", color: C.progressBlue },
            { label: "Blocked",     color: C.ragRed },
            { label: "Not Started", color: C.progressGray },
            { label: `Target (${targetPct}%)`, color: C.ragAmber, dashed: true },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3, marginRight: 12 }}>
              {l.dashed ? (
                <svg width={14} height={10}><line x1={0} y1={5} x2={14} y2={5} stroke={l.color} strokeWidth={1.5} strokeDasharray="3,2" /></svg>
              ) : (
                <span style={{ width: 7, height: 7, background: l.color, display: "inline-block", borderRadius: 1 }} />
              )}
              <span style={{ fontSize: 8, color: C.slateGray }}>{l.label}</span>
            </div>
          ))}
        </div>

        <svg width={SVG_W} height={svgHeight} style={{ display: "block", overflow: "visible" }}>
          {/* Target line — vertical dashed line across all bars */}
          {(() => {
            const barX = LABEL_W + 14;
            const targetX = barX + Math.round((targetPct / 100) * BAR_AREA_W);
            return (
              <line
                x1={targetX} y1={MARGIN_TOP - 4}
                x2={targetX} y2={svgHeight - 4}
                stroke={C.ragAmber}
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
            );
          })()}

          {displayed.map((ws, i) => {
            const y = MARGIN_TOP + i * ROW_H;
            const barY = y + 4;
            const BAR_H = 13;
            const safeTotal = ws.total || 1;
            const cW = Math.round((ws.completed  / safeTotal) * BAR_AREA_W);
            const iW = Math.round((ws.inProgress / safeTotal) * BAR_AREA_W);
            const bW = Math.round((ws.blocked    / safeTotal) * BAR_AREA_W);
            const nW = Math.max(0, BAR_AREA_W - cW - iW - bW);
            const barX = LABEL_W + 14;
            const name = ws.workstream.length > 26 ? ws.workstream.slice(0, 24) + "…" : ws.workstream;
            const effectiveRagVal = deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride ?? ws.ragStatus;

            return (
              <g key={ws.workstream}>
                <text x={0} y={y + BAR_H - 1} fontSize={9} fill={C.navyDark} fontFamily={FONT} fontWeight="500">{name}</text>
                <circle cx={LABEL_W + 8} cy={y + BAR_H / 2 + 4} r={4} fill={ragColor(effectiveRagVal)} />
                {cW > 0 && <rect x={barX} y={barY} width={cW} height={BAR_H} fill={C.ragGreen} />}
                {iW > 0 && <rect x={barX + cW} y={barY} width={iW} height={BAR_H} fill={C.progressBlue} />}
                {bW > 0 && <rect x={barX + cW + iW} y={barY} width={bW} height={BAR_H} fill={C.ragRed} />}
                {nW > 0 && <rect x={barX + cW + iW + bW} y={barY} width={nW} height={BAR_H} fill={C.progressGray} />}
                <rect x={barX} y={barY} width={BAR_AREA_W} height={BAR_H} fill="none" stroke={C.border} strokeWidth={0.5} rx={2} />
                <text x={barX + BAR_AREA_W + 6} y={y + BAR_H - 1} fontSize={9} fill={C.navyAccent} fontFamily={FONT} fontWeight="700">
                  {ws.pctComplete}%
                </text>
              </g>
            );
          })}
        </svg>

        {sorted.length > 13 && (
          <div style={{ fontSize: 9, color: C.slateGray, fontStyle: "italic", marginTop: 2 }}>
            Showing 13 of {sorted.length} active workstreams. See appendix for full detail.
          </div>
        )}

        {/* Commentary box */}
        <div
          style={{
            marginTop: 8,
            background: C.bgLight,
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.navyAccent}`,
            borderRadius: 4,
            padding: "7px 12px",
            fontSize: 10,
            color: C.navyDark,
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: C.navyAccent }}>{activeCount} of {totalCount}</strong> workstreams have active work underway.
          {commentaryLine ? ` ${commentaryLine}` : ""}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — KEY ISSUES & BLOCKERS (card format)
// ══════════════════════════════════════════════════════════════════════════════

function Slide5KeyIssues({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const totalBlocked = deal.checklistItems.filter((i) => i.status === "blocked").length;
  const wsWithBlocked = new Set(
    deal.checklistItems.filter((i) => i.status === "blocked").map((i) => i.workstream)
  ).size;
  const actionTitle = `${totalBlocked} item${totalBlocked !== 1 ? "s" : ""} blocked across ${wsWithBlocked} workstream${wsWithBlocked !== 1 ? "s" : ""}; critical path items identified`;

  // Build issue cards from narrative lines + blocked items with sufficient context
  const issueBullets = splitLines(scNarrative.keyIssues ?? "", 8);

  // Blocked items: only show if description is substantive (>30 chars) and has blockedReason, no truncation
  const richBlockedItems = deal.checklistItems
    .filter((i) => i.status === "blocked" && i.description.length > 30 && !!i.blockedReason && i.blockedReason.length > 10)
    .slice(0, 4);

  return (
    <SlideShell slideNum={5} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 20, height: "100%", overflow: "hidden" }}>

        {/* Left — narrative issue cards */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 4, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 3 }}>
            Key Issues
          </div>
          {issueBullets.length > 0 ? (
            issueBullets.map((b, i) => {
              // Heuristic severity: critical if "critical"|"immediate"|"block", high if "urgent"|"escalat"|"risk"
              const isCritical = /critical|immediate|block/i.test(b);
              const isHigh     = !isCritical && /urgent|escalat|risk|delay/i.test(b);
              const borderColor = isCritical ? C.ragRed : isHigh ? C.ragAmber : C.navyAccent;
              const bg = isCritical ? "#FFF5F5" : isHigh ? "#FFFBF0" : C.bgLight;

              // Split on " → " to extract resolution, or on " — " for context
              const arrowIdx = b.indexOf(" → ");
              const dashIdx  = b.indexOf(" — ");
              let headline = b;
              let context  = "";
              let resolution = "";
              if (arrowIdx > -1) {
                headline   = b.slice(0, arrowIdx).trim();
                resolution = b.slice(arrowIdx + 3).trim();
              } else if (dashIdx > -1) {
                headline = b.slice(0, dashIdx).trim();
                context  = b.slice(dashIdx + 3).trim();
              }

              return (
                <div
                  key={i}
                  style={{
                    background: bg,
                    border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${borderColor}`,
                    borderRadius: 5,
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: C.navyDark, lineHeight: 1.35, marginBottom: context || resolution ? 4 : 0 }}>
                    {headline}
                  </div>
                  {context && (
                    <div style={{ fontSize: 9.5, color: C.slateGray, lineHeight: 1.35, marginBottom: resolution ? 3 : 0 }}>
                      {context}
                    </div>
                  )}
                  {resolution && (
                    <div style={{ fontSize: 9.5, color: C.navyDark, lineHeight: 1.35 }}>
                      <span style={{ color: C.ragGreen, fontWeight: 700 }}>→ </span>{resolution}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No key issues narrative provided.</p>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Right — rich blocked item cards */}
        <div style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: 8, overflow: "hidden" }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.ragRed, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 4, borderBottom: `2px solid ${C.ragRed}`, paddingBottom: 3 }}>
            Blocked Items ({totalBlocked})
          </div>
          {richBlockedItems.length > 0 ? (
            richBlockedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#FFF5F5",
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.ragRed}`,
                  borderRadius: 5,
                  padding: "8px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  <span style={{ fontSize: 7.5, color: C.ragRed, fontWeight: 700, background: "#FECACA", borderRadius: 3, padding: "1px 5px" }}>
                    {item.itemId}
                  </span>
                  <span style={{ fontSize: 7.5, color: C.slateGray }}>{item.workstream}</span>
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: C.navyDark, lineHeight: 1.35, marginBottom: 4 }}>
                  {item.description}
                </div>
                {item.blockedReason && (
                  <div style={{ fontSize: 9.5, color: C.ragRed, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 700 }}>→ </span>{item.blockedReason}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No detailed blocked items to display.</p>
          )}
          {totalBlocked > 4 && (
            <div style={{ fontSize: 9, color: C.slateGray, fontStyle: "italic", marginTop: 2 }}>
              +{totalBlocked - 4} additional blocked items — see appendix.
            </div>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — KEY RISKS (with severity legend)
// ══════════════════════════════════════════════════════════════════════════════

function Slide6KeyRisks({ deal }: { deal: GeneratedDeal }) {
  const openRisks = deal.riskAlerts
    .filter((r) => r.status === "open")
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.severity] ?? 9) - (order[b.severity] ?? 9);
    })
    .slice(0, 6);

  const totalOpen = deal.riskAlerts.filter((r) => r.status === "open").length;
  const criticalCount = deal.riskAlerts.filter((r) => r.status === "open" && r.severity === "critical").length;

  const actionTitle = `${totalOpen} open risk${totalOpen !== 1 ? "s" : ""}; ${criticalCount} critical severity requiring immediate attention`;

  const categoryLabel: Record<string, string> = {
    regulatory_delay: "Regulatory",
    tax_structure_leakage: "Tax",
    tsa_dependency: "TSA",
    data_privacy_breach: "Data Privacy",
    cultural_integration: "Cultural",
    financial_reporting_gap: "Financial Reporting",
    stranded_costs: "Stranded Costs",
    it_integration_risk: "IT Integration",
  };

  return (
    <SlideShell slideNum={6} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Main risk table */}
        <div style={{ flex: 1 }}>
          {openRisks.length > 0 ? (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                <thead>
                  <tr style={{ background: C.bgMid }}>
                    {["RISK DESCRIPTION", "SEVERITY", "CATEGORY", "IMPACT & MITIGATION"].map((h, idx) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "5px 8px",
                          borderBottom: `2px solid ${C.navyAccent}`,
                          color: C.navyAccent,
                          fontWeight: 700,
                          textTransform: "uppercase" as const,
                          letterSpacing: 0.5,
                          fontSize: 9,
                          width: idx === 0 ? "34%" : idx === 3 ? "36%" : undefined,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openRisks.map((risk) => (
                    <tr key={risk.id} style={{ borderBottom: `1px solid ${C.bgMid}` }}>
                      <td style={{ padding: "6px 8px", color: C.navyDark, fontSize: 10, lineHeight: 1.4 }}>
                        {risk.description}
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <SeverityBadge severity={risk.severity} />
                      </td>
                      <td style={{ padding: "6px 8px", color: C.slateGray, fontSize: 9 }}>
                        {categoryLabel[risk.category] ?? risk.category}
                      </td>
                      <td style={{ padding: "6px 8px", color: C.slateGray, fontSize: 9, lineHeight: 1.35 }}>
                        {risk.mitigation ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalOpen > 6 && (
                <div style={{ fontSize: 9, color: C.slateGray, fontStyle: "italic", marginTop: 8 }}>
                  See appendix for full risk register ({totalOpen - 6} additional risks).
                </div>
              )}
            </>
          ) : (
            <p style={{ fontSize: 12, color: C.slateGray, fontStyle: "italic" }}>No open risks on record.</p>
          )}
        </div>

        {/* Severity legend box — top right */}
        <div
          style={{
            flex: "0 0 190px",
            background: C.bgLight,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: "10px 12px",
          }}
        >
          <div style={{ fontSize: 8, fontWeight: 800, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8 }}>
            Severity Legend
          </div>
          {[
            { dot: "🔴", label: "Critical", desc: "Immediate SteerCo action required" },
            { dot: "🟡", label: "High",     desc: "Workstream lead action within 2 weeks" },
            { dot: "🔵", label: "Medium",   desc: "Monitor and report" },
            { dot: "⚪", label: "Low",      desc: "Track only" },
          ].map((row) => (
            <div key={row.label} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 11 }}>{row.dot}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: C.navyDark }}>{row.label}</span>
              </div>
              <div style={{ fontSize: 8.5, color: C.slateGray, lineHeight: 1.35, paddingLeft: 18 }}>
                {row.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — KEY DELAYS (separate card-format slide)
// ══════════════════════════════════════════════════════════════════════════════

function Slide7KeyDelays({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const delays = splitLines(scNarrative.keyDelays ?? "", 6);
  const delayCount = delays.length;
  const actionTitle = `${delayCount > 0 ? delayCount : "No"} material delay${delayCount !== 1 ? "s" : ""} identified this period`;

  return (
    <SlideShell slideNum={7} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      {delays.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {delays.map((d, i) => {
            // Parse structured fields: look for ROOT CAUSE / SCHEDULE IMPACT / RECOVERY PLAN prefixes
            // Or infer from " — " / " | " delimiters
            const parts = d.split(/\s+[|]\s+|\s+—\s+/);
            const headline = parts[0] ?? d;

            // Try to extract impact duration from headline (e.g. "+2 weeks", "3-week")
            const durationMatch = headline.match(/[+\-]?\d+[\s-]?(?:day|week|month)s?/i);
            const duration = durationMatch ? durationMatch[0] : "";

            // Remaining parts become structured fields
            const rootCause     = parts.find((p) => /root cause|cause/i.test(p))?.replace(/root cause\s*:\s*/i, "") ?? (parts[1] ?? "");
            const schedImpact   = parts.find((p) => /schedule|impact/i.test(p))?.replace(/schedule impact\s*:\s*/i, "") ?? "";
            const recoveryPlan  = parts.find((p) => /recovery|mitigation|plan/i.test(p))?.replace(/recovery plan\s*:\s*/i, "") ?? (parts[2] ?? "");

            return (
              <div
                key={i}
                style={{
                  background: "#FFFBF0",
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.ragAmber}`,
                  borderRadius: 5,
                  padding: "10px 14px",
                }}
              >
                {/* Headline + duration badge */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.navyDark, lineHeight: 1.35, flex: 1 }}>
                    {headline}
                  </div>
                  {duration && (
                    <span style={{ flexShrink: 0, background: C.ragAmber, color: C.white, fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3 }}>
                      {duration}
                    </span>
                  )}
                </div>

                {/* Structured fields */}
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const }}>
                  {rootCause && (
                    <div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: C.ragAmber, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Root Cause: </span>
                      <span style={{ fontSize: 9, color: C.slateGray }}>{rootCause}</span>
                    </div>
                  )}
                  {schedImpact && (
                    <div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: C.ragRed, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Schedule Impact: </span>
                      <span style={{ fontSize: 9, color: C.slateGray }}>{schedImpact}</span>
                    </div>
                  )}
                  {recoveryPlan && (
                    <div>
                      <span style={{ fontSize: 8, fontWeight: 700, color: C.ragGreen, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>Recovery Plan: </span>
                      <span style={{ fontSize: 9, color: C.slateGray }}>{recoveryPlan}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: C.slateGray, fontStyle: "italic" }}>No delays reported this period.</p>
      )}
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — KEY FINDINGS (split: positive vs concerns)
// ══════════════════════════════════════════════════════════════════════════════

function Slide8KeyFindings({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const findings = splitLines(scNarrative.keyFindings ?? "", 10);

  // Classify findings: positive vs concern
  const positives = findings.filter((f) =>
    /achiev|ahead|complet|success|ahead|strong|on.track|green|milestone|on time|delivered|positive|improv/i.test(f)
  );
  const concerns = findings.filter((f) => !positives.includes(f));

  const actionTitle = `${findings.length} key finding${findings.length !== 1 ? "s" : ""} this period: ${positives.length} positive, ${concerns.length} concern${concerns.length !== 1 ? "s" : ""}`;

  const FindingCard = ({ text, borderColor, bg }: { text: string; borderColor: string; bg: string }) => (
    <div
      style={{
        background: bg,
        border: `1px solid ${C.border}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 5,
        padding: "8px 12px",
        marginBottom: 8,
        fontSize: 10.5,
        color: C.navyDark,
        lineHeight: 1.45,
      }}
    >
      {text}
    </div>
  );

  return (
    <SlideShell slideNum={8} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 20, height: "100%", overflow: "hidden" }}>
        {/* Positive findings */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.ragGreen, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8, borderBottom: `2px solid ${C.ragGreen}`, paddingBottom: 3 }}>
            Positive Findings
          </div>
          {positives.length > 0 ? (
            positives.map((f, i) => (
              <FindingCard key={i} text={f} borderColor={C.ragGreen} bg="#F0FDF4" />
            ))
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No positive findings this period.</p>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Concerns & surprises */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.ragAmber, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8, borderBottom: `2px solid ${C.ragAmber}`, paddingBottom: 3 }}>
            Concerns &amp; Surprises
          </div>
          {concerns.length > 0 ? (
            concerns.map((f, i) => (
              <FindingCard key={i} text={f} borderColor={C.ragAmber} bg="#FFFBF0" />
            ))
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No concerns to report this period.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — FINANCIAL SUMMARY & BUDGET (donut chart + variance items)
// ══════════════════════════════════════════════════════════════════════════════

function Slide9FinancialBudget({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const raw = scNarrative.financialImpacts ?? "";
  const budgetRaw = scNarrative.overallBudget ?? "";
  const bullets = splitLines(raw + (budgetRaw ? "\n" + budgetRaw : ""), 8);

  const stats = computeStats(deal);
  const completionPct = stats.pct;

  // Detect total budget + spent amounts from narrative text
  const dollarMatches = (raw + " " + budgetRaw).match(/\$[\d,]+(?:\.\d+)?(?:\s?[MBKmkb](?:illion|n)?)?/g) ?? [];
  const uniqueDollars = Array.from(new Set(dollarMatches));

  // Estimate budget status: spent = completionPct of budget, overrun heuristic from narrative
  const hasOverrun = /overrun|over budget|exceed/i.test(raw + " " + budgetRaw);
  const spentPct   = completionPct;
  const remainPct  = hasOverrun ? Math.max(0, 100 - spentPct - 12) : Math.max(0, 100 - spentPct);
  const overrunPct = hasOverrun ? 12 : 0;

  // SVG donut parameters
  const CX = 90, CY = 90, R = 68, STROKE = 22;
  const circumference = 2 * Math.PI * R;

  // Build arc segments: spent (green), remaining (gray), overrun (red)
  function arcOffset(startPct: number) {
    return circumference * (1 - startPct / 100);
  }
  function arcDash(pct: number) {
    return `${(circumference * pct) / 100} ${circumference}`;
  }

  const totalBudgetLabel = uniqueDollars[0] ?? "N/A";

  const actionTitle = `Budget at ${spentPct}% spend; ${completionPct}% program complete${hasOverrun ? " — projected overrun detected" : ""}`;

  return (
    <SlideShell slideNum={9} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 24, height: "100%" }}>

        {/* LEFT — SVG donut chart (40%) */}
        <div style={{ flex: "0 0 220px", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.7, marginBottom: 10 }}>
            Budget Status
          </div>
          <div style={{ position: "relative", width: 180, height: 180 }}>
            <svg width={180} height={180} viewBox="0 0 180 180">
              {/* Background ring */}
              <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.bgMid} strokeWidth={STROKE} />

              {/* Remaining (gray) — drawn first as base */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={C.progressGray}
                strokeWidth={STROKE}
                strokeDasharray={`${circumference}`}
                strokeDashoffset={0}
                transform={`rotate(-90 ${CX} ${CY})`}
              />

              {/* Overrun (red) segment on top */}
              {overrunPct > 0 && (
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={C.ragRed}
                  strokeWidth={STROKE}
                  strokeDasharray={arcDash(overrunPct)}
                  strokeDashoffset={arcOffset(spentPct)}
                  transform={`rotate(-90 ${CX} ${CY})`}
                />
              )}

              {/* Spent (green) segment */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={C.ragGreen}
                strokeWidth={STROKE}
                strokeDasharray={arcDash(spentPct)}
                strokeDashoffset={0}
                transform={`rotate(-90 ${CX} ${CY})`}
              />

              {/* Center text */}
              <text x={CX} y={CY - 8} textAnchor="middle" fontSize={11} fontWeight="800" fill={C.navyDark} fontFamily={FONT}>
                {totalBudgetLabel}
              </text>
              <text x={CX} y={CY + 6} textAnchor="middle" fontSize={8} fill={C.slateGray} fontFamily={FONT}>
                Total Budget
              </text>
              <text x={CX} y={CY + 18} textAnchor="middle" fontSize={9} fontWeight="700" fill={C.navyAccent} fontFamily={FONT}>
                {spentPct}% spent
              </text>
            </svg>
          </div>

          {/* Burn rate callout */}
          <div
            style={{
              marginTop: 8,
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 5,
              padding: "8px 12px",
              textAlign: "center",
              width: "100%",
              boxSizing: "border-box" as const,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: C.navyAccent }}>
              Burn Rate: {spentPct}% spent at {completionPct}% complete
            </div>
            {hasOverrun && (
              <div style={{ fontSize: 9, color: C.ragRed, fontWeight: 700, marginTop: 3 }}>
                Projected overrun detected
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10, width: "100%" }}>
            {[
              { color: C.ragGreen,     label: `Spent to date (${spentPct}%)` },
              { color: C.progressGray, label: `Remaining (${remainPct}%)` },
              ...(overrunPct > 0 ? [{ color: C.ragRed, label: `Projected overrun (${overrunPct}%)` }] : []),
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 8.5, color: C.slateGray }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* RIGHT — variance decomposition narrative (60%) */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.7, marginBottom: 10, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 3 }}>
            Financial Impacts &amp; Variance Commentary
          </div>
          {bullets.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {bullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 9,
                    fontSize: 10.5,
                    color: C.navyDark,
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ flexShrink: 0, color: C.navyAccent, fontWeight: 700, fontSize: 13, marginTop: -1 }}>·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No financial impacts narrative provided.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — DEPENDENCIES & OPERATIONAL IMPACTS (gate/arrow format)
// ══════════════════════════════════════════════════════════════════════════════

function Slide10Dependencies({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const deps    = splitLines(scNarrative.materialDependencies ?? "", 7);
  const impacts = splitLines(scNarrative.materialOperationalImpacts ?? "", 7);
  const total   = deps.length + impacts.length;

  const actionTitle = `${total > 0 ? total : "No"} material dependencies and operational impacts identified across workstreams`;

  // Parse "[Source] → [Target]" or "[Source] depends on [Target]" from each dependency line
  function parseDep(line: string): { source: string; target: string; rest: string } {
    const arrowMatch = line.match(/^(.+?)\s*→\s*(.+?)(?:\s*[—:]\s*(.*))?$/);
    if (arrowMatch) return { source: arrowMatch[1].trim(), target: arrowMatch[2].trim(), rest: arrowMatch[3]?.trim() ?? "" };
    const dependsMatch = line.match(/^(.+?)\s+(?:depends on|requires|blocked by)\s+(.+?)(?:\s*[—:]\s*(.*))?$/i);
    if (dependsMatch) return { source: dependsMatch[1].trim(), target: dependsMatch[2].trim(), rest: dependsMatch[3]?.trim() ?? "" };
    return { source: "", target: "", rest: line };
  }

  return (
    <SlideShell slideNum={10} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 20, height: "100%", overflow: "hidden" }}>

        {/* Dependencies with arrow viz */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.7, marginBottom: 8, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 3 }}>
            Material Dependencies
          </div>
          {deps.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {deps.map((d, i) => {
                const { source, target, rest } = parseDep(d);
                const hasArrow = source && target;
                return (
                  <div
                    key={i}
                    style={{
                      background: C.bgLight,
                      border: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${C.navyAccent}`,
                      borderRadius: 4,
                      padding: "7px 10px",
                    }}
                  >
                    {hasArrow ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Source box */}
                        <span
                          style={{
                            background: C.navyAccent,
                            color: C.white,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 3,
                            flexShrink: 0,
                          }}
                        >
                          {source}
                        </span>
                        {/* Arrow */}
                        <svg width={32} height={14} style={{ flexShrink: 0 }}>
                          <line x1={2} y1={7} x2={26} y2={7} stroke={C.navyAccent} strokeWidth={1.5} />
                          <polygon points="26,3 32,7 26,11" fill={C.navyAccent} />
                        </svg>
                        {/* Target box */}
                        <span
                          style={{
                            background: C.bgMid,
                            color: C.navyDark,
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 3,
                            border: `1px solid ${C.border}`,
                            flexShrink: 0,
                          }}
                        >
                          {target}
                        </span>
                        {rest && (
                          <span style={{ fontSize: 9, color: C.slateGray, lineHeight: 1.35, flex: 1 }}>
                            — {rest}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: C.navyDark, lineHeight: 1.4 }}>
                        <span style={{ color: C.navyAccent, fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>
                        {d}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No material dependencies identified.</p>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Operational impacts */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: C.progressBlue, textTransform: "uppercase" as const, letterSpacing: 0.7, marginBottom: 8, borderBottom: `2px solid ${C.progressBlue}`, paddingBottom: 3 }}>
            Operational Impacts
          </div>
          {impacts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {impacts.map((d, i) => (
                <div
                  key={i}
                  style={{
                    background: C.bgLight,
                    border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${C.progressBlue}`,
                    borderRadius: 4,
                    padding: "7px 10px",
                    fontSize: 10,
                    color: C.navyDark,
                    lineHeight: 1.4,
                  }}
                >
                  <span style={{ color: C.progressBlue, fontWeight: 700, marginRight: 6 }}>{i + 1}.</span>
                  {d}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No operational impacts identified.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — KEY DECISIONS & ESCALATIONS (preferred + alternative)
// ══════════════════════════════════════════════════════════════════════════════

function Slide11Decisions({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const items = splitLines(scNarrative.keyDecisionsEscalations ?? "", 5);
  const count = items.length;

  const actionTitle = `${count > 0 ? count : "No"} decision${count !== 1 ? "s" : ""} required from Steering Committee this period`;

  return (
    <SlideShell slideNum={11} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
          {items.map((item, i) => {
            const isUrgent = /urgent|immediate|critical|block|escalat/i.test(item);

            // Parse structure:
            //   "Decision statement — context | PREFERRED: X | ALTERNATIVE: Y | Owner: Z | Deadline: D"
            // or split on common separators
            const preferredMatch = item.match(/PREFERRED:\s*([^|]+)/i);
            const altMatch       = item.match(/ALTERNATIVE:\s*([^|]+)/i);
            const ownerMatch     = item.match(/Owner:\s*([^|]+)/i);
            const deadlineMatch  = item.match(/Deadline:\s*([^|]+)/i);

            // Strip known field patterns to extract the core decision statement
            let statement = item
              .replace(/\s*\|?\s*PREFERRED:[^|]*/i, "")
              .replace(/\s*\|?\s*ALTERNATIVE:[^|]*/i, "")
              .replace(/\s*\|?\s*Owner:[^|]*/i, "")
              .replace(/\s*\|?\s*Deadline:[^|]*/i, "")
              .trim();

            // Fallback: split on " — " for statement vs context
            const dashIdx = statement.indexOf(" — ");
            let decisionTitle = statement;
            let context = "";
            if (dashIdx > -1) {
              decisionTitle = statement.slice(0, dashIdx).trim();
              context       = statement.slice(dashIdx + 3).trim();
            }

            const preferred  = preferredMatch?.[1]?.trim() ?? "";
            const alternative = altMatch?.[1]?.trim() ?? "";
            const owner      = ownerMatch?.[1]?.trim() ?? "";
            const deadline   = deadlineMatch?.[1]?.trim() ?? "";

            return (
              <div
                key={i}
                style={{
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${isUrgent ? C.ragRed : C.navyAccent}`,
                  borderRadius: 5,
                  padding: "10px 14px",
                  background: isUrgent ? "#FFF8F8" : C.bgLight,
                }}
              >
                {/* Decision statement */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.navyDark, lineHeight: 1.35, flex: 1 }}>
                    {decisionTitle}
                  </div>
                  {isUrgent && (
                    <span style={{ flexShrink: 0, background: C.ragRed, color: C.white, fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" as const, letterSpacing: 0.5, marginLeft: 8 }}>
                      URGENT
                    </span>
                  )}
                </div>

                {/* Context */}
                {context && (
                  <div style={{ fontSize: 10, color: C.slateGray, lineHeight: 1.35, marginBottom: 6 }}>
                    {context}
                  </div>
                )}

                {/* Preferred + Alternative options */}
                <div style={{ display: "flex", gap: 10, marginBottom: (owner || deadline) ? 6 : 0 }}>
                  {preferred ? (
                    <div
                      style={{
                        flex: 1,
                        background: "#F0FDF4",
                        border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${C.ragGreen}`,
                        borderRadius: 3,
                        padding: "5px 8px",
                      }}
                    >
                      <div style={{ fontSize: 7.5, fontWeight: 700, color: C.ragGreen, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 }}>
                        Preferred
                      </div>
                      <div style={{ fontSize: 9.5, color: C.navyDark, lineHeight: 1.35 }}>{preferred}</div>
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        background: "#F0FDF4",
                        border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${C.ragGreen}`,
                        borderRadius: 3,
                        padding: "5px 8px",
                      }}
                    >
                      <div style={{ fontSize: 7.5, fontWeight: 700, color: C.ragGreen, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 }}>
                        Preferred
                      </div>
                      <div style={{ fontSize: 9.5, color: C.slateGray, fontStyle: "italic" }}>To be determined by SteerCo</div>
                    </div>
                  )}
                  {alternative ? (
                    <div
                      style={{
                        flex: 1,
                        background: "#FFFBF0",
                        border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${C.ragAmber}`,
                        borderRadius: 3,
                        padding: "5px 8px",
                      }}
                    >
                      <div style={{ fontSize: 7.5, fontWeight: 700, color: C.ragAmber, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 }}>
                        Alternative
                      </div>
                      <div style={{ fontSize: 9.5, color: C.navyDark, lineHeight: 1.35 }}>{alternative}</div>
                    </div>
                  ) : (
                    <div
                      style={{
                        flex: 1,
                        background: "#FFFBF0",
                        border: `1px solid ${C.border}`,
                        borderLeft: `3px solid ${C.ragAmber}`,
                        borderRadius: 3,
                        padding: "5px 8px",
                      }}
                    >
                      <div style={{ fontSize: 7.5, fontWeight: 700, color: C.ragAmber, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 }}>
                        Alternative
                      </div>
                      <div style={{ fontSize: 9.5, color: C.slateGray, fontStyle: "italic" }}>Fallback path pending SteerCo input</div>
                    </div>
                  )}
                </div>

                {/* Owner + Deadline */}
                {(owner || deadline) && (
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    {owner && (
                      <div style={{ fontSize: 8.5, color: C.slateGray }}>
                        <span style={{ fontWeight: 700, color: C.navyDark }}>Owner: </span>{owner}
                      </div>
                    )}
                    {deadline && (
                      <div style={{ fontSize: 8.5, color: C.slateGray }}>
                        <span style={{ fontWeight: 700, color: C.navyDark }}>Deadline: </span>{deadline}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: C.slateGray, fontStyle: "italic" }}>No decisions or escalations pending this period.</p>
      )}
    </SlideShell>
  );
}

// Slide12NextSteps removed — content folded into slides 2 (Executive Overview) and 9 (Financial & Budget)

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function SlidePreview({ deal, scNarrative, onClose }: SlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    <Slide1Cover             key={0}  deal={deal} />,
    <Slide2ExecOverview      key={1}  deal={deal} scNarrative={scNarrative} />,
    <Slide3TableOfContents   key={2}  deal={deal} />,
    <Slide4WorkstreamProgress key={3} deal={deal} scNarrative={scNarrative} />,
    <Slide5KeyIssues         key={4}  deal={deal} scNarrative={scNarrative} />,
    <Slide6KeyRisks          key={5}  deal={deal} />,
    <Slide7KeyDelays         key={6}  deal={deal} scNarrative={scNarrative} />,
    <Slide8KeyFindings       key={7}  deal={deal} scNarrative={scNarrative} />,
    <Slide9FinancialBudget   key={8}  deal={deal} scNarrative={scNarrative} />,
    <Slide10Dependencies     key={9}  deal={deal} scNarrative={scNarrative} />,
    <Slide11Decisions        key={10} deal={deal} scNarrative={scNarrative} />,
  ];

  const handlePrev = useCallback(() => {
    setCurrentSlide((p) => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide((p) => Math.min(TOTAL_SLIDES - 1, p + 1));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft")  handlePrev();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "Escape")     onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlePrev, handleNext, onClose]);

  function handlePrint() {
    window.print();
  }

  async function handleCopySlide() {
    const el = document.getElementById(`slide-content-${currentSlide}`);
    if (!el) return;
    try {
      await navigator.clipboard.writeText(el.innerText ?? "");
    } catch {
      // Clipboard API may be blocked; fail silently
    }
  }

  return (
    <>
      {/* Print + animation CSS */}
      <style>{`
        @media print {
          .slide-controls, .slide-nav, #slide-preview-controls { display: none !important; }
          body * { visibility: hidden !important; }
          #slide-print-container,
          #slide-print-container * { visibility: visible !important; }
          #slide-print-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
          }
          .slide-print-item {
            page-break-after: always;
            width: 960px;
            height: 540px;
          }
          .slide-print-item:last-child { page-break-after: avoid; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @keyframes sp-fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .sp-slide-enter { animation: sp-fadeIn 0.18s ease; }
      `}</style>

      {/* Full-screen dark overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(5, 10, 20, 0.92)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Top bar: slide counter + close */}
        <div
          className="slide-controls"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: 960,
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600, letterSpacing: 0.4 }}>
            Slide {currentSlide + 1} of {TOTAL_SLIDES}
          </span>
          <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>
            {deal.intake.dealName} — Integration Program Status
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              fontSize: 18,
              cursor: "pointer",
              padding: "2px 6px",
              lineHeight: 1,
              borderRadius: 4,
            }}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>

        {/* Slide stage + side arrows */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }} className="slide-nav">
          {/* Left arrow */}
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            title="Previous (←)"
            style={{
              background: currentSlide === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)",
              color: currentSlide === 0 ? "#334155" : "#CBD5E1",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              fontSize: 18,
              cursor: currentSlide === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            ←
          </button>

          {/* Slide */}
          <div
            style={{
              boxShadow: "0 12px 48px rgba(0,0,0,0.7)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div id={`slide-content-${currentSlide}`} className="sp-slide-enter" key={currentSlide}>
              {slides[currentSlide]}
            </div>
          </div>

          {/* Right arrow */}
          <button
            onClick={handleNext}
            disabled={currentSlide === TOTAL_SLIDES - 1}
            title="Next (→)"
            style={{
              background: currentSlide === TOTAL_SLIDES - 1 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.10)",
              color: currentSlide === TOTAL_SLIDES - 1 ? "#334155" : "#CBD5E1",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              fontSize: 18,
              cursor: currentSlide === TOTAL_SLIDES - 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            →
          </button>
        </div>

        {/* Dot navigation */}
        <div
          className="slide-nav"
          style={{ display: "flex", gap: 5, marginTop: 10, alignItems: "center" }}
        >
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              title={`Slide ${i + 1}`}
              style={{
                width: i === currentSlide ? 22 : 7,
                height: 7,
                borderRadius: 4,
                background: i === currentSlide ? "#3B82F6" : "#334155",
                border: "none",
                cursor: "pointer",
                padding: 0,
                transition: "width 0.15s, background 0.15s",
              }}
            />
          ))}
        </div>

        {/* Control bar */}
        <div
          id="slide-preview-controls"
          className="slide-controls"
          style={{ display: "flex", gap: 8, marginTop: 10 }}
        >
          <CtrlBtn onClick={handlePrev} disabled={currentSlide === 0}>← Prev</CtrlBtn>
          <CtrlBtn onClick={handleNext} disabled={currentSlide === TOTAL_SLIDES - 1}>Next →</CtrlBtn>
          <CtrlBtn onClick={handlePrint} accent="#2563EB">Print All</CtrlBtn>
          <CtrlBtn onClick={handleCopySlide} accent="#059669">Copy Slide</CtrlBtn>
          <CtrlBtn onClick={onClose} accent="#DC2626">Close ×</CtrlBtn>
        </div>
      </div>

      {/* Hidden print container — all slides */}
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

// ── Control Button ─────────────────────────────────────────────────────────────

function CtrlBtn({
  onClick,
  disabled,
  accent,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled
          ? "rgba(255,255,255,0.04)"
          : accent ?? "rgba(255,255,255,0.10)",
        color: disabled ? "#334155" : "#F1F5F9",
        border: "none",
        borderRadius: 5,
        padding: "6px 14px",
        fontSize: 11,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
        fontFamily: FONT,
      }}
    >
      {children}
    </button>
  );
}
