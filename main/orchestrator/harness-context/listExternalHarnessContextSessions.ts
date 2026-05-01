import type {
  AgentCatalogEntry,
  AgentContextSelection,
  AgentSession,
  AppState,
  ExternalHarnessContextRef,
  ExternalHarnessSessionSummary
} from "@shared/appTypes";
import { normalizeComparablePath } from "@shared/pathComparison";
import os from "node:os";
import path from "node:path";
import { normalizeStoredResumeSessionId } from "../resumeCommandUtils";
import { readMergedAgentContextEntries } from "./contextRepository";
import { externalHarnessDiscoveryAdapters } from "./externalHarnessDiscoveryRegistry";
import { buildSyntheticExternalHarnessAgent } from "./externalHarnessSyntheticAgent";

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

const resolveToolLabel = (catalog: AgentCatalogEntry[], toolId: string): string =>
  catalog.find((entry) => entry.id === toolId)?.label?.trim() || toolId;

export const listExternalHarnessContextSessions = async (options: {
  workspaceAbsolutePath: string;
  projectId: string;
  worktreeId: string;
  agents: AgentSession[];
  agentCatalog: AgentCatalogEntry[];
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
  const merged = candidateLists.flat().sort((left, right) => (right.lastUpdatedAt || "").localeCompare(left.lastUpdatedAt || ""));
  const capped = merged.slice(0, 40);

  const summaries: ExternalHarnessSessionSummary[] = [];
  for (const candidate of capped) {
    const toolLabel = resolveToolLabel(options.agentCatalog, candidate.toolId);
    const ref: ExternalHarnessContextRef = {
      toolId: candidate.toolId,
      toolLabel,
      conversationId: candidate.conversationId,
      primaryArtifactPath: candidate.primaryArtifactPath,
      sessionLabel: candidate.sessionLabel,
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
