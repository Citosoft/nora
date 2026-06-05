import type { AgentContextPreview, AgentSession, AppState, TerminalSession } from "@shared/appTypes";
import fs from "node:fs/promises";
import path from "node:path";
import {
  getSubmittedCommandsFromInput,
  resolveTerminalWorkspaceFromCommand
} from "./terminalWorkingDirectory";

type AgentTerminalActionsDependencies = {
  nowIso: () => string;
  getSnapshot: () => AppState;
  getPtySession: (sessionId: string) => { write: (input: string) => void } | null;
  getContextWriteChain: (agentId: string) => Promise<void> | null;
  setContextWriteChain: (agentId: string, chain: Promise<void>) => void;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  deleteTerminalActivity: (sessionId: string) => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => void;
  resetTerminalTranscript: (terminal: TerminalSession) => Promise<void>;
  clearAgentContextFile: (agent: AgentSession) => Promise<void>;
};

const previousTerminalWorkspaces = new Map<string, string>();
const terminalInputBuffers = new Map<string, string>();

export async function clearAgentContext(
  deps: AgentTerminalActionsDependencies,
  agentId: string
): Promise<AgentContextPreview> {
  const agent = deps.getSnapshot().agents.find((item) => item.id === agentId);
  if (!agent) {
    throw new Error("Agent session could not be found.");
  }

  await deps.clearAgentContextFile(agent);
  deps.setTerminalBuffer(agent.id, "");

  return {
    contextFilePath: agent.contextFilePath,
    terminalStreamPath: agent.terminalStreamPath,
    content: ""
  };
}

export async function clearAgentTerminal(
  deps: AgentTerminalActionsDependencies,
  agentId: string
): Promise<AppState> {
  const agent = deps.getSnapshot().agents.find((item) => item.id === agentId);
  if (!agent) {
    throw new Error("Agent session could not be found.");
  }

  const prior = deps.getContextWriteChain(agent.id) || Promise.resolve();
  const next = prior
    .catch(() => {
      // keep the chain alive after a failed write
    })
    .then(async () => {
      await fs.mkdir(path.dirname(agent.terminalStreamPath), { recursive: true });
      await fs.writeFile(agent.terminalStreamPath, "", "utf8");
    });
  deps.setContextWriteChain(agent.id, next);
  await next;

  deps.setTerminalBuffer(agent.id, "");
  deps.deleteTerminalActivity(agent.id);
  deps.updateAgent(agent.id, {
    rawTerminalOutput: "",
    lastTerminalLine: "",
    isBusy: false,
    busyUntil: null,
    lastEventAt: deps.nowIso()
  });

  return deps.getSnapshot();
}

export async function clearTerminal(
  deps: AgentTerminalActionsDependencies,
  sessionId: string
): Promise<AppState> {
  const terminal = deps.getSnapshot().terminals.find((item) => item.id === sessionId);
  if (!terminal) {
    throw new Error("Terminal session could not be found.");
  }

  await deps.resetTerminalTranscript(terminal);
  return deps.getSnapshot();
}

export async function sendAgentInput(
  deps: AgentTerminalActionsDependencies,
  agentId: string,
  input: string
): Promise<AppState> {
  const session = deps.getPtySession(agentId);
  if (!session) {
    throw new Error("Agent session is not running.");
  }
  session.write(`${input}\r`);
  return deps.getSnapshot();
}

export async function sendAgentTerminalInput(
  deps: AgentTerminalActionsDependencies,
  agentId: string,
  input: string
): Promise<void> {
  const session = deps.getPtySession(agentId);
  if (!session) {
    throw new Error("Agent session is not running.");
  }
  session.write(input);
}

export async function sendTerminalInput(
  deps: AgentTerminalActionsDependencies,
  sessionId: string,
  input: string
): Promise<void> {
  const shouldMarkBusy = /[\r\n]/.test(input);
  const session = deps.getPtySession(sessionId);
  if (!session) {
    throw new Error("Terminal session is not running.");
  }
  const currentInputBuffer = `${terminalInputBuffers.get(sessionId) ?? ""}${input}`;
  const { commands, remainingInput } = getSubmittedCommandsFromInput(currentInputBuffer);
  terminalInputBuffers.set(sessionId, remainingInput);
  if (shouldMarkBusy) {
    const terminal = deps.getSnapshot().terminals.find((item) => item.id === sessionId) ?? null;
    let nextWorkspace: string | null = null;
    if (terminal && commands.length > 0) {
      let workspaceCursor = terminal.currentWorkingDirectory || terminal.workspace;
      for (const command of commands) {
        const resolvedWorkspace = resolveTerminalWorkspaceFromCommand(
          command,
          workspaceCursor,
          previousTerminalWorkspaces.get(sessionId) ?? null
        );
        if (resolvedWorkspace && resolvedWorkspace !== workspaceCursor) {
          previousTerminalWorkspaces.set(sessionId, workspaceCursor);
          workspaceCursor = resolvedWorkspace;
        }
      }
      nextWorkspace = workspaceCursor !== (terminal.currentWorkingDirectory || terminal.workspace) ? workspaceCursor : null;
    }
    deps.updateTerminal(sessionId, {
      isBusy: true,
      ...(nextWorkspace && nextWorkspace !== terminal?.currentWorkingDirectory ? { currentWorkingDirectory: nextWorkspace } : {}),
      lastEventAt: deps.nowIso()
    });
  }
  session.write(input);
}
