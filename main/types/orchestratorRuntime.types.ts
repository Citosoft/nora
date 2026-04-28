import type { AgentSession, LocalTerminalState, TerminalSession, TerminalShellOption, WorkspaceLocation } from "@shared/appTypes";
import type { spawn as spawnPty } from "node-pty";
import type { spawn as spawnChild } from "node:child_process";
import type { RuntimeSession, WorkspaceTarget } from "./internal.types";

export interface RuntimeHelperDeps {
  nowIso: () => string;
  findSshExecutable: () => Promise<string | null>;
  getWorkspaceLocation: (target: WorkspaceTarget) => WorkspaceLocation;
  normalizeRemoteShellPath: (value: string) => string;
  shellQuote: (value: string) => string;
  runRemoteSshCommand: (target: WorkspaceTarget, command: string) => Promise<{ stdout: string; stderr: string }>;
  execFileAsync: (
    file: string,
    args: readonly string[],
    options: {
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      maxBuffer?: number;
    }
  ) => Promise<{ stdout: string; stderr: string }>;
  isWindows: () => boolean;
  hasShellMetacharacters: (command: string) => boolean;
  parseCommandArgs: (command: string) => string[] | null;
  getShell: () => string;
  getShellArgs: (command: string) => string[];
  getPtyShellArgs: (command: string) => string[];
  getPtyEnv: (
    baseEnv: NodeJS.ProcessEnv,
    extraEnv: Record<string, string>,
    cols: number,
    rows: number
  ) => NodeJS.ProcessEnv;
  spawnPty: typeof spawnPty;
  spawnChild: typeof spawnChild;
  getShellArgsForExecutable: (executable: string, command: string) => string[];
  getAgentById: (agentId: string) => AgentSession | null;
  getRuntimeSession: (sessionId: string) => RuntimeSession | undefined;
  setRuntimeSession: (sessionId: string, session: RuntimeSession) => void;
  deleteRuntimeSession: (sessionId: string) => void;
  updateAgent: (agentId: string, partial: Partial<AgentSession>) => void;
  updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => void;
  updateLocalTerminal: (partial: Partial<LocalTerminalState>) => void;
  appendAgentOutput: (agentId: string, chunk: string) => void;
  appendTerminalOutput: (terminalId: string, chunk: string) => void;
  appendLocalTerminalOutput: (chunk: string) => void;
}

export interface RuntimeHelpers {
  prepareWorktree: (target: WorkspaceTarget, command: string) => Promise<void>;
  getPreparationFailureTranscript: (command: string, error: unknown) => string;
  spawnAgentPty: (
    agentId: string,
    command: string,
    target: WorkspaceTarget,
    toolEnv: Record<string, string>
  ) => Promise<void>;
  spawnTerminalPty: (
    terminalId: string,
    command: string,
    target: WorkspaceTarget,
    shell: TerminalShellOption
  ) => Promise<void>;
  spawnLocalTerminalPty: (
    localTerminal: LocalTerminalState,
    shell: TerminalShellOption
  ) => Promise<void>;
}
