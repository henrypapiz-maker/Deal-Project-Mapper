import { NextRequest, NextResponse } from "next/server";

const STRUCTURE_LABELS: Record<string, string> = {
  stock_purchase: "Stock Purchase",
  asset_purchase: "Asset Purchase",
  merger_forward: "Forward Merger",
  merger_reverse: "Reverse Triangular Merger",
  carve_out: "Carve-Out",
  f_reorg: "F-Reorganization",
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "no_api_key", message: "API key not configured" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { itemId, description, workstream, status, blockedReason, dealContext, mode } = body;

  // Helper to call Claude API
  async function callClaude(system: string, userMsg: string, maxTokens: number, model?: string, messages?: Array<{role: string; content: string}>) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: model || "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system,
        messages: messages || [{ role: "user", content: userMsg }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Claude API error:", errText);
      return { error: true, errText };
    }
    const data = await res.json();
    return { error: false, text: data.content?.[0]?.text || "" };
  }

  // ── New Report Engine Modes ──────────────────────────────

  if (mode === "draft_section") {
    try {
      const result = await callClaude(
        body.systemPrompt || `You are an M&A integration reporting engine. Draft the "${body.section}" section of an executive SteerCo report. Be specific, data-driven, and reference item IDs and workstream names. 200-400 words.`,
        `Draft the ${body.section} section based on this deal context:\n\n${body.context}`,
        800, body.model
      );
      if (result.error) return NextResponse.json({ error: "api_error", message: "AI service error" }, { status: 502 });
      return NextResponse.json({ guidance: result.text });
    } catch (e) { return NextResponse.json({ error: "network_error", message: "Failed to reach AI" }, { status: 500 }); }
  }

  if (mode === "draft_all") {
    try {
      const system = `You are an M&A integration reporting engine compiling a Board-ready SteerCo report. Based on the deal context, generate all 10 sections. Return ONLY a JSON object with these exact keys: overallStatus, keyIssues, keyDelays, keyFindings, materialImpacts, materialDependencies, materialOperationalImpacts, keyDecisionsEscalations, financialImpacts, overallBudget. Each value should be 200-400 words of substantive, data-driven narrative. Reference specific item IDs (e.g., FIN-0003), workstream names, quantitative measures, and risk details from the context. Adapt tone based on deal complexity and materiality.`;
      const result = await callClaude(
        system,
        `Deal Context:\n\n${body.context}\n\nGenerate all 10 SteerCo narrative sections as a JSON object.`,
        4096, body.model || "claude-sonnet-4-20250514"
      );
      if (result.error) return NextResponse.json({ error: "api_error", message: "AI compilation failed" }, { status: 502 });
      // Try to parse as JSON
      try {
        const jsonMatch = result.text!.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const sections = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ sections });
        }
      } catch {}
      return NextResponse.json({ guidance: result.text, parseError: true });
    } catch (e) { return NextResponse.json({ error: "network_error", message: "Failed to reach AI" }, { status: 500 }); }
  }

  if (mode === "enhance") {
    try {
      const result = await callClaude(
        `You are an M&A integration reporting assistant. Enhance the user's existing narrative with specific data from the deal context. Add quantitative references, specific item IDs, workstream statistics, and risk details. Maintain the original tone and structure while enriching with data. Return only the enhanced text.`,
        `Section: ${body.section}\n\nExisting text:\n${body.existingText}\n\nDeal Context:\n${body.context}\n\nEnhance this section with data-driven specifics.`,
        800, body.model
      );
      if (result.error) return NextResponse.json({ error: "api_error", message: "AI service error" }, { status: 502 });
      return NextResponse.json({ guidance: result.text });
    } catch (e) { return NextResponse.json({ error: "network_error", message: "Failed to reach AI" }, { status: 500 }); }
  }

  if (mode === "pressure_test") {
    try {
      const system = `You are a senior M&A integration advisor and McKinsey/Bain-trained consultant pressure-testing a SteerCo report. Analyze the existing narratives against the deal data. Return a JSON object with: completenessScore (0-100), consistencyIssues (array of {section, issue}), coverageMap (array of {workstream, mentioned: boolean}), toneAssessment (string), recommendations (array of strings), missingCriticalItems (array of {itemId, description, reason}). Be rigorous — flag any vague statements, missing data references, inconsistencies between sections, and workstreams not covered. Reference McKinsey and Bain M&A integration frameworks where applicable.`;
      const result = await callClaude(
        system,
        `Pressure test this SteerCo report:\n\n${body.context}`,
        2000, body.model || "claude-sonnet-4-20250514"
      );
      if (result.error) return NextResponse.json({ error: "api_error", message: "AI service error" }, { status: 502 });
      try {
        const jsonMatch = result.text!.match(/\{[\s\S]*\}/);
        if (jsonMatch) return NextResponse.json({ pressureTest: JSON.parse(jsonMatch[0]) });
      } catch {}
      return NextResponse.json({ guidance: result.text });
    } catch (e) { return NextResponse.json({ error: "network_error", message: "Failed to reach AI" }, { status: 500 }); }
  }

  if (mode === "executive_summary") {
    try {
      const result = await callClaude(
        `You are an M&A integration executive writing a Board of Directors email update. Generate a single paragraph (3-5 sentences) executive summary. Include: overall program health (RAG color), key completion metric, most critical blocker or risk, and one forward-looking statement. Be specific with numbers and item references. Tone: ${body.tone || "executive-concise"}.`,
        `Deal Context:\n\n${body.context}\n\nGenerate a 1-paragraph executive summary.`,
        500, body.model || "claude-sonnet-4-20250514"
      );
      if (result.error) return NextResponse.json({ error: "api_error", message: "AI service error" }, { status: 502 });
      return NextResponse.json({ guidance: result.text });
    } catch (e) { return NextResponse.json({ error: "network_error", message: "Failed to reach AI" }, { status: 500 }); }
  }

  if (mode === "chat") {
    try {
      const history = body.history || [];
      const msgs = [...history.map((m: any) => ({ role: m.role, content: m.content })), { role: "user", content: body.message }];
      const result = await callClaude(
        `You are an AI assistant helping an M&A integration program leader draft SteerCo reports. You have full context of the deal data below. Answer questions, help refine narratives, provide recommendations, and suggest specific language. Be data-driven and reference item IDs and workstream names.\n\nDeal Context:\n${body.context}`,
        "", 800, body.model, msgs
      );
      if (result.error) return NextResponse.json({ error: "api_error", message: "AI service error" }, { status: 502 });
      return NextResponse.json({ guidance: result.text });
    } catch (e) { return NextResponse.json({ error: "network_error", message: "Failed to reach AI" }, { status: 500 }); }
  }

  // ── Existing Modes ───────────────────────────────────────

  if (mode === "report") {
    // Report drafting mode - different system prompt
    const reportSystem = `You are an M&A integration reporting assistant. Draft a concise weekly status report for the ${workstream} workstream. Structure: 1) Key Accomplishments (2-3 bullets), 2) Blockers & Risks (2-3 bullets), 3) Next Steps (2-3 bullets). Be specific and actionable. Keep total length under 200 words.`;
    // Use the report system prompt instead
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          system: reportSystem,
          messages: [{ role: "user", content: body.prompt || `Draft a status report for the ${workstream} workstream.` }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude API error:", errorText);
        return NextResponse.json(
          { error: "api_error", message: "AI service returned an error", detail: errorText },
          { status: 502 }
        );
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || "No report generated.";
      return NextResponse.json({ guidance: text });
    } catch (err) {
      console.error("Guidance fetch error:", err);
      return NextResponse.json(
        { error: "network_error", message: "Failed to reach AI service" },
        { status: 500 }
      );
    }
  }

  const structureLabel = STRUCTURE_LABELS[dealContext?.dealStructure] || dealContext?.dealStructure;
  const jurisdictions = dealContext?.jurisdictions?.join(", ") || "domestic";

  const systemPrompt = `You are an expert M&A integration advisor with deep expertise in post-close integration
for ${workstream}. Your role is to provide concise, practical guidance to a consultant or PMO lead
managing the integration checklist. You understand complex deal structures, regulatory requirements,
and common pitfalls in M&A integrations.

Deal context:
- Structure: ${structureLabel}
- Model: ${dealContext?.integrationModel}
- Cross-border: ${dealContext?.crossBorder ? `Yes — ${jurisdictions}` : "No — Domestic"}
- TSA required: ${dealContext?.tsaRequired}
- Sector: ${dealContext?.industrySector || "Not specified"}
- Target GAAP: ${dealContext?.targetGaap || "Not specified"}

Provide guidance that is:
1. Specific to this deal's profile (structure, cross-border status, TSA requirements)
2. Actionable — what should the consultant do RIGHT NOW or in the next 48 hours?
3. Concise — 3-5 sentences maximum
4. Expert-level — reference specific frameworks, regulations, or technical considerations where relevant`;

  const userPrompt = blockedReason
    ? `The checklist item "${itemId}: ${description}" (${workstream}) is currently BLOCKED. Reason: "${blockedReason}". What specific steps should the consultant take to unblock this item and move forward?`
    : `The checklist item "${itemId}: ${description}" (${workstream}) is currently ${status.replace("_", " ")}. What should the consultant focus on for this item given the deal context? Are there any deal-specific considerations or risks they should watch for?`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", errorText);
      return NextResponse.json(
        { error: "api_error", message: "AI service returned an error", detail: errorText },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "No guidance generated.";
    return NextResponse.json({ guidance: text });
  } catch (err) {
    console.error("Guidance fetch error:", err);
    return NextResponse.json(
      { error: "network_error", message: "Failed to reach AI service" },
      { status: 500 }
    );
  }
}
