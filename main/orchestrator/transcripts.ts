import type { AgentSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import type { TranscriptHelperDeps, TranscriptHelpers } from "../types/orchestratorTranscript.types";
import { extractAgentContextLines, normalizeTerminalChunkForContext } from "./transcriptNormalization";

export function createTranscriptHelpers(deps: TranscriptHelperDeps): TranscriptHelpers {
  const contextLineRemainders = new Map<string, string>();
  const lastContextLineByAgent = new Map<string, string>();

  function formatContextEntry(agent: AgentSession, lines: string[]): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${agent.name}\n${lines.join("\n")}\n\n`;
  }

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

  async function initializeAgentContextFiles(agent: AgentSession): Promise<void> {
    try {
      await Promise.all([
        fs.mkdir(path.dirname(agent.contextFilePath), { recursive: true }),
        fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true })
      ]);
      await Promise.all([
        fs.writeFile(agent.terminalStreamPath, agent.rawTerminalOutput, "utf8"),
        fs.writeFile(agent.contextFilePath, "", { encoding: "utf8", flag: "a" })
      ]);
    } catch {
      // ignore context file initialization failures
    }
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
          const contextEntry = contextLines.length ? formatContextEntry(agent, contextLines) : "";
          await Promise.all([
            fs.mkdir(path.dirname(agent.contextFilePath), { recursive: true }),
            fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true })
          ]);
          await fs.appendFile(agent.terminalStreamPath, chunk, "utf8");
          if (contextEntry) {
            await fs.appendFile(agent.contextFilePath, contextEntry, "utf8");
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
          await Promise.all([
            fs.mkdir(path.dirname(agent.contextFilePath), { recursive: true }),
            fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true })
          ]);
          await Promise.all([
            fs.writeFile(agent.contextFilePath, "", "utf8"),
            fs.writeFile(agent.terminalStreamPath, "", "utf8")
          ]);
          contextLineRemainders.set(agent.id, "");
          lastContextLineByAgent.delete(agent.id);
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
    } catch {
      // ignore transcript reset failures
    }
  }

  return {
    readTerminalStream,
    readContextFile,
    initializeAgentContextFiles,
    queueAgentContextAppend,
    clearAgentContext,
    resetAgentTranscript
  };
}
