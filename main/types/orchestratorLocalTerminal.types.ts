import type { LocalTerminalState, TerminalShellOption } from "@shared/appTypes";
import type { RuntimeSession } from "./internal.types";

export interface LocalTerminalHelperDeps {
  nowIso: () => string;
  getLocalTerminalState: () => LocalTerminalState | null;
  setLocalTerminalState: (state: LocalTerminalState | null) => void;
  notifyLocalTerminalChanged: () => void;
  resolveTerminalShell: (shellId?: string) => TerminalShellOption;
  setTerminalBuffer: (sessionId: string, value: string) => void;
  deleteTerminalBuffer: (sessionId: string) => void;
  deleteTerminalActivity: (sessionId: string) => void;
  getRuntimeSession: (sessionId: string) => RuntimeSession | undefined;
  deleteRuntimeSession: (sessionId: string) => void;
  resetLocalTerminalTranscript: () => void;
  appendLocalTerminalOutput: (chunk: string) => void;
  updateLocalTerminal: (partial: Partial<LocalTerminalState>) => void;
  spawnLocalTerminalPty: (localTerminal: LocalTerminalState, shell: TerminalShellOption) => Promise<void>;
  homeDir: () => string;
  randomId: () => string;
}

export interface LocalTerminalHelpers {
  openLocalTerminal: (shellId?: string) => Promise<LocalTerminalState>;
  clearLocalTerminal: () => Promise<LocalTerminalState | null>;
  restartLocalTerminal: () => Promise<LocalTerminalState>;
  destroyLocalTerminal: () => Promise<LocalTerminalState | null>;
}
