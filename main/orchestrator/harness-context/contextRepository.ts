import type { AgentContextEntry, AgentSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import { buildAgentContextEventsPath, formatAgentContextEntriesMarkdown, readAgentContextEntries } from "../agentContextArtifacts";
import { getHarnessContextAdapter } from "./adapterRegistry";

async function readContextBoundaryMs(agent: AgentSession, exactEntries: readonly AgentContextEntry[]): Promise<number> {
  const earliestExactTimestamp = exactEntries
    .map((entry) => Date.parse(entry.createdAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)[0];

  if (earliestExactTimestamp !== undefined) {
    return earliestExactTimestamp;
  }

  const filePaths = [agent.contextFilePath, buildAgentContextEventsPath(agent.contextFilePath)];
  const stats = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        return await fs.stat(filePath);
      } catch {
        return null;
      }
    })
  );

  const modifiedAtMs = stats
    .flatMap((stat) => (stat ? [stat.mtimeMs] : []))
    .sort((left, right) => left - right)[0];

  return modifiedAtMs ?? 0;
}

function mergeAgentContextEntries(
  exactEntries: readonly AgentContextEntry[],
  harnessEntries: readonly AgentContextEntry[]
): AgentContextEntry[] {
  return [...exactEntries, ...harnessEntries].sort((left, right) => {
    const timeDiff = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return left.id.localeCompare(right.id);
  });
}

export async function readMergedAgentContextEntries(agent: AgentSession): Promise<AgentContextEntry[]> {
  const exactEntries = await readAgentContextEntries(agent.contextFilePath);
  const adapter = getHarnessContextAdapter(agent.toolId);
  if (!adapter) {
    return exactEntries;
  }

  try {
    const harnessEntries = await adapter.readEntries({
      agent,
      exactEntries,
      contextBoundaryMs: await readContextBoundaryMs(agent, exactEntries)
    });
    return mergeAgentContextEntries(exactEntries, harnessEntries);
  } catch {
    return exactEntries;
  }
}

export async function readMergedAgentContextMarkdown(agent: AgentSession): Promise<string> {
  return formatAgentContextEntriesMarkdown(await readMergedAgentContextEntries(agent));
}
