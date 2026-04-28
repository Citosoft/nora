import type { LocalTerminalHelperDeps, LocalTerminalHelpers } from "../types/orchestratorLocalTerminal.types";

export function createLocalTerminalHelpers(deps: LocalTerminalHelperDeps): LocalTerminalHelpers {
  async function openLocalTerminal(shellId?: string) {
    const existing = deps.getLocalTerminalState();
    if (existing) {
      return existing;
    }

    const terminalId = deps.randomId();
    const shell = deps.resolveTerminalShell(shellId);
    const localTerminal = {
      id: terminalId,
      name: "Local Terminal",
      workspace: deps.homeDir(),
      shellId: shell.id,
      shellLabel: shell.label,
      command: "",
      status: "starting" as const,
      pid: null,
      lastEventAt: deps.nowIso(),
      lastTerminalLine: "Shell",
      rawTerminalOutput: "",
      detectedLocalUrl: null,
      detectedLocalPort: null
    };

    deps.setLocalTerminalState(localTerminal);
    deps.setTerminalBuffer(terminalId, "");
    deps.notifyLocalTerminalChanged();
    await deps.spawnLocalTerminalPty(localTerminal, shell);
    return deps.getLocalTerminalState() || localTerminal;
  }

  async function clearLocalTerminal() {
    if (!deps.getLocalTerminalState()) {
      return null;
    }
    deps.resetLocalTerminalTranscript();
    return deps.getLocalTerminalState();
  }

  async function restartLocalTerminal() {
    const localTerminal = deps.getLocalTerminalState();
    if (!localTerminal) {
      throw new Error("Local terminal could not be found.");
    }

    const runningSession = deps.getRuntimeSession(localTerminal.id);
    if (runningSession) {
      runningSession.kill();
      deps.deleteRuntimeSession(localTerminal.id);
    }

    deps.resetLocalTerminalTranscript();
    deps.appendLocalTerminalOutput("\r\n[restarting terminal]\r\n");
    deps.updateLocalTerminal({
      status: "starting",
      pid: null,
      lastEventAt: deps.nowIso()
    });

    await deps.spawnLocalTerminalPty(localTerminal, deps.resolveTerminalShell(localTerminal.shellId));
    return deps.getLocalTerminalState() || localTerminal;
  }

  async function destroyLocalTerminal() {
    const localTerminal = deps.getLocalTerminalState();
    if (!localTerminal) {
      return null;
    }

    const runningSession = deps.getRuntimeSession(localTerminal.id);
    if (runningSession) {
      runningSession.kill();
      deps.deleteRuntimeSession(localTerminal.id);
    }

    deps.deleteTerminalBuffer(localTerminal.id);
    deps.deleteTerminalActivity(localTerminal.id);
    deps.setLocalTerminalState(null);
    deps.notifyLocalTerminalChanged();
    return null;
  }

  return {
    openLocalTerminal,
    clearLocalTerminal,
    restartLocalTerminal,
    destroyLocalTerminal
  };
}
