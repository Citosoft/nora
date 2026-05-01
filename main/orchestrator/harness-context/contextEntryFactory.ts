import type { AgentContextEntry, AgentSession } from "@shared/appTypes";
import { estimateContextSize } from "../agentContextArtifacts";

export function safeContextPreview(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 200);
}

export function parseIsoTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function hasExactUserPromptDuplicate(
  exactEntries: readonly AgentContextEntry[],
  content: string
): boolean {
  const normalized = content.trim();
  if (!normalized) {
    return false;
  }

  return exactEntries.some((entry) => entry.kind === "user-prompt" && entry.content.trim() === normalized);
}

export function buildHarnessContextEntry(options: {
  adapterKey: string;
  agent: AgentSession;
  uniqueSuffix: string;
  createdAt: string;
  kind: AgentContextEntry["kind"];
  title: string;
  content: string;
  conversationId?: string;
}): AgentContextEntry {
  return {
    id: `${options.agent.id}-${options.adapterKey}-${options.uniqueSuffix}-${options.kind}`,
    agentId: options.agent.id,
    projectId: options.agent.projectId,
    sessionId: options.agent.sessionId,
    worktreeId: options.agent.worktreeId,
    createdAt: options.createdAt,
    kind: options.kind,
    precision: "exact",
    source: "harness",
    title: options.title,
    content: options.content,
    preview: safeContextPreview(options.content),
    estimate: estimateContextSize(options.content.length),
    conversationId: options.conversationId,
    references: [],
    sourceAgentIds: []
  };
}
