import { NextRequest, NextResponse } from "next/server";

const STRUCTURE_LABELS: Record<string, string> = {
  stock_purchase: "Stock Purchase",
  asset_purchase: "Asset Purchase",
  merger_forward: "Forward Merger",
  merger_reverse: "Reverse Triangular Merger",
  carve_out: "Carve-Out",
  f_reorg: "F-Reorganization",
};

const VALID_WORKSTREAMS = [
  "TSA Assessment & Exit",
  "Consolidation & Reporting",
  "Operational Accounting",
  "Internal Controls & SOX",
  "Income Tax & Compliance",
  "Treasury & Banking",
  "FP&A & Baselining",
  "Cybersecurity & Data Privacy",
  "ESG & Sustainability",
  "Integration Budget & PMO",
  "Facilities & Real Estate",
  "HR & Workforce Integration",
];

const VALID_PHASES = ["pre_close", "day_1", "day_30", "day_60", "day_90", "year_1"];
const VALID_PRIORITIES = ["critical", "high", "medium", "low"];

function sanitizeSuggestions(raw: unknown[]): Array<{
  workstream: string;
  description: string;
  rationale: string;
  phase: string;
  priority: string;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .filter(
      (s) =>
        typeof s.workstream === "string" &&
        VALID_WORKSTREAMS.includes(s.workstream) &&
        typeof s.description === "string" &&
        s.description.trim().length > 0 &&
        typeof s.rationale === "string" &&
        s.rationale.trim().length > 0 &&
        typeof s.phase === "string" &&
        VALID_PHASES.includes(s.phase) &&
        typeof s.priority === "string" &&
        VALID_PRIORITIES.includes(s.priority)
    )
    .slice(0, 8)
    .map((s) => ({
      workstream: s.workstream as string,
      description: (s.description as string).trim().slice(0, 300),
      rationale: (s.rationale as string).trim().slice(0, 400),
      phase: s.phase as string,
      priority: s.priority as string,
    }));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  const body = await req.json();
  const { mode, intake, item, dealContext } = body;

  let systemPrompt: string;
  let userPrompt: string;

  if (mode === "deal") {
    if (!intake) return NextResponse.json({ suggestions: [] });

    const structureLabel = STRUCTURE_LABELS[intake.dealStructure] || intake.dealStructure;
    const jurisdictions = intake.crossBorder
      ? intake.jurisdictions?.join(", ") || "unspecified"
      : "Domestic";

    systemPrompt = `You are a senior M&A integration advisor reviewing a deal intake profile.
Your task is to identify 3-7 ADDITIONAL checklist items that should be added to this deal's integration plan,
beyond what a standard M&A finance integration checklist already covers.

Rules:
- Only suggest items that are genuinely triggered by THIS deal's specific characteristics (sector, structure, size, jurisdictions, ERP, GAAP)
- Do NOT suggest generic M&A best practices that apply to every deal
- Each suggestion must belong to one of these exact workstreams: ${VALID_WORKSTREAMS.join(", ")}
- Each suggestion must have a clear rationale explaining which intake field triggered it
- Phases must be one of: pre_close, day_1, day_30, day_60, day_90, year_1
- Priorities must be one of: critical, high, medium, low

Return ONLY valid JSON in this exact format, no other text:
{
  "suggestions": [
    {
      "workstream": "exact workstream name",
      "description": "specific actionable task description",
      "rationale": "which deal characteristic triggers this and why",
      "phase": "phase_value",
      "priority": "priority_value"
    }
  ]
}`;

    userPrompt = `Deal profile:
- Name: ${intake.dealName}
- Structure: ${structureLabel}
- Integration Model: ${intake.integrationModel}
- Close Date: ${intake.closeDate || "TBD"}
- Cross-Border: ${intake.crossBorder ? `Yes — ${jurisdictions}` : "No — Domestic"}
- TSA Required: ${intake.tsaRequired}
- Industry Sector: ${intake.industrySector || "Not specified"}
- Deal Value: ${intake.dealValueRange || "Not specified"}
- Target Entities: ${intake.targetEntities}
- Target GAAP: ${intake.targetGaap || "Not specified"}
- Target ERP: ${intake.targetErp || "Not specified"}
- Buyer Maturity: ${intake.buyerMaturity || "Not specified"}

What additional integration checklist items does this specific deal profile warrant?`;
  } else if (mode === "item") {
    if (!item || !dealContext) return NextResponse.json({ suggestions: [] });

    const structureLabel = STRUCTURE_LABELS[dealContext.dealStructure] || dealContext.dealStructure;

    systemPrompt = `You are a senior M&A integration advisor reviewing a specific checklist item that a team is actively working.
Based on what is being discovered while executing this item, identify 0-3 ADDITIONAL steps that should be added to the same workstream.

Rules:
- Suggest only tasks discovered FROM executing this item, not advice about the current item itself
- Suggestions must be concrete, actionable next steps for the workstream
- Only suggest if there is a genuine discovery — return an empty array if no additional steps are warranted
- The workstream must match the item's workstream exactly: ${item.workstream}
- Phases must be one of: pre_close, day_1, day_30, day_60, day_90, year_1
- Priorities must be one of: critical, high, medium, low

Return ONLY valid JSON in this exact format, no other text:
{
  "suggestions": [
    {
      "workstream": "${item.workstream}",
      "description": "specific actionable task discovered from this item",
      "rationale": "what about this item's execution triggered this additional step",
      "phase": "phase_value",
      "priority": "priority_value"
    }
  ]
}`;

    userPrompt = `Checklist item being worked:
- ID: ${item.itemId}
- Workstream: ${item.workstream}
- Description: ${item.description}
- Current Status: ${item.status}
${item.blockedReason ? `- Blocked Reason: ${item.blockedReason}` : ""}
${item.notes?.length > 0 ? `- Notes: ${item.notes.join("; ")}` : ""}

Deal context:
- Structure: ${structureLabel}
- Integration Model: ${dealContext.integrationModel}
- Cross-Border: ${dealContext.crossBorder ? `Yes — ${dealContext.jurisdictions?.join(", ")}` : "No"}
- TSA Required: ${dealContext.tsaRequired}
- Sector: ${dealContext.industrySector || "Not specified"}
- Target GAAP: ${dealContext.targetGaap || "Not specified"}
- Target ERP: ${dealContext.targetErp || "Not specified"}

What additional steps for the ${item.workstream} workstream are surfaced by working this item?`;
  } else {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";

    let parsed: { suggestions?: unknown[] };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestions: [] };
    } catch {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = sanitizeSuggestions(parsed.suggestions ?? []);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
