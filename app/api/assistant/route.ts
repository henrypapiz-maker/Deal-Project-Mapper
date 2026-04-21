import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import type { AssistantRequest, AssistantResponse, AppAction } from "@/lib/agent-types";
import { getAllowedActionsForRole } from "@/lib/agent-permissions";
import {
  buildStatusReportPrompt,
  buildRiskMemoPrompt,
  buildTaskReportPrompt,
  buildCsvExport,
  assembleReportContext,
  formatContextForPrompt,
} from "@/lib/report-engine";

const sql = neon(process.env.DATABASE_URL!);

const CLAUDE_HEADERS = (apiKey: string) => ({
  "x-api-key": apiKey,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
});

const TOOL_DEFINITION = {
  name: "perform_app_actions",
  description:
    "Execute one or more actions in the DealMapper application on behalf of the user. " +
    "Call this whenever the user asks you to DO something in the app. " +
    "Always include a reply explaining what you did.",
  input_schema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        description: "Ordered list of actions to execute",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "navigate_tab", "filter_checklist", "update_item_status",
                "assign_owner", "bulk_assign_owner", "draft_report",
                "generate_snapshot", "synthesize_document", "run_skill",
              ],
              description:
                "navigate_tab: switch to a tab. " +
                "filter_checklist: set checklist filters. " +
                "update_item_status: change one item's status. " +
                "assign_owner: assign/unassign one item's owner. " +
                "bulk_assign_owner: assign many items to one owner. " +
                "draft_report: open the SteerCo report drafter. " +
                "generate_snapshot: capture current progress snapshot. " +
                "synthesize_document(docType): generate and save a document to the DB. " +
                "run_skill(skillName): execute a named multi-step workflow.",
            },
            tab: {
              type: "string",
              enum: ["live_status", "checklist", "team", "risks", "timeline", "steerco", "admin", "agent"],
              description: "Required for navigate_tab",
            },
            workstream: { type: "string", description: "filter_checklist: workstream name or 'all'" },
            status: { type: "string", description: "filter_checklist: all|not_started|in_progress|blocked|complete|na|overdue" },
            priority: { type: "string", description: "filter_checklist: all|critical|high|medium|low" },
            phase: { type: "string", description: "filter_checklist: all|pre_close|day_1|day_30|day_60|day_90|year_1" },
            owner: { type: "string", description: "filter_checklist: person id, 'all', or 'unassigned'" },
            searchText: { type: "string", description: "filter_checklist: text search string" },
            itemId: { type: "string", description: "update_item_status/assign_owner: internal UUID id" },
            itemIds: { type: "array", items: { type: "string" }, description: "bulk_assign_owner: array of UUIDs" },
            ownerId: { type: ["string", "null"], description: "assign_owner/bulk_assign_owner: person id or null" },
            docType: {
              type: "string",
              enum: ["status_report", "risk_memo", "task_report", "csv_export"],
              description: "synthesize_document: type of document to generate",
            },
            title: { type: "string", description: "synthesize_document: optional document title override" },
            skillName: { type: "string", description: "run_skill: exact name of the skill to execute" },
          },
          required: ["type"],
        },
      },
    },
    required: ["actions"],
  },
};

function buildSystemPrompt(appContext: AssistantRequest["appContext"]): string {
  const { activeTab, dealName, dealSummary, filters, kpis, people } = appContext;

  const filterDesc = Object.entries(filters)
    .filter(([, v]) => v && v !== "all")
    .map(([k, v]) => `${k}=${v}`)
    .join(", ") || "none";

  const peopleList = people
    .map((p) => `  ${p.id} — ${p.name}${p.role ? ` (${p.role})` : ""}`)
    .join("\n") || "  (no team members yet)";

  return `You are the DealMapper AI agent — a hands-on M&A integration program assistant. You can answer questions AND take actions directly in the app.

CURRENT APP STATE:
- Deal: ${dealName || "No deal loaded"}
- Active tab: ${activeTab}
- Active filters: ${filterDesc}
- KPIs: ${kpis.total} items total | ${kpis.complete} complete (${kpis.pctComplete}%) | ${kpis.inProgress} in-progress | ${kpis.blocked} blocked

DEAL CONTEXT:
${dealSummary || "(No deal loaded — answer general M&A integration questions)"}

TEAM ROSTER (use these IDs for owner assignments):
${peopleList}

AVAILABLE ACTIONS:
- navigate_tab(tab): Switch to live_status | checklist | team | risks | timeline | steerco | admin | agent
- filter_checklist(workstream?, status?, priority?, phase?, owner?, searchText?): Filter checklist + navigate there
- update_item_status(itemId, status): Mark a single item not_started | in_progress | blocked | complete | na
- assign_owner(itemId, ownerId): Assign or unassign (null) an owner
- bulk_assign_owner(itemIds[], ownerId): Assign many items to one person
- draft_report(): Navigate to SteerCo tab and open Report Drafter
- generate_snapshot(): Capture current progress as a new snapshot
- synthesize_document(docType, title?): Generate and save a document. docType: status_report | risk_memo | task_report | csv_export
- run_skill(skillName): Execute a named multi-step workflow from the skill library

RULES:
1. When performing actions, ALWAYS explain what you did and why in your reply.
2. For bulk updates affecting >5 items, confirm the count first.
3. Never modify items the user didn't explicitly request.
4. For ambiguous references, resolve from checklist summary and act on them.
5. If no deal is loaded, answer M&A questions but note app actions are unavailable.
6. Keep replies concise — 1-3 sentences unless analysis is requested.
7. When showing filtered results, call filter_checklist so the user can see them.`;
}

async function synthesizeDocument(
  apiKey: string,
  dealId: string,
  docType: string,
  title?: string
): Promise<{ content: string; resolvedTitle: string; format: "markdown" | "csv" }> {
  // Fetch deal data from DB for synthesis context
  const [dealRow] = await sql`SELECT * FROM deals WHERE id = ${dealId}`;
  if (!dealRow) throw new Error("Deal not found");

  const items = await sql`SELECT * FROM checklist_items WHERE deal_id = ${dealId}`;
  const risks = await sql`SELECT * FROM risk_alerts WHERE deal_id = ${dealId}`;
  const team = await sql`SELECT * FROM team_members WHERE deal_id = ${dealId}`;

  // Build a minimal GeneratedDeal-like object for report-engine
  const mockDeal = {
    id: dealId,
    intake: {
      dealName: dealRow.name,
      dealStructure: dealRow.deal_structure,
      integrationModel: dealRow.integration_model,
      closeDate: dealRow.close_date,
      crossBorder: dealRow.cross_border,
      jurisdictions: dealRow.jurisdictions || [],
      tsaRequired: dealRow.tsa_required,
      industrySector: dealRow.industry_sector,
      dealValueRange: dealRow.deal_value_range,
      targetEntities: dealRow.target_entities,
      targetGaap: dealRow.target_gaap,
      targetErp: dealRow.target_erp,
      buyerMaturity: dealRow.buyer_maturity,
      functionalScope: dealRow.functional_scope || [],
    },
    checklistItems: items.map((i: any) => ({
      id: i.id, itemId: i.item_id, workstream: i.workstream,
      section: i.section, description: i.description, phase: i.phase,
      priority: i.priority, status: i.status, ownerId: i.owner_id,
      milestoneDate: i.milestone_date, tsaRelevant: i.tsa_relevant,
      crossBorderFlag: i.cross_border_flag,
      riskIndicators: i.risk_indicators || [],
      notes: i.notes || [], attachments: i.attachments || [],
      dependencies: i.dependencies || [],
      blockedReason: i.blocked_reason,
    })),
    riskAlerts: risks.map((r: any) => ({
      id: r.id, category: r.category, severity: r.severity,
      description: r.description, mitigation: r.mitigation,
      affectedWorkstreams: [], status: r.status,
    })),
    people: team.map((p: any) => ({ id: p.id, name: p.name, role: p.role })),
    workstreamSummary: [], milestones: [], progressSnapshots: [],
    savedFilters: [], changeLog: [], generatedAt: new Date().toISOString(),
  } as any;

  if (docType === "csv_export") {
    const content = buildCsvExport(mockDeal);
    return { content, resolvedTitle: title || `${dealRow.name} — Checklist Export`, format: "csv" };
  }

  const ctx = assembleReportContext(mockDeal, {});

  let promptFn: (c: typeof ctx) => string;
  let defaultTitle: string;

  if (docType === "status_report") {
    promptFn = buildStatusReportPrompt;
    defaultTitle = `${dealRow.name} — Weekly Status Report`;
  } else if (docType === "risk_memo") {
    promptFn = buildRiskMemoPrompt;
    defaultTitle = `${dealRow.name} — Risk Memo`;
  } else {
    promptFn = buildTaskReportPrompt;
    defaultTitle = `${dealRow.name} — Task Assignment Report`;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: CLAUDE_HEADERS(apiKey),
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: "You are an M&A integration document writer. Generate the requested document in clean markdown format.",
      messages: [{ role: "user", content: promptFn(ctx) }],
    }),
  });

  if (!res.ok) throw new Error("Synthesis Claude call failed");
  const data = await res.json();
  const content = data.content?.[0]?.text ?? "";

  return { content, resolvedTitle: title || defaultTitle, format: "markdown" };
}

async function expandSkill(
  apiKey: string,
  skillName: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<AppAction[]> {
  const res = await fetch("/api/agent/skills?name=" + encodeURIComponent(skillName), {
    headers: { "content-type": "application/json" },
  }).catch(() => null);

  // Fetch skill via direct DB query (can't call own API from server)
  const [skill] = await sql`SELECT steps FROM agents.skills WHERE name = ${skillName}`;
  if (!skill) return [];

  const steps: Array<{ order: number; instruction: string }> = skill.steps || [];
  if (steps.length === 0) return [];

  const stepsText = steps
    .sort((a, b) => a.order - b.order)
    .map((s, i) => `${i + 1}. ${s.instruction}`)
    .join("\n");

  const skillMessages = [
    ...messages,
    {
      role: "user",
      content: `Execute the skill "${skillName}" by following these steps in order:\n${stepsText}\n\nCall perform_app_actions with all the appropriate actions for these steps.`,
    },
  ];

  const skillRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: CLAUDE_HEADERS(apiKey),
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      tools: [TOOL_DEFINITION],
      tool_choice: { type: "auto" },
      messages: skillMessages,
    }),
  });

  if (!skillRes.ok) return [];
  const skillData = await skillRes.json();
  const toolUse = skillData.content?.find((b: any) => b.type === "tool_use");
  return toolUse?.input?.actions ?? [];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "no_api_key" }, { status: 500 });
  }

  let body: AssistantRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { message, history, appContext } = body;
  const { userRole, dealId } = appContext;

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  // Inject checklist summary
  if (appContext.checklistSummary.length > 0) {
    const summaryText =
      "\n\nCURRENT CHECKLIST ITEMS (id | itemId | workstream | status | description):\n" +
      appContext.checklistSummary
        .map((i) => `  ${i.id} | ${i.itemId} | ${i.workstream} | ${i.status} | ${i.description}`)
        .join("\n");
    const last = messages[messages.length - 1];
    messages[messages.length - 1] = { ...last, content: last.content + summaryText };
  }

  const systemPrompt = buildSystemPrompt(appContext);

  try {
    // First Claude call
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: CLAUDE_HEADERS(apiKey),
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        tools: [TOOL_DEFINITION],
        tool_choice: { type: "auto" },
        messages,
      }),
    });

    if (!res.ok) {
      console.error("Claude API error:", await res.text());
      return NextResponse.json({ error: "api_error" }, { status: 502 });
    }

    const data = await res.json();
    const content: Array<{ type: string; text?: string; input?: { actions: AppAction[] } }> =
      data.content ?? [];

    let reply = content.find((b) => b.type === "text")?.text?.trim() ?? "Done.";
    const toolUse = content.find((b) => b.type === "tool_use");
    let actions: AppAction[] = toolUse?.input?.actions ?? [];

    // Handle synthesize_document — second pass: synthesize content, convert to save_document
    const synthAction = actions.find((a) => a.type === "synthesize_document") as Extract<AppAction, { type: "synthesize_document" }> | undefined;
    if (synthAction && dealId) {
      try {
        const { content: docContent, resolvedTitle, format } = await synthesizeDocument(
          apiKey, dealId, synthAction.docType, synthAction.title
        );
        // Replace synthesize_document with save_document
        actions = actions.map((a) =>
          a.type === "synthesize_document"
            ? ({ type: "save_document", title: resolvedTitle, content: docContent, docType: synthAction.docType, format } as AppAction)
            : a
        );
        reply += `\n\nGenerated: **${resolvedTitle}** (${format === "csv" ? "CSV" : "Markdown"}, ${docContent.split(/\s+/).length} words). Saving to documents…`;
      } catch (e) {
        console.error("Synthesis error:", e);
        actions = actions.filter((a) => a.type !== "synthesize_document");
        reply += "\n\n(Document synthesis failed — please try again.)";
      }
    }

    // Handle run_skill — second pass: expand skill steps into actions
    const skillAction = actions.find((a) => a.type === "run_skill") as Extract<AppAction, { type: "run_skill" }> | undefined;
    if (skillAction) {
      try {
        const skillActions = await expandSkill(apiKey, skillAction.skillName, messages, systemPrompt);
        actions = [...actions.filter((a) => a.type !== "run_skill"), ...skillActions];
      } catch (e) {
        console.error("Skill expansion error:", e);
        actions = actions.filter((a) => a.type !== "run_skill");
      }
    }

    // Permission filtering — strip disallowed actions for non-admin users
    if (userRole && userRole !== "admin") {
      try {
        const allowed = await getAllowedActionsForRole(userRole);
        const filtered = actions.filter((a) => allowed.has(a.type));
        if (filtered.length < actions.length) {
          reply += " (Some actions were restricted by your role permissions.)";
        }
        actions = filtered;
      } catch (e) {
        console.error("Permission check error:", e);
      }
    }

    const response: AssistantResponse = { reply, actions };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Assistant route error:", err);
    return NextResponse.json({ error: "network_error" }, { status: 500 });
  }
}
