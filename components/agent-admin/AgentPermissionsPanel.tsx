"use client";

import { useState, useEffect } from "react";

const C = {
  navy: "#0F1B2D",
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  accent: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
};

const ROLES = ["admin", "imo_lead", "workstream_lead", "viewer", "external"] as const;
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  imo_lead: "IMO Lead",
  workstream_lead: "WS Lead",
  viewer: "Viewer",
  external: "External",
};

interface PermRow {
  role: string;
  actionType: string;
  allowed: boolean;
}

export default function AgentPermissionsPanel() {
  const [matrix, setMatrix] = useState<PermRow[]>([]);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agent/permissions")
      .then((r) => r.json())
      .then((d) => {
        setMatrix(d.permissions ?? []);
        setActionTypes(d.actionTypes ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load permissions.");
        setLoading(false);
      });
  }, []);

  function isAllowed(role: string, actionType: string): boolean {
    return matrix.find((r) => r.role === role && r.actionType === actionType)?.allowed ?? false;
  }

  async function toggle(role: string, actionType: string) {
    const current = isAllowed(role, actionType);
    const key = `${role}:${actionType}`;
    setSaving(key);

    // Optimistic update
    setMatrix((prev) =>
      prev.map((r) =>
        r.role === role && r.actionType === actionType ? { ...r, allowed: !current } : r
      )
    );

    try {
      const res = await fetch("/api/agent/permissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, actionType, allowed: !current }),
      });
      if (!res.ok) throw new Error("save failed");
    } catch {
      // Revert on failure
      setMatrix((prev) =>
        prev.map((r) =>
          r.role === role && r.actionType === actionType ? { ...r, allowed: current } : r
        )
      );
      setError("Save failed. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
        Loading permissions…
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          Role Permissions Matrix
        </div>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Toggle which actions each role may request from the agent. Changes take effect within 5 minutes.
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 12, padding: "8px 12px", background: "#3B0F0F",
          border: `1px solid ${C.danger}55`, borderRadius: 8,
          color: "#FCA5A5", fontSize: 12, display: "flex", justifyContent: "space-between",
        }}>
          {error}
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer" }}>×</button>
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ padding: "10px 12px", textAlign: "left", color: C.textMuted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                Action
              </th>
              {ROLES.map((role) => (
                <th key={role} style={{
                  padding: "10px 12px", textAlign: "center", color: C.textMuted,
                  fontWeight: 600, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                }}>
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {actionTypes.map((actionType, idx) => (
              <tr key={actionType} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(30,41,59,0.4)" }}>
                <td style={{ padding: "9px 12px", color: C.text, fontFamily: "monospace", fontSize: 11 }}>
                  {actionType}
                </td>
                {ROLES.map((role) => {
                  const key = `${role}:${actionType}`;
                  const allowed = isAllowed(role, actionType);
                  const isSaving = saving === key;
                  return (
                    <td key={role} style={{ padding: "9px 12px", textAlign: "center" }}>
                      <button
                        onClick={() => toggle(role, actionType)}
                        disabled={isSaving}
                        title={allowed ? "Click to revoke" : "Click to allow"}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: `1.5px solid ${allowed ? C.success : C.border}`,
                          background: allowed ? `${C.success}22` : "transparent",
                          cursor: isSaving ? "wait" : "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.15s",
                          opacity: isSaving ? 0.5 : 1,
                        }}
                      >
                        {allowed && (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6l2.5 2.5 5-5" stroke={C.success} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
