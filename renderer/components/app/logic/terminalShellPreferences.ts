import type { TerminalShellOption } from "@shared/appTypes";

const LAST_SHELL_KEY = "nora-terminal-last-shell-id";
const DEFAULT_SHELL_KEY = "nora-terminal-default-shell-id";

export function getStoredTerminalShellIds(): {
  lastShellId: string | null;
  defaultShellId: string | null;
} {
  return {
    lastShellId: window.localStorage.getItem(LAST_SHELL_KEY),
    defaultShellId: window.localStorage.getItem(DEFAULT_SHELL_KEY)
  };
}

export function resolvePreferredTerminalShellId(shells: TerminalShellOption[]): string | null {
  const { lastShellId, defaultShellId } = getStoredTerminalShellIds();
  const availableIds = new Set(shells.map((shell) => shell.id));

  if (defaultShellId && availableIds.has(defaultShellId)) {
    return defaultShellId;
  }

  if (lastShellId && availableIds.has(lastShellId)) {
    return lastShellId;
  }

  return shells[0]?.id || null;
}

export function rememberTerminalShell(shellId: string): void {
  window.localStorage.setItem(LAST_SHELL_KEY, shellId);
}

export function setDefaultTerminalShell(shellId: string | null): void {
  if (!shellId) {
    window.localStorage.removeItem(DEFAULT_SHELL_KEY);
    return;
  }

  window.localStorage.setItem(DEFAULT_SHELL_KEY, shellId);
}
