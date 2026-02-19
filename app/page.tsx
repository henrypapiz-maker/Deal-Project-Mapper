"use client";

import { useState, useCallback } from "react";
import IntakeForm from "@/components/intake/IntakeForm";
import Dashboard from "@/components/dashboard/Dashboard";
import type { DealIntake, GeneratedDeal, ItemStatus } from "@/lib/types";
import { generateDeal } from "@/lib/decision-tree";

type AppState = "landing" | "intake" | "generating" | "dashboard";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("landing");
  const [deal, setDeal] = useState<GeneratedDeal | null>(null);

  function handleIntakeSubmit(intake: DealIntake) {
    setAppState("generating");
    // Small async delay for UX — then run the decision tree synchronously
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

  function handleReset() {
    setDeal(null);
    setAppState("landing");
  }

  if (appState === "generating") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #0F1B2D 0%, #0F172A 100%)",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 800, color: "#fff",
            animation: "pulse 1.5s ease-in-out infinite",
          }}>M</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>
            Generating Integration Plan…
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", maxWidth: 340 }}>
            Running decision tree · Scanning for risks · Configuring 443-item checklist
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
    return <Dashboard deal={deal} onUpdateStatus={handleUpdateStatus} onReset={handleReset} />;
  }

  if (appState === "intake") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0F1B2D 0%, #0F172A 100%)",
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
      background: "linear-gradient(135deg, #0F1B2D 0%, #0F172A 100%)",
      fontFamily: "'JetBrains Mono', monospace", padding: 24,
    }}>
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: "0 auto 24px",
          background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, color: "#fff",
          boxShadow: "0 0 40px #3B82F644",
        }}>M</div>

        <div style={{ fontSize: 11, color: "#3B82F6", textTransform: "uppercase", letterSpacing: 3, marginBottom: 12, fontWeight: 700 }}>
          Phase 1 MVP · Variant A: Reactive Monitor
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#F1F5F9", marginBottom: 16, lineHeight: 1.2 }}>
          M&A Integration Engine
        </h1>
        <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
          Enter 12 deal intake fields. Receive a fully configured integration program —
          risk assessment, dynamic checklist, and AI guidance — in seconds.
        </p>

        {/* Feature Pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 40 }}>
          {[
            "443-Item Checklist",
            "7-Category Risk Engine",
            "Claude AI Guidance",
            "12 Workstreams",
            "5-Phase Timeline",
            "Decision Tree",
          ].map((f) => (
            <span key={f} style={{
              padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: "#1E293B", color: "#60A5FA", border: "1px solid #334155",
            }}>{f}</span>
          ))}
        </div>

        <button
          onClick={() => setAppState("intake")}
          style={{
            padding: "14px 36px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #3B82F6, #60A5FA)",
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.5,
            boxShadow: "0 4px 24px #3B82F644",
          }}
        >
          Start New Deal →
        </button>

        <div style={{ marginTop: 48, padding: "16px 24px", borderRadius: 8, background: "#1E293B", border: "1px solid #334155", textAlign: "left" }}>
          <div style={{ fontSize: 9, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>What happens when you submit</div>
          {[
            ["1", "Decision tree maps your 12 intake fields to relevant checklist items"],
            ["2", "Risk scanner runs 7 detection rules and surfaces critical flags"],
            ["3", "Milestone dates calculated from your target close date"],
            ["4", "Claude API ready to generate contextual guidance per checklist item"],
          ].map(([num, text]) => (
            <div key={num} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", minWidth: 16 }}>{num}</span>
              <span style={{ fontSize: 10, color: "#64748B" }}>{text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, fontSize: 9, color: "#334155" }}>
          M&A Integration Engine v0.1.0 · Phase 1 MVP · February 2026
        </div>
      </div>
    </div>
  );
}
