import type { ToolActivity, ToolState } from "@shared/types/conversation/contracts.types";

/** One delegated agent in a thread, merged across every report of it, with the tools it ran. */
export interface ThreadSubagent {
  nativeId: string;
  label: string;
  state: ToolState;
  agentType?: string;
  prompt?: string;
  progress?: string;
  result?: string;
  model?: string;
  effort?: string;
  startedAt: string;
  activity: ToolActivity[];
}
export interface ThreadSubagentSummary {
  agents: ThreadSubagent[];
  running: number;
}
export interface ThreadSubagentsProps { summary: ThreadSubagentSummary; }
export interface ThreadSubagentRowProps { agent: ThreadSubagent; }
export interface ThreadSubagentDetailProps { title: string; children: string; }
