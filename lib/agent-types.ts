export type TabId =
  | "live_status"
  | "checklist"
  | "team"
  | "risks"
  | "timeline"
  | "steerco"
  | "admin"
  | "agent";

export type AppAction =
  | { type: "navigate_tab"; tab: TabId }
  | {
      type: "filter_checklist";
      workstream?: string;
      status?: string;
      priority?: string;
      phase?: string;
      owner?: string;
      searchText?: string;
    }
  | {
      type: "update_item_status";
      itemId: string;
      status: "not_started" | "in_progress" | "blocked" | "complete" | "na";
    }
  | { type: "assign_owner"; itemId: string; ownerId: string | null }
  | { type: "bulk_assign_owner"; itemIds: string[]; ownerId: string }
  | { type: "draft_report" }
  | { type: "generate_snapshot" }
  | {
      type: "synthesize_document";
      docType: "status_report" | "risk_memo" | "task_report" | "csv_export";
      title?: string;
    }
  | {
      type: "save_document";
      title: string;
      content: string;
      docType: string;
      format: "markdown" | "text" | "csv";
    }
  | { type: "run_skill"; skillName: string };

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AppAction[];
  timestamp: string;
}

export interface AppContext {
  activeTab: string;
  dealId?: string;
  dealName?: string;
  userRole?: "admin" | "imo_lead" | "workstream_lead" | "viewer" | "external";
  dealSummary: string;
  filters: {
    workstream: string;
    status: string;
    priority: string;
    phase: string;
    owner: string;
  };
  kpis: {
    total: number;
    complete: number;
    inProgress: number;
    blocked: number;
    pctComplete: number;
  };
  people: Array<{ id: string; name: string; role?: string }>;
  checklistSummary: Array<{
    id: string;
    itemId: string;
    workstream: string;
    status: string;
    description: string;
  }>;
}

export interface AssistantRequest {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  appContext: AppContext;
}

export interface AssistantResponse {
  reply: string;
  actions: AppAction[];
}
