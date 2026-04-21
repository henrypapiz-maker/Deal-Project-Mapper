"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppAction, TabId } from "./agent-types";
import type { GeneratedDeal, ItemStatus, ProgressSnapshot } from "./types";
import { generateSnapshot, getCurrentPeriodEnd } from "./progress";

export interface FilterState {
  workstream: string;
  status: string;
  priority: string;
  phase: string;
  owner: string;
}

export interface AgentCallbacks {
  setActiveTab: (tab: TabId) => void;
  setFilterWs: (ws: string) => void;
  setFilterStatus: (s: string) => void;
  setFilterPriority: (p: string) => void;
  setFilterPhase: (ph: string) => void;
  setFilterOwner: (o: string) => void;
  setSearchText: (t: string) => void;
  onUpdateStatus: (itemId: string, status: ItemStatus) => void;
  onAssignOwner: (itemId: string, ownerId: string | undefined) => void;
  onBulkAssign: (itemIds: string[], ownerId: string) => void;
  onSaveSnapshot: (snapshot: ProgressSnapshot) => void;
  getDeal: () => GeneratedDeal | null;
  getActiveTab: () => string;
  getFilterState: () => FilterState;
  getUserRole?: () => string | undefined;
}

interface AgentContextValue {
  register: (cbs: AgentCallbacks) => void;
  unregister: () => void;
  dispatch: (actions: AppAction[]) => void;
  isRegistered: boolean;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  unreadCount: number;
  incrementUnread: () => void;
  clearUnread: () => void;
  getCallbacks: () => AgentCallbacks | null;
  pendingPrompt: string | null;
  setPendingPrompt: (p: string | null) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const callbacksRef = useRef<AgentCallbacks | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  function register(cbs: AgentCallbacks) {
    callbacksRef.current = cbs;
    setIsRegistered(true);
  }

  function unregister() {
    callbacksRef.current = null;
    setIsRegistered(false);
  }

  function dispatch(actions: AppAction[]) {
    const cbs = callbacksRef.current;
    if (!cbs) return;

    for (const action of actions) {
      switch (action.type) {
        case "navigate_tab":
          cbs.setActiveTab(action.tab);
          break;

        case "filter_checklist":
          if (action.workstream !== undefined) cbs.setFilterWs(action.workstream);
          if (action.status !== undefined) cbs.setFilterStatus(action.status);
          if (action.priority !== undefined) cbs.setFilterPriority(action.priority);
          if (action.phase !== undefined) cbs.setFilterPhase(action.phase);
          if (action.owner !== undefined) cbs.setFilterOwner(action.owner);
          if (action.searchText !== undefined) cbs.setSearchText(action.searchText);
          // Auto-navigate to checklist when applying filters
          cbs.setActiveTab("checklist");
          break;

        case "update_item_status":
          cbs.onUpdateStatus(action.itemId, action.status as ItemStatus);
          break;

        case "assign_owner":
          cbs.onAssignOwner(action.itemId, action.ownerId ?? undefined);
          break;

        case "bulk_assign_owner":
          cbs.onBulkAssign(action.itemIds, action.ownerId);
          break;

        case "draft_report":
          cbs.setActiveTab("steerco");
          break;

        case "generate_snapshot": {
          const deal = cbs.getDeal();
          if (deal) {
            const snapshot = generateSnapshot(
              deal,
              getCurrentPeriodEnd(),
              deal.ragOverrides
            );
            cbs.onSaveSnapshot(snapshot);
          }
          break;
        }

        case "save_document": {
          const deal = cbs.getDeal();
          if (!deal) break;
          // Fire-and-forget: persist synthesized document to DB + Vercel Blob
          fetch("/api/agent/documents", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              dealId: deal.id,
              title: action.title,
              content: action.content,
              docType: action.docType,
              format: action.format,
            }),
          }).catch((e) => console.error("save_document failed:", e));
          break;
        }
      }
    }
  }

  return (
    <AgentContext.Provider
      value={{
        register,
        unregister,
        dispatch,
        isRegistered,
        panelOpen,
        setPanelOpen,
        unreadCount,
        incrementUnread: () => setUnreadCount((n) => n + 1),
        clearUnread: () => setUnreadCount(0),
        getCallbacks: () => callbacksRef.current,
        pendingPrompt,
        setPendingPrompt,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgentContext() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgentContext must be used inside AgentProvider");
  return ctx;
}
