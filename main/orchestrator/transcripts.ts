import type { AgentContextEntry, AgentSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import type { TranscriptHelperDeps, TranscriptHelpers } from "../types/orchestratorTranscript.types";
import {
  appendAgentContextEntries,
  clearAgentContextArtifacts,
  ensureAgentContextArtifacts,
  estimateContextSize,
  readAgentContextEntries,
  writeAgentContextBundle
} from "./agentContextArtifacts";
import {
  TRANSCRIPT_CONTEXT_FLUSH_DEBOUNCE_MS,
  dedupeConsecutiveContextLines,
  dedupeRepeatedTrailingLineBlocks,
  shouldForceFlushContextBuffer
} from "./transcriptContextBuffer";
import { extractAgentContextLines, normalizeTerminalChunkForContext } from "./transcriptNormalization";

export function createTranscriptHelpers(deps: TranscriptHelperDeps): TranscriptHelpers {
  const contextLineRemainders = new Map<string, string>();
  const lastContextLineByAgent = new Map<string, string>();
  const pendingContextLinesByAgent = new Map<string, string[]>();
  const contextFlushTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  /** Last full flushed transcript payload per agent (before prefix-trim) for streaming redraw dedupe. */
  const lastFullTranscriptContextPayloadByAgent = new Map<string, string>();

  const clearContextFlushTimer = (agentId: string): void => {
    const timer = contextFlushTimeouts.get(agentId);
    if (timer !== undefined) {
      clearTimeout(timer);
      contextFlushTimeouts.delete(agentId);
    }
  };

  const flushPendingContextNowUnlocked = async (agent: AgentSession): Promise<void> => {
    const raw = pendingContextLinesByAgent.get(agent.id);
    if (!raw?.length) {
      return;
    }
    pendingContextLinesByAgent.delete(agent.id);
    clearContextFlushTimer(agent.id);
    const mergedLines = dedupeRepeatedTrailingLineBlocks(dedupeConsecutiveContextLines(raw), 3);
    const fullIncoming = mergedLines.join("\n").trimEnd();
    if (!fullIncoming.trim()) {
      return;
    }

    const previousFull = lastFullTranscriptContextPayloadByAgent.get(agent.id) ?? "";
    if (fullIncoming === previousFull) {
      return;
    }

    let persisted = fullIncoming;
    if (previousFull.length > 0 && fullIncoming.startsWith(previousFull)) {
      persisted = fullIncoming.slice(previousFull.length).trimStart();
      if (!persisted) {
        lastFullTranscriptContextPayloadByAgent.set(agent.id, fullIncoming);
        return;
      }
    }
    lastFullTranscriptContextPayloadByAgent.set(agent.id, fullIncoming);

    const timestamp = new Date().toISOString();
    const entry: AgentContextEntry = {
      id: `${agent.id}-output-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      agentId: agent.id,
      projectId: agent.projectId,
      sessionId: agent.sessionId,
      worktreeId: agent.worktreeId,
      createdAt: timestamp,
      kind: "agent-output",
      precision: "parsed",
      source: "transcript",
      title: `${agent.name} output`,
      content: persisted,
      preview: persisted.replace(/\s+/g, " ").trim().slice(0, 200),
      estimate: estimateContextSize(persisted.length),
      references: [],
      sourceAgentIds: []
    };
    await appendAgentContextEntries(agent.contextFilePath, [entry]);
  };

  const flushPendingContextViaWriteChain = (agent: AgentSession): void => {
    const prior = deps.getWriteChain(agent.id) || Promise.resolve();
    const next = prior
      .catch(() => {
        // keep the chain alive after a failed write
      })
      .then(async () => {
        try {
          await flushPendingContextNowUnlocked(agent);
        } catch {
          // ignore flush failures
        }
      });
    deps.setWriteChain(agent.id, next);
  };

  const scheduleDebouncedContextFlush = (agent: AgentSession): void => {
    clearContextFlushTimer(agent.id);
    const timer = setTimeout(() => {
      contextFlushTimeouts.delete(agent.id);
      flushPendingContextViaWriteChain(agent);
    }, TRANSCRIPT_CONTEXT_FLUSH_DEBOUNCE_MS);
    contextFlushTimeouts.set(agent.id, timer);
  };

  function consumeChunkContextLines(agent: AgentSession, chunk: string): string[] {
    const normalizedChunk = normalizeTerminalChunkForContext(chunk);
    const merged = `${contextLineRemainders.get(agent.id) || ""}${normalizedChunk}`;
    const parts = merged.split("\n");
    const nextRemainder = merged.endsWith("\n") ? "" : (parts.pop() || "");
    contextLineRemainders.set(agent.id, nextRemainder);

    const parsedLines = parts.flatMap((line) => extractAgentContextLines(line));
    if (!parsedLines.length) {
      return [];
    }

    const lastRecordedLine = lastContextLineByAgent.get(agent.id) || "";
    const dedupedLines = parsedLines.filter((line, index) => {
      if (index === 0 && line === lastRecordedLine) {
        return false;
      }
      return index === 0 || line !== parsedLines[index - 1];
    });

    if (dedupedLines.length) {
      lastContextLineByAgent.set(agent.id, dedupedLines[dedupedLines.length - 1] || lastRecordedLine);
    }

    return dedupedLines;
  }

  async function readTerminalStream(terminalStreamPath: string): Promise<string> {
    try {
      return await fs.readFile(terminalStreamPath, "utf8");
    } catch {
      return "";
    }
  }

  async function readContextFile(contextFilePath: string): Promise<string> {
    try {
      return await fs.readFile(contextFilePath, "utf8");
    } catch {
      return "";
    }
  }

  async function readContextEntries(contextFilePath: string): Promise<AgentContextEntry[]> {
    return readAgentContextEntries(contextFilePath);
  }

  async function initializeAgentContextFiles(agent: AgentSession): Promise<void> {
    try {
      await ensureAgentContextArtifacts(agent);
    } catch {
      // ignore context file initialization failures
    }
  }

  async function appendContextEntries(agent: AgentSession, entries: AgentContextEntry[]): Promise<void> {
    const prior = deps.getWriteChain(agent.id) || Promise.resolve();
    const next = prior
      .catch(() => {
        // keep the chain alive after a failed write
      })
      .then(async () => {
        try {
          await appendAgentContextEntries(agent.contextFilePath, entries);
        } catch {
          // ignore append failures
        }
      });
    deps.setWriteChain(agent.id, next);
    await next;
  }

  async function writeContextBundle(agent: AgentSession, bundleId: string, content: string): Promise<string> {
    return writeAgentContextBundle(agent.contextFilePath, bundleId, content);
  }

  function queueAgentContextAppend(agent: AgentSession, chunk: string): void {
    const prior = deps.getWriteChain(agent.id) || Promise.resolve();
    const next = prior
      .catch(() => {
        // keep the chain alive after a failed write
      })
      .then(async () => {
        try {
          const contextLines = consumeChunkContextLines(agent, chunk);
          await Promise.all([
            fs.mkdir(path.dirname(agent.contextFilePath), { recursive: true }),
            fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true })
          ]);
          await fs.appendFile(agent.terminalStreamPath, chunk, "utf8");
          if (contextLines.length > 0) {
            const pending = pendingContextLinesByAgent.get(agent.id) ?? [];
            pending.push(...contextLines);
            pendingContextLinesByAgent.set(agent.id, pending);
            const buffered = pendingContextLinesByAgent.get(agent.id) ?? [];
            if (shouldForceFlushContextBuffer(buffered)) {
              clearContextFlushTimer(agent.id);
              await flushPendingContextNowUnlocked(agent);
            } else {
              scheduleDebouncedContextFlush(agent);
            }
          }
        } catch {
          // ignore append failures
        }
      });
    deps.setWriteChain(agent.id, next);
  }

  async function clearAgentContext(agent: AgentSession): Promise<void> {
    const prior = deps.getWriteChain(agent.id) || Promise.resolve();
    const next = prior
      .catch(() => {
        // keep the chain alive after a failed write
      })
      .then(async () => {
        try {
          await clearAgentContextArtifacts(agent);
          contextLineRemainders.set(agent.id, "");
          lastContextLineByAgent.delete(agent.id);
          pendingContextLinesByAgent.delete(agent.id);
          clearContextFlushTimer(agent.id);
          lastFullTranscriptContextPayloadByAgent.delete(agent.id);
        } catch {
          // ignore clear failures
        }
      });
    deps.setWriteChain(agent.id, next);
    await next;
  }

  async function resetAgentTranscript(agent: AgentSession): Promise<void> {
    try {
      await fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true });
      await fs.writeFile(agent.terminalStreamPath, "", "utf8");
      contextLineRemainders.set(agent.id, "");
      lastContextLineByAgent.delete(agent.id);
      pendingContextLinesByAgent.delete(agent.id);
      clearContextFlushTimer(agent.id);
      lastFullTranscriptContextPayloadByAgent.delete(agent.id);
    } catch {
      // ignore transcript reset failures
    }
  }

  return {
    readTerminalStream,
    readContextFile,
    readContextEntries,
    initializeAgentContextFiles,
    appendContextEntries,
    writeContextBundle,
    queueAgentContextAppend,
    clearAgentContext,
    resetAgentTranscript
  };
}
