import type { AgentContextEntry, AgentSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import type { TranscriptHelperDeps, TranscriptHelpers } from "../types/orchestratorTranscript.types";
import {
  appendAgentContextEntries,
  clearAgentContextArtifacts,
  ensureAgentContextArtifacts,
  readAgentContextEntries,
  writeAgentContextBundle
} from "./agentContextArtifacts";
import {
  readMergedAgentContextEntries,
  readMergedAgentContextMarkdown
} from "./harness-context/contextRepository";

export function createTranscriptHelpers(deps: TranscriptHelperDeps): TranscriptHelpers {
  async function readTerminalStream(terminalStreamPath: string): Promise<string> {
    try {
      return await fs.readFile(terminalStreamPath, "utf8");
    } catch {
      return "";
    }
  }

  async function readContextFile(contextFilePath: string): Promise<string> {
    const agent = deps.findAgentByContextFilePath(contextFilePath);
    if (!agent) {
      try {
        return await fs.readFile(contextFilePath, "utf8");
      } catch {
        return "";
      }
    }

    return readMergedAgentContextMarkdown(agent);
  }

  async function readContextEntries(contextFilePath: string): Promise<AgentContextEntry[]> {
    const agent = deps.findAgentByContextFilePath(contextFilePath);
    if (!agent) {
      return readAgentContextEntries(contextFilePath);
    }

    return readMergedAgentContextEntries(agent);
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

  function appendAgentTerminalChunk(agent: AgentSession, chunk: string): void {
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
          await fs.appendFile(agent.terminalStreamPath, chunk, "utf8");
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
    appendAgentTerminalChunk,
    clearAgentContext,
    resetAgentTranscript
  };
}
