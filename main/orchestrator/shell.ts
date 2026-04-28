import type { AgentCatalogEntry, ToolUsageInfo } from "@shared/appTypes";
import { spawn as spawnPty } from "node-pty";
import fs from "node:fs";
import { buildProcessEnv } from "../processEnv";

export function isWindows(): boolean {
  return process.platform === "win32";
}

export function getShell(): string {
  if (isWindows()) {
    return process.env.ComSpec || "cmd.exe";
  }

  const configuredShell = resolvePosixShellExecutable(process.env.SHELL || "");
  if (configuredShell) {
    return configuredShell;
  }

  for (const fallback of ["/bin/zsh", "/bin/bash", "/bin/sh"]) {
    if (fs.existsSync(fallback)) {
      return fallback;
    }
  }

  return "sh";
}

export function getShellArgs(command: string): string[] {
  if (isWindows()) {
    return ["/d", "/s", "/c", command];
  }
  return ["-lc", command];
}

export function splitCommandArguments(command: string): string[] {
  const matches = command.match(/"[^"]*"|\S+/g) || [];
  return matches.map((part) =>
    part.startsWith("\"") && part.endsWith("\"")
      ? part.slice(1, -1)
      : part
  );
}

function resolvePosixShellExecutable(shellValue: string): string | null {
  const trimmed = shellValue.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = splitCommandArguments(trimmed);
  const candidate = (parsed?.[0] || trimmed.split(/\s+/)[0] || "").trim();
  if (!candidate) {
    return null;
  }

  if (candidate.startsWith("/")) {
    return fs.existsSync(candidate) ? candidate : null;
  }

  for (const location of ["/bin", "/usr/bin", "/usr/local/bin", "/opt/homebrew/bin"]) {
    const resolved = `${location}/${candidate}`;
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

export function getInstallCommandExecution(command: string): { executable: string; args: string[] } {
  if (isWindows()) {
    const powershellMatch = command.match(/^(powershell(?:\.exe)?|pwsh(?:\.exe)?)\s+(.+)$/i);
    if (powershellMatch) {
      return {
        executable: powershellMatch[1],
        args: splitCommandArguments(powershellMatch[2])
      };
    }
  }

  return {
    executable: getShell(),
    args: getShellArgs(command)
  };
}

export function getShellArgsForExecutable(executable: string, command: string): string[] {
  const normalized = executable.toLowerCase();
  if (normalized.endsWith("cmd.exe")) {
    return ["/d", "/s", "/c", command];
  }
  if (normalized.endsWith("powershell.exe") || normalized.endsWith("pwsh.exe")) {
    return ["-NoLogo", "-NoExit", "-Command", command];
  }
  if (normalized.endsWith("bash.exe") || normalized.endsWith("/bash") || normalized.endsWith("/zsh") || normalized.endsWith("/sh")) {
    return ["-lc", command];
  }
  return getShellArgs(command);
}

export function getPtyShellArgs(command: string): string[] {
  return getShellArgs(command);
}

export function getPtyEnv(
  baseEnv: NodeJS.ProcessEnv,
  extraEnv: Record<string, string>,
  cols: number,
  rows: number
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...buildProcessEnv(baseEnv, extraEnv),
    TERM: "xterm-256color",
    COLORTERM: "truecolor",
    TERM_PROGRAM: "nora",
    COLUMNS: String(cols),
    LINES: String(rows),
    LANG: baseEnv.LANG || "en_GB.UTF-8",
    LC_ALL: baseEnv.LC_ALL || ""
  };

  delete env.PS1;
  delete env.PS2;
  delete env.PS3;
  delete env.PS4;
  delete env.PROMPT;
  delete env.PROMPT_COMMAND;
  delete env.RPROMPT;
  delete env.RPS1;

  return env;
}

export function hasShellMetacharacters(command: string): boolean {
  return /[|&;<>()$`]/.test(command);
}

export function parseCommandArgs(command: string): string[] | null {
  const args: string[] = [];
  let current = "";
  let quote: "'" | "\"" | null = null;
  let escaping = false;

  for (const char of command) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === "\"") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (escaping || quote) {
    return null;
  }

  if (current) {
    args.push(current);
  }

  return args.length ? args : null;
}

export function stripAnsi(value: string): string {
  return value
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function sanitizeCliStatusLine(line: string): string {
  return line
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type InteractiveStatusDeps = {
  nowIso: () => string;
  getToolEnv: (toolId: string) => Record<string, string>;
};

export async function getInteractiveCodexStatus(
  title: string,
  tool: AgentCatalogEntry,
  deps: InteractiveStatusDeps
): Promise<ToolUsageInfo> {
  return new Promise<ToolUsageInfo>((resolve) => {
    const command = `${tool.detectedCommand || "codex"} --no-alt-screen`;
    const ptyProcess = spawnPty(getShell(), getPtyShellArgs(command), {
      name: "xterm-256color",
      cols: 120,
      rows: 30,
      cwd: process.cwd(),
      env: getPtyEnv(process.env, deps.getToolEnv(tool.id), 120, 30)
    });

    let output = "";
    let settled = false;
    let sentStatus = false;
    let acceptedTrustPrompt = false;
    let acceptedModelPrompt = false;
    let promptReadyAt: number | null = null;
    let statusDispatchTimer: NodeJS.Timeout | null = null;
    let statusRetryTimer: NodeJS.Timeout | null = null;
    let statusReadyTimer: NodeJS.Timeout | null = null;
    let statusAttempts = 0;
    let hasStatusMarkers = false;
    let captureStartIndex = 0;
    let idleTimer: NodeJS.Timeout | null = null;
    let hardTimer: NodeJS.Timeout | null = null;

    const finish = (status: ToolUsageInfo["status"], fallback?: string): void => {
      if (settled) {
        return;
      }
      settled = true;

      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      if (statusDispatchTimer) {
        clearTimeout(statusDispatchTimer);
      }
      if (statusRetryTimer) {
        clearTimeout(statusRetryTimer);
      }
      if (statusReadyTimer) {
        clearTimeout(statusReadyTimer);
      }
      if (hardTimer) {
        clearTimeout(hardTimer);
      }

      try {
        ptyProcess.kill();
      } catch {}

      const relevantOutput = output.slice(captureStartIndex);
      const normalizedOutput = stripAnsi(relevantOutput)
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

      const rawLines = normalizedOutput
        .split("\n")
        .map((line) => sanitizeCliStatusLine(line.trimEnd()))
        .filter(Boolean);

      resolve({
        status,
        title,
        lines: rawLines.length ? rawLines : [fallback || "Codex returned no status output."],
        rawOutput: relevantOutput,
        fetchedAt: deps.nowIso()
      });
    };

    const scheduleIdleFinish = (): void => {
      if (idleTimer) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(() => {
        finish(
          hasStatusMarkers ? "available" : "error",
          hasStatusMarkers ? undefined : "Timed out waiting for Codex /status limit output."
        );
      }, sentStatus ? 12000 : 5000);
    };

    const scheduleStatusRetry = (): void => {
      if (statusRetryTimer) {
        clearTimeout(statusRetryTimer);
      }
      statusRetryTimer = setTimeout(() => {
        if (settled || hasStatusMarkers || statusAttempts >= 3) {
          return;
        }
        dispatchStatusCommand("retry");
      }, 2500);
    };

    const dispatchStatusCommand = (reason: "initial" | "retry" = "initial"): void => {
      if (statusAttempts >= 3) {
        return;
      }
      statusAttempts += 1;
      sentStatus = true;
      if (reason === "initial") {
        captureStartIndex = output.length;
      }
      ptyProcess.write("/status\r");
      scheduleStatusRetry();
    };

    hardTimer = setTimeout(() => {
      finish("error", "Timed out waiting for Codex /status output.");
    }, 30000);

    ptyProcess.onData((data) => {
      output += data;

      const plainOutput = stripAnsi(output).replace(/\s+/g, " ");

      if (!acceptedTrustPrompt && plainOutput.includes("Do you trust the contents of this directory?")) {
        acceptedTrustPrompt = true;
        ptyProcess.write("1\r");
      }

      if (!acceptedModelPrompt && plainOutput.includes("Choose how you'd like Codex to proceed.")) {
        acceptedModelPrompt = true;
        ptyProcess.write("1\r");
      }

      const promptReady =
        plainOutput.includes("OpenAI Codex") ||
        plainOutput.includes("Tip: Use /mcp to list configured MCP tools.") ||
        plainOutput.includes("Summarize recent commits") ||
        plainOutput.includes(" /status");

      if (promptReady && promptReadyAt === null) {
        promptReadyAt = Date.now();
        statusDispatchTimer = setTimeout(() => {
          dispatchStatusCommand("initial");
        }, 1200);
      }

      if (
        !sentStatus &&
        (
          plainOutput.includes("Press enter to continue") ||
          (promptReadyAt !== null && Date.now() - promptReadyAt > 1200)
        )
      ) {
        dispatchStatusCommand("initial");
      }

      const containsLimitMarkers =
        plainOutput.includes("5h limit:") ||
        plainOutput.includes("Weekly limit:") ||
        plainOutput.includes("chatgpt.com/codex/settings/usage");

      if (containsLimitMarkers) {
        hasStatusMarkers = true;
        if (statusReadyTimer) {
          clearTimeout(statusReadyTimer);
        }
        statusReadyTimer = setTimeout(() => {
          finish("available");
        }, 500);
      }

      scheduleIdleFinish();
    });

    ptyProcess.onExit(() => {
      finish("available");
    });
  });
}
