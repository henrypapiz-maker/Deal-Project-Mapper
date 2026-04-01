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
const TOTAL_SLIDES = 12;

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
          padding: "40px 32px",
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
          padding: "40px 48px",
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
// SLIDE 2 — EXECUTIVE SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

function Slide2ExecSummary({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
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

  return (
    <SlideShell slideNum={2} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 32, height: "100%" }}>
        {/* Left — RAG + narrative */}
        <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Big RAG circle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 8px" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: ragColor(programRag),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                boxShadow: `0 0 0 8px ${ragColor(programRag)}22`,
              }}
            >
              <span style={{ fontSize: 9, color: C.white, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                {programRag}
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.navyDark }}>
              {ragLabel(programRag)}
            </div>
            <div style={{ fontSize: 10, color: C.slateGray, marginTop: 2 }}>Overall Program Status</div>
          </div>

          {/* Completion pct */}
          <div
            style={{
              background: C.bgLight,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "10px 16px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 800, color: C.navyAccent, lineHeight: 1 }}>{pct}%</div>
            <div style={{ fontSize: 9, color: C.slateGray, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.5, marginTop: 4 }}>
              Overall Completion
            </div>
            <div style={{ fontSize: 9, color: C.slateGray, marginTop: 2 }}>{fmt(completed)} of {fmt(total)} items</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Right — metrics + narrative */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 4 metric cards */}
          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            {metricCards.map((m) => (
              <div
                key={m.label}
                style={{
                  flex: 1,
                  border: `1px solid ${C.border}`,
                  borderTop: `3px solid ${m.color}`,
                  borderRadius: 5,
                  padding: "10px 8px",
                  textAlign: "center",
                  background: C.white,
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 9, color: C.slateGray, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.4, marginTop: 4 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>

          {/* Executive narrative */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
              Executive Narrative
            </div>
            {bullets.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 16, listStyle: "none" }}>
                {bullets.map((b, i) => (
                  <li
                    key={i}
                    style={{
                      fontSize: 12,
                      color: C.navyDark,
                      lineHeight: 1.55,
                      marginBottom: 7,
                      paddingLeft: 12,
                      borderLeft: `2px solid ${C.navyAccent}`,
                    }}
                  >
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>
                No overall status narrative provided.
              </p>
            )}
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 3 — PROGRAM DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

function Slide3Dashboard({ deal }: { deal: GeneratedDeal }) {
  const stats = computeStats(deal);
  const { total, completed, inProgress, blocked, pastDue, notStarted, unassigned, pct, snapshot } = stats;

  const wsOnTrack = snapshot
    ? snapshot.workstreams.filter((w) => (w.ragOverride ?? w.ragStatus) === "green").length
    : 0;
  const wsTotal = snapshot?.workstreams.length ?? 0;

  const actionTitle = `${fmt(completed)} of ${fmt(total)} integration items complete; ${wsOnTrack} of ${wsTotal} workstreams on track`;

  const metricCards = [
    { label: "Total Active",  value: fmt(total),      color: C.navyAccent },
    { label: "Complete",      value: fmt(completed),  color: C.ragGreen },
    { label: "In Progress",   value: fmt(inProgress), color: C.progressBlue },
    { label: "Blocked",       value: fmt(blocked),    color: blocked > 0 ? C.ragRed : C.slateGray },
    { label: "Past Due",      value: fmt(pastDue),    color: pastDue > 0 ? C.ragAmber : C.slateGray },
    { label: "Unassigned",    value: fmt(unassigned), color: unassigned > 0 ? C.ragAmber : C.slateGray },
  ];

  // Stacked bar values (proportional widths, guard for total=0)
  const safeTotal = total || 1;
  const completedW  = Math.round((completed  / safeTotal) * 100);
  const inProgressW = Math.round((inProgress / safeTotal) * 100);
  const blockedW    = Math.round((blocked    / safeTotal) * 100);
  const notStartedW = Math.max(0, 100 - completedW - inProgressW - blockedW);

  return (
    <SlideShell slideNum={3} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      {/* 6 metric cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        {metricCards.map((m) => (
          <div
            key={m.label}
            style={{
              flex: 1,
              border: `1px solid ${C.border}`,
              borderTop: `3px solid ${m.color}`,
              borderRadius: 5,
              padding: "10px 6px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
            <div style={{ fontSize: 8, color: C.slateGray, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 0.4, marginTop: 4 }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 6 }}>
          Overall Completion Breakdown
        </div>
        <div style={{ display: "flex", height: 32, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.border}` }}>
          {completedW > 0 && (
            <div style={{ width: `${completedW}%`, background: C.ragGreen, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: C.white, fontWeight: 700 }}>{completedW > 5 ? `${completedW}%` : ""}</span>
            </div>
          )}
          {inProgressW > 0 && (
            <div style={{ width: `${inProgressW}%`, background: C.progressBlue, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: C.white, fontWeight: 700 }}>{inProgressW > 5 ? `${inProgressW}%` : ""}</span>
            </div>
          )}
          {blockedW > 0 && (
            <div style={{ width: `${blockedW}%`, background: C.ragRed, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: C.white, fontWeight: 700 }}>{blockedW > 5 ? `${blockedW}%` : ""}</span>
            </div>
          )}
          {notStartedW > 0 && (
            <div style={{ width: `${notStartedW}%`, background: C.progressGray, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 9, color: "#475569", fontWeight: 700 }}>{notStartedW > 5 ? `${notStartedW}%` : ""}</span>
            </div>
          )}
        </div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
          {[
            { label: "Complete",    color: C.ragGreen },
            { label: "In Progress", color: C.progressBlue },
            { label: "Blocked",     color: C.ragRed },
            { label: "Not Started", color: C.progressGray },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: "inline-block" }} />
              <span style={{ fontSize: 8, color: C.slateGray }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Big pct callout */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 44, fontWeight: 800, color: C.navyAccent, lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 12, color: C.slateGray, fontWeight: 600 }}>COMPLETE</span>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 4 — WORKSTREAM STATUS RAG SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

function Slide4WorkstreamRAG({ deal }: { deal: GeneratedDeal }) {
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];

  const wsByTrack: Record<string, WorkstreamSnapshot[]> = {};
  TRACK_ORDER.forEach((t) => { wsByTrack[t] = []; });

  if (snapshot) {
    snapshot.workstreams.forEach((ws) => {
      const track = WORKSTREAM_TRACK_MAP[ws.workstream] ?? "Other";
      if (!wsByTrack[track]) wsByTrack[track] = [];
      wsByTrack[track].push(ws);
    });
  }

  const greenCount = snapshot?.workstreams.filter((w) => (deal.ragOverrides?.[w.workstream] ?? w.ragOverride ?? w.ragStatus) === "green").length ?? 0;
  const amberCount = snapshot?.workstreams.filter((w) => (deal.ragOverrides?.[w.workstream] ?? w.ragOverride ?? w.ragStatus) === "amber").length ?? 0;
  const redCount   = snapshot?.workstreams.filter((w) => (deal.ragOverrides?.[w.workstream] ?? w.ragOverride ?? w.ragStatus) === "red").length ?? 0;

  const worstWs = snapshot?.workstreams
    .filter((w) => (deal.ragOverrides?.[w.workstream] ?? w.ragOverride ?? w.ragStatus) === "red")
    .map((w) => w.workstream)[0] ?? "";

  const actionTitle = `${greenCount} workstreams green, ${amberCount} amber, ${redCount} red${worstWs ? ` — ${worstWs} requires immediate attention` : ""}`;

  return (
    <SlideShell slideNum={4} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      {snapshot ? (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: C.bgMid }}>
              {["WORKSTREAM", "RAG", "% DONE", "ITEMS", "BLOCKED", "LEAD"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: h === "WORKSTREAM" || h === "LEAD" ? "left" : "center",
                    padding: "5px 8px",
                    borderBottom: `2px solid ${C.navyAccent}`,
                    color: C.navyAccent,
                    fontWeight: 700,
                    textTransform: "uppercase" as const,
                    letterSpacing: 0.5,
                    fontSize: 9,
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
                    colSpan={6}
                    style={{
                      padding: "4px 8px",
                      fontSize: 8,
                      fontWeight: 800,
                      textTransform: "uppercase" as const,
                      letterSpacing: 1,
                      color: C.navyAccent,
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    {track}
                  </td>
                </tr>,
                ...rows.map((ws) => {
                  const effectiveRagVal = deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride ?? ws.ragStatus;
                  const ownerItem = deal.checklistItems.find(
                    (ci) => ci.workstream === ws.workstream && ci.ownerId
                  );
                  const ownerName = ownerItem?.ownerId
                    ? deal.people.find((p) => p.id === ownerItem.ownerId)?.name ?? "—"
                    : "—";
                  return (
                    <tr key={ws.workstream} style={{ borderBottom: `1px solid ${C.bgMid}` }}>
                      <td style={{ padding: "4px 8px 4px 16px", color: C.navyDark, fontWeight: 500 }}>
                        {ws.workstream}
                      </td>
                      <td style={{ textAlign: "center", padding: "4px 8px" }}>
                        <RagCircle rag={effectiveRagVal} size={10} />
                      </td>
                      <td style={{ textAlign: "center", padding: "4px 8px", color: C.navyDark, fontWeight: 600 }}>
                        {ws.pctComplete}%
                      </td>
                      <td style={{ textAlign: "center", padding: "4px 8px", color: C.slateGray }}>
                        {ws.total}
                      </td>
                      <td style={{ textAlign: "center", padding: "4px 8px", color: ws.blocked > 0 ? C.ragRed : C.slateGray, fontWeight: ws.blocked > 0 ? 700 : 400 }}>
                        {ws.blocked}
                      </td>
                      <td style={{ padding: "4px 8px", color: C.slateGray, fontSize: 9 }}>
                        {ownerName}
                      </td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      ) : (
        <p style={{ fontSize: 12, color: C.slateGray, fontStyle: "italic" }}>No snapshot data available.</p>
      )}
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 5 — WORKSTREAM DETAIL — PROGRESS BARS (SVG)
// ══════════════════════════════════════════════════════════════════════════════

function Slide5ProgressBars({ deal }: { deal: GeneratedDeal }) {
  const snapshot = deal.progressSnapshots[deal.progressSnapshots.length - 1];

  const actionTitle = "Finance and IT tracks require acceleration to meet Day 90 milestones";

  if (!snapshot || snapshot.workstreams.length === 0) {
    return (
      <SlideShell slideNum={5} dealName={deal.intake.dealName} actionTitle={actionTitle}>
        <p style={{ fontSize: 12, color: C.slateGray, fontStyle: "italic" }}>No workstream data available.</p>
      </SlideShell>
    );
  }

  // Sort ascending by pctComplete (worst at top)
  const sorted = [...snapshot.workstreams].sort((a, b) => a.pctComplete - b.pctComplete);
  const displayed = sorted.slice(0, 14);

  const SVG_W = 840;
  const ROW_H = 22;
  const LABEL_W = 200;
  const BAR_AREA_W = 560;
  const PCT_W = 40;
  const MARGIN_TOP = 16;
  const svgHeight = MARGIN_TOP + displayed.length * ROW_H + 20;

  return (
    <SlideShell slideNum={5} dealName={deal.intake.dealName} actionTitle={actionTitle} noPadding>
      <div style={{ padding: "14px 40px 0 40px" }}>
        {/* Column headers */}
        <div style={{ display: "flex", marginBottom: 4, paddingLeft: LABEL_W + 8 }}>
          {[
            { label: "Complete",    color: C.ragGreen },
            { label: "In Progress", color: C.progressBlue },
            { label: "Blocked",     color: C.ragRed },
            { label: "Not Started", color: C.progressGray },
          ].map((l) => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 3, marginRight: 12 }}>
              <span style={{ width: 7, height: 7, background: l.color, display: "inline-block", borderRadius: 1 }} />
              <span style={{ fontSize: 8, color: C.slateGray }}>{l.label}</span>
            </div>
          ))}
        </div>

        <svg width={SVG_W} height={svgHeight} style={{ display: "block", overflow: "visible" }}>
          {displayed.map((ws, i) => {
            const y = MARGIN_TOP + i * ROW_H;
            const barY = y + 4;
            const BAR_H = 13;
            const safeTotal = ws.total || 1;
            const cW = Math.round((ws.completed  / safeTotal) * BAR_AREA_W);
            const iW = Math.round((ws.inProgress / safeTotal) * BAR_AREA_W);
            const bW = Math.round((ws.blocked    / safeTotal) * BAR_AREA_W);
            const nW = Math.max(0, BAR_AREA_W - cW - iW - bW);
            const barX = LABEL_W + 8;

            // Truncate name
            const name = ws.workstream.length > 28 ? ws.workstream.slice(0, 26) + "…" : ws.workstream;
            const effectiveRagVal = deal.ragOverrides?.[ws.workstream] ?? ws.ragOverride ?? ws.ragStatus;

            return (
              <g key={ws.workstream}>
                {/* Workstream label */}
                <text x={0} y={y + BAR_H - 1} fontSize={9} fill={C.navyDark} fontFamily={FONT} fontWeight="500">
                  {name}
                </text>

                {/* RAG dot */}
                <circle cx={LABEL_W + 2} cy={y + BAR_H / 2 + 4} r={4} fill={ragColor(effectiveRagVal)} />

                {/* Stacked bar */}
                {cW > 0 && <rect x={barX} y={barY} width={cW} height={BAR_H} fill={C.ragGreen} rx={i === 0 ? 2 : 0} />}
                {iW > 0 && <rect x={barX + cW} y={barY} width={iW} height={BAR_H} fill={C.progressBlue} />}
                {bW > 0 && <rect x={barX + cW + iW} y={barY} width={bW} height={BAR_H} fill={C.ragRed} />}
                {nW > 0 && <rect x={barX + cW + iW + bW} y={barY} width={nW} height={BAR_H} fill={C.progressGray} rx={i === 0 ? 0 : 0} />}

                {/* Bar border */}
                <rect x={barX} y={barY} width={BAR_AREA_W} height={BAR_H} fill="none" stroke={C.border} strokeWidth={0.5} rx={2} />

                {/* Percentage label */}
                <text
                  x={barX + BAR_AREA_W + 6}
                  y={y + BAR_H - 1}
                  fontSize={9}
                  fill={C.navyAccent}
                  fontFamily={FONT}
                  fontWeight="700"
                >
                  {ws.pctComplete}%
                </text>
              </g>
            );
          })}
        </svg>

        {sorted.length > 14 && (
          <div style={{ fontSize: 9, color: C.slateGray, fontStyle: "italic", marginTop: 4 }}>
            Showing 14 of {sorted.length} workstreams. See appendix for full detail.
          </div>
        )}
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 6 — KEY ISSUES & BLOCKERS
// ══════════════════════════════════════════════════════════════════════════════

function Slide6KeyIssues({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const bullets = splitLines(scNarrative.keyIssues ?? "", 6);
  const blockedItems = deal.checklistItems.filter((i) => i.status === "blocked").slice(0, 6);
  const totalBlocked = deal.checklistItems.filter((i) => i.status === "blocked").length;

  const wsWithBlocked = new Set(
    deal.checklistItems.filter((i) => i.status === "blocked").map((i) => i.workstream)
  ).size;

  const actionTitle = `${totalBlocked} item${totalBlocked !== 1 ? "s" : ""} blocked across ${wsWithBlocked} workstream${wsWithBlocked !== 1 ? "s" : ""}; critical path items identified`;

  return (
    <SlideShell slideNum={6} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 24, height: "100%" }}>
        {/* Left 60% — key issues */}
        <div style={{ flex: "0 0 360px" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 4 }}>
            Key Issues
          </div>
          {bullets.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {bullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 9,
                    fontSize: 11,
                    color: C.navyDark,
                    lineHeight: 1.45,
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: C.navyAccent,
                      color: C.white,
                      fontSize: 9,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>
              No key issues narrative provided.
            </p>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Right 40% — blocked items */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.ragRed, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10, borderBottom: `2px solid ${C.ragRed}`, paddingBottom: 4 }}>
            Blocked Items ({totalBlocked})
          </div>
          {blockedItems.length > 0 ? (
            blockedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  marginBottom: 8,
                  paddingLeft: 8,
                  borderLeft: `3px solid ${C.ragRed}`,
                  paddingTop: 2,
                  paddingBottom: 2,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 8, color: C.ragRed, fontWeight: 700 }}>{item.itemId}</span>
                  <span style={{ fontSize: 8, color: C.slateGray }}>{item.workstream}</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: C.navyDark, lineHeight: 1.35 }}>
                  {item.description.slice(0, 72)}{item.description.length > 72 ? "…" : ""}
                </div>
                {item.blockedReason && (
                  <div style={{ fontSize: 9, color: C.ragRed, marginTop: 2, lineHeight: 1.3 }}>
                    {item.blockedReason.slice(0, 90)}{item.blockedReason.length > 90 ? "…" : ""}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No blocked items.</p>
          )}
          {totalBlocked > 6 && (
            <div style={{ fontSize: 9, color: C.slateGray, fontStyle: "italic", marginTop: 4 }}>
              +{totalBlocked - 6} additional blocked items — see appendix.
            </div>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 7 — KEY RISKS
// ══════════════════════════════════════════════════════════════════════════════

function Slide7KeyRisks({ deal }: { deal: GeneratedDeal }) {
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
    <SlideShell slideNum={7} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      {openRisks.length > 0 ? (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ background: C.bgMid }}>
                {["RISK DESCRIPTION", "SEVERITY", "CATEGORY", "IMPACT / MITIGATION"].map((h, idx) => (
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
                      width: idx === 0 ? "40%" : idx === 3 ? "30%" : undefined,
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
                    {risk.description.slice(0, 90)}{risk.description.length > 90 ? "…" : ""}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <SeverityBadge severity={risk.severity} />
                  </td>
                  <td style={{ padding: "6px 8px", color: C.slateGray, fontSize: 9 }}>
                    {categoryLabel[risk.category] ?? risk.category}
                  </td>
                  <td style={{ padding: "6px 8px", color: C.slateGray, fontSize: 9, lineHeight: 1.35 }}>
                    {risk.mitigation ? risk.mitigation.slice(0, 80) + (risk.mitigation.length > 80 ? "…" : "") : "—"}
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
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 8 — KEY DELAYS & FINDINGS
// ══════════════════════════════════════════════════════════════════════════════

function Slide8DelaysFindingsWrapper({
  deal,
  scNarrative,
}: {
  deal: GeneratedDeal;
  scNarrative: Record<string, string>;
}) {
  const delays   = splitLines(scNarrative.keyDelays ?? "", 5);
  const findings = splitLines(scNarrative.keyFindings ?? "", 5);
  const delayCount = delays.length;

  const actionTitle = `${delayCount > 0 ? delayCount : "No"} material delay${delayCount !== 1 ? "s" : ""} identified${delayCount > 0 && delays[0] ? `; ${delays[0].slice(0, 60)}${delays[0].length > 60 ? "…" : ""}` : ""}`;

  return (
    <SlideShell slideNum={8} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 24, height: "100%" }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderLeft: `4px solid ${C.ragAmber}`, paddingLeft: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.ragAmber, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>
              Key Delays
            </div>
          </div>
          {delays.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {delays.map((d, i) => (
                <li key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 11, color: C.navyDark, lineHeight: 1.45 }}>
                  <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: C.ragAmber, color: C.white, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No delays reported this period.</p>
          )}
        </div>
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ borderLeft: `4px solid ${C.navyAccent}`, paddingLeft: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8 }}>
              Key Findings
            </div>
          </div>
          {findings.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {findings.map((f, i) => (
                <li key={i} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 11, color: C.navyDark, lineHeight: 1.45 }}>
                  <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: C.navyAccent, color: C.white, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <span>{f}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No key findings this period.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 9 — FINANCIAL IMPACTS
// ══════════════════════════════════════════════════════════════════════════════

function Slide9FinancialImpacts({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const raw = scNarrative.financialImpacts ?? "";
  const bullets = splitLines(raw, 8);

  // Detect dollar amounts for callout
  const dollarMatches = raw.match(/\$[\d,]+(?:\.\d+)?(?:\s?[MBKmkb](?:illion|n)?)?/g) ?? [];
  const uniqueDollars = Array.from(new Set(dollarMatches)).slice(0, 3);

  const actionTitle = "Integration budget tracking in progress; synergy capture status per financial narrative below";

  return (
    <SlideShell slideNum={9} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 24, height: "100%" }}>
        {/* Main narrative */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 4 }}>
            Financial Impacts &amp; Budget Commentary
          </div>
          {bullets.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {bullets.map((b, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 8,
                    fontSize: 11,
                    color: C.navyDark,
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ flexShrink: 0, color: C.navyAccent, fontWeight: 700, fontSize: 12 }}>·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No financial impacts narrative provided.</p>
          )}
        </div>

        {/* Right callout — detected $ figures */}
        {uniqueDollars.length > 0 && (
          <div style={{ flex: "0 0 180px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10 }}>
              Key Figures
            </div>
            {uniqueDollars.map((d, i) => (
              <div
                key={i}
                style={{
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.navyAccent}`,
                  borderRadius: 5,
                  padding: "10px 12px",
                  marginBottom: 10,
                  background: C.bgLight,
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: C.navyAccent, lineHeight: 1 }}>{d}</div>
                <div style={{ fontSize: 8, color: C.slateGray, marginTop: 4 }}>Identified in narrative</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 10 — MATERIAL DEPENDENCIES & OPERATIONAL IMPACTS
// ══════════════════════════════════════════════════════════════════════════════

function Slide10Dependencies({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const deps    = splitLines(scNarrative.materialDependencies ?? "", 7);
  const impacts = splitLines(scNarrative.materialOperationalImpacts ?? "", 7);
  const total   = deps.length + impacts.length;

  const actionTitle = `${total > 0 ? total : "No"} material dependencies and operational impacts identified across workstreams`;

  return (
    <SlideShell slideNum={10} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 24, height: "100%" }}>
        {/* Dependencies */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 4 }}>
            Material Dependencies
          </div>
          {deps.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {deps.map((d, i) => (
                <li key={i} style={{ display: "flex", gap: 8, marginBottom: 9, fontSize: 11, color: C.navyDark, lineHeight: 1.45 }}>
                  <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: C.navyAccent, color: C.white, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No material dependencies identified.</p>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Operational impacts */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.progressBlue, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 10, borderBottom: `2px solid ${C.progressBlue}`, paddingBottom: 4 }}>
            Operational Impacts
          </div>
          {impacts.length > 0 ? (
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {impacts.map((d, i) => (
                <li key={i} style={{ display: "flex", gap: 8, marginBottom: 9, fontSize: 11, color: C.navyDark, lineHeight: 1.45 }}>
                  <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: C.progressBlue, color: C.white, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {i + 1}
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No operational impacts identified.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 11 — KEY DECISIONS & ESCALATIONS
// ══════════════════════════════════════════════════════════════════════════════

function Slide11Decisions({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const items = splitLines(scNarrative.keyDecisionsEscalations ?? "", 6);
  const count = items.length;

  const actionTitle = `${count > 0 ? count : "No"} decision${count !== 1 ? "s" : ""} required from Steering Committee this period`;

  return (
    <SlideShell slideNum={11} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
          {items.map((item, i) => {
            // Heuristic: items with "urgent", "immediate", "critical", "block" get red border
            const isUrgent = /urgent|immediate|critical|block|escalat/i.test(item);
            // Split on "—" or ": " to extract context if present
            const parts = item.split(/\s*[—:]\s+/);
            const title   = parts[0] ?? item;
            const context = parts.slice(1).join(" — ");

            return (
              <div
                key={i}
                style={{
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${isUrgent ? C.ragRed : C.navyAccent}`,
                  borderRadius: 5,
                  padding: "10px 14px",
                  background: isUrgent ? "#FEF9F9" : C.bgLight,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: isUrgent ? C.ragRed : C.navyAccent,
                    color: C.white,
                    fontSize: 10,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.navyDark, lineHeight: 1.4 }}>
                    {title}
                  </div>
                  {context && (
                    <div style={{ fontSize: 10, color: C.slateGray, marginTop: 3, lineHeight: 1.35 }}>
                      {context}
                    </div>
                  )}
                </div>
                {isUrgent && (
                  <span style={{ marginLeft: "auto", flexShrink: 0, background: C.ragRed, color: C.white, fontSize: 7, fontWeight: 700, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                    URGENT
                  </span>
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

// ══════════════════════════════════════════════════════════════════════════════
// SLIDE 12 — NEXT STEPS & TIMELINE
// ══════════════════════════════════════════════════════════════════════════════

function Slide12NextSteps({ deal, scNarrative }: { deal: GeneratedDeal; scNarrative: Record<string, string> }) {
  const budgetLines = splitLines(scNarrative.overallBudget ?? "", 4);
  const nextMilestones = deal.milestones.slice(0, 6);

  const nextSteerco = deal.milestones.find((m) =>
    /steer|steering|committee/i.test(m.label)
  );

  // Key milestone approaching — pick the soonest
  const soonest = nextMilestones[0];
  const actionTitle = `Focus areas for next reporting period${soonest ? `; ${soonest.label} milestone approaching` : ""}`;

  // Build simple horizontal timeline from milestones
  const timelineItems = nextMilestones.slice(0, 5);
  const TL_W = 860;
  const TL_Y = 40;
  const spacing = TL_W / Math.max(timelineItems.length + 1, 2);

  return (
    <SlideShell slideNum={12} dealName={deal.intake.dealName} actionTitle={actionTitle}>
      <div style={{ display: "flex", gap: 24, height: "100%" }}>
        {/* Left — budget overview + forward items */}
        <div style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", gap: 14 }}>
          {budgetLines.length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 8, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 4 }}>
                Budget &amp; Resources
              </div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                {budgetLines.map((b, i) => (
                  <li key={i} style={{ display: "flex", gap: 6, marginBottom: 7, fontSize: 10, color: C.navyDark, lineHeight: 1.4 }}>
                    <span style={{ color: C.navyAccent, fontWeight: 700, fontSize: 12, marginTop: -1 }}>·</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {nextSteerco && (
            <div
              style={{
                border: `1px solid ${C.navyAccent}`,
                borderRadius: 6,
                padding: "10px 14px",
                background: C.bgLight,
              }}
            >
              <div style={{ fontSize: 8, color: C.slateGray, textTransform: "uppercase" as const, letterSpacing: 0.8, fontWeight: 700, marginBottom: 4 }}>
                Next Steering Committee
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.navyAccent }}>{nextSteerco.date}</div>
              <div style={{ fontSize: 10, color: C.slateGray, marginTop: 2 }}>{nextSteerco.label}</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: C.border, flexShrink: 0 }} />

        {/* Right — milestone timeline */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: C.navyAccent, textTransform: "uppercase" as const, letterSpacing: 0.8, marginBottom: 12, borderBottom: `2px solid ${C.navyAccent}`, paddingBottom: 4 }}>
            Upcoming Milestones
          </div>
          {timelineItems.length > 0 ? (
            <div style={{ position: "relative", overflowX: "hidden" }}>
              <svg width="100%" height={120} viewBox={`0 0 ${TL_W} ${TL_Y + 80}`} style={{ display: "block" }}>
                {/* Timeline line */}
                <line x1={spacing / 2} y1={TL_Y} x2={TL_W - spacing / 2} y2={TL_Y} stroke={C.border} strokeWidth={2} />

                {timelineItems.map((m, i) => {
                  const x = spacing / 2 + i * spacing;
                  const isPast = new Date(m.date) < new Date();
                  return (
                    <g key={m.phase}>
                      {/* Dot */}
                      <circle
                        cx={x}
                        cy={TL_Y}
                        r={8}
                        fill={isPast ? C.ragGreen : C.navyAccent}
                        stroke={C.white}
                        strokeWidth={2}
                      />
                      {/* Check mark for past */}
                      {isPast && (
                        <text x={x} y={TL_Y + 4} textAnchor="middle" fontSize={9} fill={C.white} fontWeight="bold">✓</text>
                      )}
                      {/* Label */}
                      <text
                        x={x}
                        y={TL_Y + 22}
                        textAnchor="middle"
                        fontSize={9}
                        fill={C.navyDark}
                        fontFamily={FONT}
                        fontWeight="700"
                      >
                        {m.label.length > 14 ? m.label.slice(0, 12) + "…" : m.label}
                      </text>
                      <text x={x} y={TL_Y + 34} textAnchor="middle" fontSize={8} fill={C.slateGray} fontFamily={FONT}>
                        {m.date}
                      </text>
                      <text x={x} y={TL_Y + 46} textAnchor="middle" fontSize={8} fill={C.slateGray} fontFamily={FONT}>
                        {m.daysFromClose > 0 ? `Day ${m.daysFromClose}` : "Close"}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <p style={{ fontSize: 11, color: C.slateGray, fontStyle: "italic", margin: 0 }}>No milestones on record.</p>
          )}
        </div>
      </div>
    </SlideShell>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function SlidePreview({ deal, scNarrative, onClose }: SlidePreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    <Slide1Cover key={0} deal={deal} />,
    <Slide2ExecSummary key={1} deal={deal} scNarrative={scNarrative} />,
    <Slide3Dashboard key={2} deal={deal} />,
    <Slide4WorkstreamRAG key={3} deal={deal} />,
    <Slide5ProgressBars key={4} deal={deal} />,
    <Slide6KeyIssues key={5} deal={deal} scNarrative={scNarrative} />,
    <Slide7KeyRisks key={6} deal={deal} />,
    <Slide8DelaysFindingsWrapper key={7} deal={deal} scNarrative={scNarrative} />,
    <Slide9FinancialImpacts key={8} deal={deal} scNarrative={scNarrative} />,
    <Slide10Dependencies key={9} deal={deal} scNarrative={scNarrative} />,
    <Slide11Decisions key={10} deal={deal} scNarrative={scNarrative} />,
    <Slide12NextSteps key={11} deal={deal} scNarrative={scNarrative} />,
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
