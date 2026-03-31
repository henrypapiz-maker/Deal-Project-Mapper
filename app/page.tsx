"use client";

import { useState, useCallback } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import type { DealIntake, GeneratedDeal, ItemStatus, Priority } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";

type AppState = "landing" | "intake" | "generating" | "dashboard";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [deal, setDeal] = useState<GeneratedDeal | null>(null);

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    setTimeout(() => {
      const generated = generateDeal(intake);
      setDeal(generated);
      setAppState("dashboard");
    }, 1200);
  }

  const handleUpdateStatus = useCallback((itemId: string, status: ItemStatus) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId ? { ...item, status } : item
        ),
      };
    });
  }, []);

  const handleUpdatePriority = useCallback((itemId: string, priority: Priority) => {
    setDeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        checklistItems: prev.checklistItems.map((item) =>
          item.id === itemId
            ? { ...item, priority, priorityOverride: priority }
            : item
        ),
      };
    });
  }, []);

  function handleReset() {
    setDeal(null);
    setAppState("landing");
  }

  if (appState === "generating") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, margin: "0 auto 24px",
            background: "linear-gradient(135deg, #2563EB, #3B82F6, #60A5FA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: -1,
            animation: "pulse 1.5s ease-in-out infinite",
            boxShadow: "0 8px 32px rgba(37, 99, 235, 0.35)",
          }}>DM</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#F8FAFC", marginBottom: 8, letterSpacing: -0.3 }}>
            Generating Integration Plan…
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", maxWidth: 380, lineHeight: 1.6 }}>
            Running decision tree · Scanning for risks · Configuring 119-item checklist across 22 workstreams
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 6, justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: "#3B82F6",
                opacity: 0.4,
                animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.05)} }
          @keyframes bounce { 0%,100%{opacity:0.4;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)} }
        `}</style>
      </div>
    );
  }

  if (appState === "dashboard" && deal) {
    return <Dashboard deal={deal} onUpdateStatus={handleUpdateStatus} onUpdatePriority={handleUpdatePriority} onReset={handleReset} />;
  }

  if (appState === "intake") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)",
        color: "#F1F5F9",
      }}>
        <IntakeForm onSubmit={handleIntakeSubmit} />
      </div>
    );
  }

  // Landing page
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg, #0C1222 0%, #162036 40%, #0F1B2D 100%)",
      padding: 32,
    }}>
      <div style={{ maxWidth: 720, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: 18, margin: "0 auto 28px",
          background: "linear-gradient(135deg, #2563EB, #3B82F6, #60A5FA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: -1,
          boxShadow: "0 8px 32px rgba(37, 99, 235, 0.35), 0 0 0 1px rgba(59, 130, 246, 0.15)",
        }}>DM</div>

        <div style={{ fontSize: 11, color: "#60A5FA", textTransform: "uppercase", letterSpacing: 4, marginBottom: 16, fontWeight: 600 }}>
          DealMapper Intelligence
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 800, color: "#F8FAFC", marginBottom: 16, lineHeight: 1.15, letterSpacing: -0.5 }}>
          M&A Integration Engine
        </h1>
        <p style={{ fontSize: 15, color: "#94A3B8", lineHeight: 1.8, marginBottom: 40, maxWidth: 520, margin: "0 auto 40px", fontWeight: 400 }}>
          Configure your deal profile across 3 tiers. Receive a fully scoped integration program —
          risk assessment, 22-workstream checklist with priority override, and Claude AI guidance.
        </p>

        {/* Feature Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 44 }}>
          {[
            { label: "119-Item Checklist", icon: "\u2610" },
            { label: "8-Category Risk Engine", icon: "\u26A1" },
            { label: "Claude AI Guidance", icon: "\u2726" },
            { label: "22 Workstreams", icon: "\u25CE" },
            { label: "5-Phase Timeline", icon: "\u25B8" },
            { label: "10 IT Domains", icon: "\u2B21" },
          ].map((f) => (
            <span key={f.label} style={{
              padding: "6px 14px", borderRadius: 24, fontSize: 11, fontWeight: 500,
              background: "rgba(30, 41, 59, 0.7)", color: "#CBD5E1",
              border: "1px solid rgba(51, 65, 85, 0.6)",
              display: "flex", alignItems: "center", gap: 6,
            }}><span style={{ color: "#60A5FA", fontSize: 10 }}>{f.icon}</span> {f.label}</span>
          ))}
        </div>

        <button
          onClick={() => setAppState("intake")}
          style={{
            padding: "16px 44px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #2563EB, #3B82F6)",
            color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.3,
            boxShadow: "0 4px 20px rgba(37, 99, 235, 0.4), 0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          Start New Deal →
        </button>

        <div style={{
          marginTop: 56, padding: "20px 28px", borderRadius: 12,
          background: "rgba(30, 41, 59, 0.5)", border: "1px solid rgba(51, 65, 85, 0.5)",
          textAlign: "left",
        }}>
          <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontWeight: 600 }}>How it works</div>
          {[
            ["01", "Decision tree maps 13 intake fields across 3 tiers to 119 checklist items"],
            ["02", "Risk scanner runs 8 detection rules across 22 workstreams"],
            ["03", "Functional scope filters IT + Finance items; milestones auto-calculated"],
            ["04", "Claude AI generates contextual guidance per item with priority override"],
          ].map(([num, text]) => (
            <div key={num} style={{ display: "flex", gap: 14, marginBottom: 12, alignItems: "flex-start" }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#3B82F6", minWidth: 24,
                background: "rgba(59, 130, 246, 0.1)", borderRadius: 4, padding: "2px 6px", textAlign: "center",
              }}>{num}</span>
              <span style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, fontSize: 10, color: "#334155", letterSpacing: 0.5 }}>
          DealMapper v0.2.0 · M&A Integration Engine · March 2026
        </div>
      </div>
    </div>
  );
}
