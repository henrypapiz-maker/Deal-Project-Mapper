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
          model: "claude-haiku-4-20250414",
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
        model: "claude-haiku-4-20250414",
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
