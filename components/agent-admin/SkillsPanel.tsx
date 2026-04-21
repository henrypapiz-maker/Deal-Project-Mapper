"use client";

import { useState, useEffect } from "react";

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

interface Step {
  order: number;
  instruction: string;
}

interface Skill {
  id: string;
  name: string;
  description: string | null;
  steps: Step[];
  createdAt: string;
}

export default function SkillsPanel() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", steps: [{ order: 1, instruction: "" }] });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/skills");
      const d = await res.json();
      setSkills(
        (d.skills ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          steps: Array.isArray(s.steps) ? s.steps : [],
          createdAt: s.created_at,
        }))
      );
    } catch {
      setError("Failed to load skills.");
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setForm({ name: "", description: "", steps: [{ order: 1, instruction: "" }] });
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(s: Skill) {
    setForm({
      name: s.name,
      description: s.description ?? "",
      steps: s.steps.length > 0 ? [...s.steps].sort((a, b) => a.order - b.order) : [{ order: 1, instruction: "" }],
    });
    setEditingId(s.id);
    setShowForm(true);
  }

  function addStep() {
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { order: f.steps.length + 1, instruction: "" }],
    }));
  }

  function removeStep(idx: number) {
    setForm((f) => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  }

  function updateStep(idx: number, instruction: string) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, instruction } : s)),
    }));
  }

  async function save() {
    if (!form.name.trim()) return;
    const steps = form.steps.filter((s) => s.instruction.trim());
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch("/api/agent/skills", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: editingId, name: form.name, description: form.description || null, steps }),
        });
        if (!res.ok) throw new Error("update failed");
      } else {
        const res = await fetch("/api/agent/skills", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: form.name, description: form.description || null, steps }),
        });
        const d = await res.json();
        if (d.error === "name_exists") throw new Error("A skill with this name already exists.");
        if (!res.ok) throw new Error("save failed");
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSkill(id: string) {
    if (!confirm("Delete this skill?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/agent/skills?id=${id}`, { method: "DELETE" });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setError("Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Loading skills…</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>Skills</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Define named multi-step workflows. The agent executes them when asked to "run skill: [name]".
          </div>
        </div>
        <button
          onClick={openNew}
          style={{
            padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.accent}`,
            background: `${C.accent}22`, color: C.accent, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          + New Skill
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#3B0F0F", border: `1px solid ${C.danger}55`, borderRadius: 8, color: "#FCA5A5", fontSize: 12 }}>
          {error} <button onClick={() => setError(null)} style={{ background: "none", border: "none", color: "#FCA5A5", cursor: "pointer", marginLeft: 8 }}>×</button>
        </div>
      )}

      {showForm && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 10, background: C.cardBg, border: `1px solid ${C.accent}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
            {editingId ? "Edit Skill" : "New Skill"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Skill name (exact — used by agent to invoke)"
              style={inputStyle}
            />
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              style={inputStyle}
            />

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>Steps</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {form.steps.map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.textMuted, width: 20, textAlign: "right", flexShrink: 0 }}>{idx + 1}.</span>
                    <input
                      value={step.instruction}
                      onChange={(e) => updateStep(idx, e.target.value)}
                      placeholder={`Step ${idx + 1} instruction…`}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    {form.steps.length > 1 && (
                      <button
                        onClick={() => removeStep(idx)}
                        style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addStep}
                style={{ marginTop: 8, padding: "4px 12px", borderRadius: 6, border: `1px dashed ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer" }}
              >
                + Add step
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
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

      {skills.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
          No skills yet. Create your first one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {skills.map((skill) => (
            <div key={skill.id} style={{ borderRadius: 10, background: C.cardBg, border: `1px solid ${C.border}`, overflow: "hidden" }}>
              <div
                style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onClick={() => setExpandedId(expandedId === skill.id ? null : skill.id)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "monospace" }}>{skill.name}</span>
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: `${C.accent}22`, color: C.accent, fontWeight: 500 }}>
                      {skill.steps.length} step{skill.steps.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {skill.description && (
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{skill.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(skill); }}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSkill(skill.id); }}
                    disabled={deletingId === skill.id}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${C.danger}44`, background: "transparent", color: C.danger, fontSize: 11, cursor: "pointer", opacity: deletingId === skill.id ? 0.5 : 1 }}
                  >
                    ×
                  </button>
                  <span style={{ color: C.textMuted, fontSize: 12, display: "flex", alignItems: "center" }}>
                    {expandedId === skill.id ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {expandedId === skill.id && skill.steps.length > 0 && (
                <div style={{ padding: "0 14px 12px 14px", borderTop: `1px solid ${C.border}` }}>
                  <ol style={{ margin: "10px 0 0 0", padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 6 }}>
                    {skill.steps.sort((a, b) => a.order - b.order).map((step, i) => (
                      <li key={i} style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
                        {step.instruction}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
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
