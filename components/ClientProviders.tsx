"use client";

import { AgentProvider } from "@/lib/agent-context";
import AgentButton from "@/components/assistant/AgentButton";
import AgentPanel from "@/components/assistant/AgentPanel";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AgentProvider>
      {children}
      <AgentButton />
      <AgentPanel />
    </AgentProvider>
  );
}
