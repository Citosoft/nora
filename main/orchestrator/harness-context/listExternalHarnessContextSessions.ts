import type {
  AgentCatalogEntry,
  AgentContextEntry,
  AgentContextSelection,
  AgentSession,
  AppState,
  ExternalHarnessContextRef,
  ExternalHarnessSessionSummary
} from "@shared/appTypes";
import { normalizeComparablePath } from "@shared/pathComparison";
import os from "node:os";
import path from "node:path";
import { buildExternalHarnessThreadArchiveKey } from "../../externalHarnessThreadArchiveStore";
import { normalizeStoredResumeSessionId } from "../resumeCommandUtils";
import { resolveAgentSessionTitle } from "../agentSessionTitles";
import { readMergedAgentContextEntries } from "./contextRepository";
import { externalHarnessDiscoveryAdapters } from "./externalHarnessDiscoveryRegistry";
import { buildSyntheticExternalHarnessAgent } from "./externalHarnessSyntheticAgent";
import { buildPromptThreadTitle } from "./promptThreadTitle";

export const resolveWorktreeIdForWorkspacePath = (
  snapshot: AppState,
  projectId: string,
  workspaceAbsolutePath: string
): string | null => {
  const windows = os.platform() === "win32";
  const target = normalizeComparablePath(path.resolve(workspaceAbsolutePath), { windows });
  for (const worktree of snapshot.worktrees) {
    if (worktree.projectId !== projectId) {
      continue;
    }
    if (normalizeComparablePath(path.resolve(worktree.path), { windows }) === target) {
      return worktree.id;
    }
  }
  return snapshot.worktrees.find((worktree) => worktree.projectId === projectId)?.id ?? null;
};

export const buildOccupiedExternalHarnessKeys = (agents: AgentSession[], workspaceAbsolutePath: string): Set<string> => {
  const windows = os.platform() === "win32";
  const target = normalizeComparablePath(path.resolve(workspaceAbsolutePath), { windows });
  const occupied = new Set<string>();
  for (const agent of agents) {
    const agentRoot = normalizeComparablePath(path.resolve(agent.workspace), { windows });
    if (agentRoot !== target) {
      continue;
    }
    const resume = agent.resumeSessionId?.trim();
    if (!resume) {
      continue;
    }
    occupied.add(`${agent.toolId}:${normalizeStoredResumeSessionId(resume)}`);
  }
  return occupied;
};

/** Harnesses without a stored thread name (or untitled threads) are identified by their opening prompt. */
const resolveFirstPromptTitle = (entries: AgentContextEntry[]): string | null => {
  for (const entry of entries) {
    const title = entry.kind === "user-prompt" ? buildPromptThreadTitle(entry.content) : null;
    if (title) {
      return title;
    }
  }
  return null;
};

const resolveToolLabel = (catalog: AgentCatalogEntry[], toolId: string): string =>
  catalog.find((entry) => entry.id === toolId)?.label?.trim() || toolId;

export const listExternalHarnessContextSessions = async (options: {
  workspaceAbsolutePath: string;
  projectId: string;
  worktreeId: string;
  agents: AgentSession[];
  agentCatalog: AgentCatalogEntry[];
  archivedThreadKeys: Set<string>;
  /** Harness stores (~/.codex, etc.) are local; skip when the focused checkout is not on this machine. */
  isRemoteWorkspace: boolean;
}): Promise<ExternalHarnessSessionSummary[]> => {
  if (options.isRemoteWorkspace) {
    return [];
  }

  const occupied = buildOccupiedExternalHarnessKeys(options.agents, options.workspaceAbsolutePath);
  const candidateLists = await Promise.all(
    externalHarnessDiscoveryAdapters.map((adapter) =>
      adapter.discoverExternalHarnessCandidates(options.workspaceAbsolutePath, occupied)
    )
  );
  const merged = candidateLists
    .flat()
    .filter((candidate) => !options.archivedThreadKeys.has(buildExternalHarnessThreadArchiveKey({
      workspacePath: options.workspaceAbsolutePath,
      toolId: candidate.toolId,
      conversationId: candidate.conversationId,
      primaryArtifactPath: candidate.primaryArtifactPath
    })))
    .sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || ""));
  const capped = merged.slice(0, 40);

  const summaries: ExternalHarnessSessionSummary[] = [];
  for (const candidate of capped) {
    const toolLabel = resolveToolLabel(options.agentCatalog, candidate.toolId);
    const threadTitle = await resolveAgentSessionTitle({
      id: `external-harness:${candidate.toolId}:${candidate.conversationId}`,
      name: "",
      toolId: candidate.toolId,
      workspace: options.workspaceAbsolutePath,
      resumeSessionId: candidate.conversationId,
      threadTitle: null
    }).catch(() => null);
    const ref: ExternalHarnessContextRef = {
      toolId: candidate.toolId,
      toolLabel,
      conversationId: candidate.conversationId,
      primaryArtifactPath: candidate.primaryArtifactPath,
      sessionLabel: candidate.sessionLabel,
      threadTitle,
      workspacePath: options.workspaceAbsolutePath
    };
    const synthetic = buildSyntheticExternalHarnessAgent({
      ref,
      projectId: options.projectId,
      worktreeId: options.worktreeId
    });
    const entries = await readMergedAgentContextEntries(synthetic, {
      forcedHarnessArtifactPath: candidate.primaryArtifactPath
    });
    if (entries.length === 0) {
      continue;
    }
    const characters = entries.reduce((total, entry) => total + entry.estimate.characters, 0);
    const estimatedTokens = entries.reduce((total, entry) => total + entry.estimate.estimatedTokens, 0);
    const latestPreview = entries[entries.length - 1]?.preview || "";
    summaries.push({
      ...ref,
      threadTitle: ref.threadTitle || resolveFirstPromptTitle(entries),
      lastUpdatedAt: candidate.lastUpdatedAt,
      latestPreview,
      entryCount: entries.length,
      estimate: { characters, estimatedTokens }
    });
  }

  return summaries.sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || ""));
};

export const composeExternalHarnessContextSelections = async (options: {
  ref: ExternalHarnessContextRef;
  projectId: string;
  worktreeId: string;
}): Promise<AgentContextSelection[]> => {
  const synthetic = buildSyntheticExternalHarnessAgent({
    ref: options.ref,
    projectId: options.projectId,
    worktreeId: options.worktreeId
  });
  const entries = await readMergedAgentContextEntries(synthetic, {
    forcedHarnessArtifactPath: options.ref.primaryArtifactPath
  });
  if (entries.length === 0) {
    return [];
  }
  return [
    {
      sourceAgentId: synthetic.id,
      entryIds: entries.map((entry) => entry.id),
      externalHarness: options.ref
    }
  ];
};
