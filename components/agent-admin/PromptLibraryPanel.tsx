"use client";

import { useState, useEffect } from "react";
import { useAgentContext } from "@/lib/agent-context";

const C = {
  cardBg: "#1E293B",
  border: "#334155",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  accent: "#3B82F6",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
};

interface Prompt {
  id: string;
  name: string;
  text: string;
  category: string | null;
  isGlobal: boolean;
  createdAt: string;
}

interface Props {
  dealId?: string;
}

export default function PromptLibraryPanel({ dealId }: Props) {
  const { setPendingPrompt, setPanelOpen } = useAgentContext();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", text: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [dealId]);

  async function load() {
    setLoading(true);
    try {
      const url = dealId ? `/api/agent/prompts?dealId=${dealId}` : "/api/agent/prompts";
      const res = await fetch(url);
      const d = await res.json();
      setPrompts(
        (d.prompts ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          text: p.text,
          category: p.category,
          isGlobal: p.is_global,
          createdAt: p.created_at,
        }))
      );
    } catch {
      setError("Failed to load prompts.");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ name: "", text: "", category: "" });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(p: Prompt) {
    setForm({ name: p.name, text: p.text, category: p.category ?? "" });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim() || !form.text.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/agent/prompts", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editingId, name: form.name, text: form.text, category: form.category || null }),
        });
      } else {
        await fetch("/api/agent/prompts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: form.name, text: form.text, category: form.category || null, isGlobal: !dealId, dealId: dealId ?? null }),
        });
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch {
      setError("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePrompt(id: string) {
    if (!confirm("Delete this prompt?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/agent/prompts?id=${id}`, { method: "DELETE" });
      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  function usePrompt(text: string) {
    setPendingPrompt(text);
    setPanelOpen(true);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading prompts…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>Prompt Library</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>Save reusable instructions. Click "Use" to inject into the agent chat.</div>
        </div>
        <button
          onClick={openNew}
          style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.accent}`,
            background: `${C.accent}22`, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          + New Prompt
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#3B0F0F", border: `1px solid ${C.danger}55`, borderRadius: 8, color: "#FCA5A5", fontSize: 12 }}>
          {error} <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", marginLeft: 8 }}>×</button>
        </div>
      )}

      {showForm && (
        <div style={{
          marginBottom: 16, padding: 16, borderRadius: 10,
          background: C.cardBg, border: `1px solid ${C.accent}44`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
            {editingId ? "Edit Prompt" : "New Prompt"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name (e.g. Weekly Status Check)"
              style={inputStyle}
            />
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Category (optional — e.g. status_check, report)"
              style={inputStyle}
            />
            <textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              placeholder="Prompt text…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={save}
                disabled={saving || !form.name.trim() || !form.text.trim()}
                style={{
                  padding: "7px 16px", borderRadius: 8, border: "none",
                  background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600,
                  cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {prompts.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
          No prompts yet. Create your first one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {prompts.map((p) => (
            <div key={p.id} style={{
              padding: "12px 14px", borderRadius: 10,
              background: C.cardBg, border: `1px solid ${C.border}`,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</span>
                    {p.category && (
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: "#334155", color: C.textMuted, fontWeight: 500 }}>
                        {p.category}
                      </span>
                    )}
                    {p.isGlobal && (
                      <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: `${C.accent}22`, color: C.accent, fontWeight: 500 }}>
                        global
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {p.text.length > 200 ? p.text.slice(0, 200) + "…" : p.text}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => usePrompt(p.text)}
                    style={{
                      padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.success}`,
                      background: `${C.success}22`, color: C.success, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Use
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePrompt(p.id)}
                    disabled={deletingId === p.id}
                    style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.danger}44`, background: "transparent", color: C.danger, fontSize: 11, cursor: "pointer", opacity: deletingId === p.id ? 0.5 : 1 }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0F1B2D",
  color: "#F1F5F9",
  fontSize: 12,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
