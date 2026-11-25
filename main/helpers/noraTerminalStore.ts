import type { AppState, CreateTerminalPayload, LocalTerminalState, TerminalSession } from "@shared/appTypes";
import type { NoraTerminalInfo } from "@main/types/nora-tools/noraTools.types";
import type { NoraTerminalStore } from "@main/types/nora-tools/operations.types";

export type NoraTerminalStoreDeps = {
  workspaceTerminals: () => readonly TerminalSession[];
  getLocalTerminal: () => LocalTerminalState | null;
  /** Project currently open in Nora's window, if any. */
  openShellProjectId: () => string | null;
  openLocalTerminal: () => Promise<LocalTerminalState>;
  createWorkspaceTerminal: (payload: CreateTerminalPayload) => Promise<AppState>;
  sendInput: (sessionId: string, input: string) => Promise<void>;
  focusWorkspaceTerminal: (sessionId: string) => Promise<void>;
};

function fromWorkspace(terminal: TerminalSession): NoraTerminalInfo {
  return {
    id: terminal.id,
    name: terminal.name,
    kind: "workspace",
    status: terminal.status,
    host: terminal.host,
    cwd: terminal.currentWorkingDirectory || terminal.workspace,
    branch: terminal.branch || null,
    lastLine: terminal.lastTerminalLine,
    busy: terminal.isBusy
  };
}

function fromLocal(terminal: LocalTerminalState): NoraTerminalInfo {
  return {
    id: terminal.id,
    name: terminal.name,
    kind: "local",
    status: terminal.status,
    host: "local",
    cwd: terminal.workspace,
    branch: null,
    lastLine: terminal.lastTerminalLine,
    busy: false
  };
}

function resolveTerminal(deps: NoraTerminalStoreDeps, id: string): NoraTerminalInfo | null {
  const workspace = deps.workspaceTerminals().find((entry) => entry.id === id);
  if (workspace) return fromWorkspace(workspace);
  const local = deps.getLocalTerminal();
  return local?.id === id ? fromLocal(local) : null;
}

function blankWorkspacePayload(name: string | undefined): CreateTerminalPayload {
  const terminalName = name?.trim() || "Terminal";
  return {
    name: terminalName,
    target: { kind: "root" },
    launchConfig: { kind: "blank", command: "", label: "Shell" }
  };
}

export function createNoraTerminalStore(deps: NoraTerminalStoreDeps): NoraTerminalStore {
  return {
    list(shellProjectId) {
      const local = deps.getLocalTerminal();
      const workspace = shellProjectId
        ? deps.workspaceTerminals().filter((terminal) => terminal.projectId === shellProjectId).map(fromWorkspace)
        : [];
      return [...(local ? [fromLocal(local)] : []), ...workspace];
    },
    async open(input) {
      if (input.kind === "local") {
        return fromLocal(await deps.openLocalTerminal());
      }
      if (deps.openShellProjectId() !== input.shellProjectId) {
        throw new Error("Open this workspace in Nora before creating a workspace terminal, or use kind local.");
      }
      const before = new Set(deps.workspaceTerminals().map((terminal) => terminal.id));
      const next = await deps.createWorkspaceTerminal(blankWorkspacePayload(input.name));
      const created = next.terminals.find((terminal) => !before.has(terminal.id) && terminal.projectId === input.shellProjectId)
        ?? (next.focusedTerminalId
          ? next.terminals.find((terminal) => terminal.id === next.focusedTerminalId && terminal.projectId === input.shellProjectId)
          : undefined);
      if (!created) throw new Error("Terminal was created but could not be found.");
      return fromWorkspace(created);
    },
    async paste(id, text) {
      const matched = resolveTerminal(deps, id);
      if (!matched) throw new Error("Terminal could not be found.");
      if (matched.status !== "running" && matched.status !== "starting") {
        throw new Error(`Terminal ${matched.name} is ${matched.status} and cannot accept input.`);
      }
      await deps.sendInput(id, text);
      if (matched.kind === "workspace") {
        await deps.focusWorkspaceTerminal(id);
      }
      return matched;
    }
  };
}
