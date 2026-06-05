import path from "node:path";
import { hasShellMetacharacters, parseCommandArgs } from "./shell";

export type SubmittedTerminalCommands = {
  commands: string[];
  remainingInput: string;
};

function getHomeDirectoryForWorkspace(currentWorkspace: string): string | null {
  const home = (process.env.HOME || process.env.USERPROFILE || "").trim();
  if (home) {
    return home;
  }

  if (currentWorkspace.startsWith("$HOME")) {
    return "$HOME";
  }

  return null;
}

function isWindowsLikePath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.includes("\\");
}

function resolvePathFromWorkspace(currentWorkspace: string, targetPath: string): string {
  const pathApi = isWindowsLikePath(currentWorkspace) || isWindowsLikePath(targetPath) ? path.win32 : path.posix;
  return pathApi.isAbsolute(targetPath)
    ? pathApi.normalize(targetPath)
    : pathApi.resolve(currentWorkspace, targetPath);
}

export function extractOsc7WorkingDirectory(value: string): string | null {
  const pattern = /\u001b\]7;file:\/\/(?:[^/:;\s]+)?([^\u0007\u001b]*)(?:\u0007|\u001b\\)/g;
  let lastEncodedPath: string | null = null;
  let match = pattern.exec(value);
  while (match) {
    lastEncodedPath = match[1] ?? null;
    match = pattern.exec(value);
  }

  if (!lastEncodedPath) {
    return null;
  }

  try {
    return decodeURIComponent(lastEncodedPath);
  } catch {
    return lastEncodedPath;
  }
}

export function getTrailingIncompleteOsc7Sequence(value: string): string {
  const osc7Start = value.lastIndexOf("\u001b]7;");
  if (osc7Start === -1) {
    return "";
  }

  const tail = value.slice(osc7Start);
  return tail.includes("\u0007") || tail.includes("\u001b\\") ? "" : tail;
}

export function getSubmittedCommandsFromInput(inputBuffer: string): SubmittedTerminalCommands {
  const commands: string[] = [];
  let currentCommand = "";

  for (const char of inputBuffer) {
    if (char === "\r" || char === "\n") {
      const submittedCommand = currentCommand.trim();
      if (submittedCommand) {
        commands.push(submittedCommand);
      }
      currentCommand = "";
      continue;
    }

    if (char === "\u007f" || char === "\b") {
      currentCommand = currentCommand.slice(0, -1);
      continue;
    }

    if (char === "\u0015") {
      currentCommand = "";
      continue;
    }

    currentCommand += char;
  }

  return {
    commands,
    remainingInput: currentCommand
  };
}

export function resolveTerminalWorkspaceFromCommand(
  command: string,
  currentWorkspace: string,
  previousWorkspace: string | null
): string | null {
  if (!command || hasShellMetacharacters(command)) {
    return null;
  }

  const args = parseCommandArgs(command);
  if (!args || args[0] !== "cd" || args.length > 2) {
    return null;
  }

  const rawTarget = args[1] ?? "";
  if (rawTarget === "-") {
    return previousWorkspace;
  }

  if (!rawTarget || rawTarget === "~") {
    return getHomeDirectoryForWorkspace(currentWorkspace);
  }

  if (rawTarget.startsWith("~/")) {
    const home = getHomeDirectoryForWorkspace(currentWorkspace);
    return home ? resolvePathFromWorkspace(home, rawTarget.slice(2)) : null;
  }

  if (rawTarget.startsWith("~")) {
    return null;
  }

  return resolvePathFromWorkspace(currentWorkspace, rawTarget);
}

export function resolveTerminalWorkspaceFromInput(
  input: string,
  currentWorkspace: string,
  previousWorkspace: string | null
): string | null {
  const { commands } = getSubmittedCommandsFromInput(input);
  if (commands.length !== 1) {
    return null;
  }

  return resolveTerminalWorkspaceFromCommand(commands[0] ?? "", currentWorkspace, previousWorkspace);
}
