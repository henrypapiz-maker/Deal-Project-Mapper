"use client";

import React, { useState } from "react";
import type { ChecklistItem, ItemStatus } from "@/lib/types";

interface MustHaveWarningModalProps {
  item: ChecklistItem;
  targetStatus: ItemStatus;
  dealId: string;
  onConfirm: (item: ChecklistItem, targetStatus: ItemStatus, reason: string) => void;
  onCancel: () => void;
}

/**
 * Non-blocking adversarial confirmation modal.
 * Fires when a PMO lead attempts to mark a must-have item as N/A.
 * The user always retains final authority — this is advisory, not blocking.
 */
export function MustHaveWarningModal({
  item,
  targetStatus,
  dealId,
  onConfirm,
  onCancel,
}: MustHaveWarningModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    // Log the override to the override ledger
    try {
      await fetch(`/api/deals/${dealId}/overrides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.itemId,
          itemDescription: item.description,
          overrideType: "na_must_have",
          previousValue: item.status,
          newValue: targetStatus,
          warningShown: true,
          overrideReason: reason || null,
        }),
      });
    } catch {
      // Non-critical — log failure doesn't block the action
      console.warn("Override log write failed (non-blocking)");
    } finally {
      setSubmitting(false);
      onConfirm(item, targetStatus, reason);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#1a1a2e",
          border: "1px solid #ef4444",
          borderRadius: 12,
          maxWidth: 520,
          width: "100%",
          padding: 28,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            ⚠
          </div>
          <div>
            <div style={{ color: "#ef4444", fontSize: 14, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
              Must-Have Item — Override Required
            </div>
            <div style={{ color: "#f1f5f9", fontSize: 15, fontWeight: 500, lineHeight: 1.4 }}>
              {item.itemId} · {item.description}
            </div>
          </div>
        </div>

        {/* Advisory message */}
        <div
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            borderRadius: 8,
            padding: "12px 14px",
            marginBottom: 16,
            color: "#fca5a5",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {/* mustHaveReason from catalogue-metadata or fallback */}
          {item.naJustification
            ? item.naJustification
            : `This item is flagged as a foundational must-have for this deal type. Programs that exclude it historically show elevated integration risk. You may still override — this is advisory only.`}
        </div>

        {/* Workstream + phase context */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {[
            { label: "Workstream", value: item.workstream },
            { label: "Phase", value: item.phase.replace("_", " ") },
            { label: "Priority", value: item.priority },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 6,
                padding: "3px 10px",
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              <span style={{ color: "#64748b" }}>{label}: </span>
              <span style={{ color: "#e2e8f0" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Override reason input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6, fontWeight: 500 }}>
            Override reason <span style={{ color: "#64748b" }}>(optional but recommended)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Confirmed with deal counsel — regulatory pathway not applicable for this structure"
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#f1f5f9",
              fontSize: 13,
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "9px 20px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 8,
              color: "#94a3b8",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Keep Active
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              padding: "9px 20px",
              background: submitting ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.8)",
              border: "1px solid #ef4444",
              borderRadius: 8,
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Logging override…" : "Accept Risk & Mark N/A"}
          </button>
        </div>
      </div>
    </div>
  );
}
