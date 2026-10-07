import type { AgentCatalogEntry, ToolUsageInfo } from "@shared/appTypes";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { resolveClaudeConfigDir } from "../agent-usage/claudeConfigDir";
import { parseCliUsageLines } from "../agent-usage/cliUsageLines";
import { resolveCursorStateDbPath } from "../agent-usage/cursorAuthState";
import { createToolUsageInfo } from "../agent-usage/toolUsageInfo";
import { buildProcessEnv } from "../processEnv";
import type { CliStatusCapture } from "../types/agent-usage/toolUsageInfo.types";
import type { ToolStatusHelperDeps, ToolStatusHelpers } from "../types/orchestratorToolStatus.types";

function normalizeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (base64.length % 4)) % 4;
  return `${base64}${"=".repeat(padding)}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const payload = Buffer.from(normalizeBase64Url(parts[1]), "base64").toString("utf8");
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

type AuthHintReadResult = {
  hints: string[];
  readable: boolean;
};

async function readCodexAuthHints(): Promise<AuthHintReadResult> {
  const authPath = path.join(os.homedir(), ".codex", "auth.json");
  try {
    console.log("[nora main] codex auth hint read start", { authPath });
    const raw = await fs.readFile(authPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const tokens = asRecord(parsed.tokens);
    const idToken = asString(tokens?.id_token);
    const payload = idToken ? decodeJwtPayload(idToken) : null;
    const authRoot = asRecord(payload?.["https://api.openai.com/auth"]);
    const profileRoot = asRecord(payload?.["https://api.openai.com/profile"]);
    const email = asString(profileRoot?.email) ?? asString(payload?.email);
    const plan = asString(authRoot?.chatgpt_plan_type);
    const accountId = asString(authRoot?.chatgpt_account_id) ?? asString(tokens?.account_id);

    const hints = [
      email ? `User: ${email}` : null,
      plan ? `Plan: ${plan}` : null,
      accountId ? `Account: ${accountId}` : null
    ].filter((line): line is string => Boolean(line));
    console.log("[nora main] codex auth hint read success", {
      authPath,
      hintCount: hints.length
    });
    return {
      hints,
      readable: true
    };
  } catch {
    console.warn("[nora main] codex auth hint read failed", { authPath });
    return {
      hints: [],
      readable: false
    };
  }
}

async function readGeminiAuthHints(): Promise<string[]> {
  const accountsPath = path.join(os.homedir(), ".gemini", "google_accounts.json");
  try {
    console.log("[nora main] gemini auth hint read start", { accountsPath });
    const raw = await fs.readFile(accountsPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const active = asString(parsed.active);
    const hints = active ? [`User: ${active}`] : [];
    console.log("[nora main] gemini auth hint read success", {
      accountsPath,
      hintCount: hints.length
    });
    return hints;
  } catch {
    console.warn("[nora main] gemini auth hint read failed", { accountsPath });
    return [];
  }
}

async function readClaudeAuthHints(env: NodeJS.ProcessEnv): Promise<string[]> {
  // Claude Code keeps `.claude.json` inside its config root only when CLAUDE_CONFIG_DIR is set.
  const configPath = env.CLAUDE_CONFIG_DIR?.trim()
    ? path.join(resolveClaudeConfigDir(env), ".claude.json")
    : path.join(os.homedir(), ".claude.json");
  try {
    console.log("[nora main] claude auth hint read start", { configPath });
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const email = asString(asRecord(parsed.oauthAccount)?.emailAddress);
    const userId = asString(parsed.userID);
    const hints = email ? [`User: ${email}`] : userId ? [`User ID: ${userId}`] : [];
    console.log("[nora main] claude auth hint read success", {
      configPath,
      hintCount: hints.length
    });
    return hints;
  } catch {
    console.warn("[nora main] claude auth hint read failed", { configPath });
    return [];
  }
}

function dedupeLines(lines: string[]): string[] {
  return lines.filter((line, index) => lines.indexOf(line) === index);
}

export function createToolStatusHelpers(deps: ToolStatusHelperDeps): ToolStatusHelpers {
  const getClaudeEnv = (): NodeJS.ProcessEnv => ({ ...process.env, ...deps.getToolEnv("claude") });

  function getToolStatusArgs(toolId: string): { title: string; args: string[] } | null {
    if (toolId === "codex") {
      return { title: "Codex CLI Usage", args: [] };
    }
    if (toolId === "gemini") {
      return { title: "Gemini CLI Status", args: ["--version"] };
    }
    if (toolId === "claude") {
      return { title: "Claude Code Usage", args: [] };
    }
    if (toolId === "cursor") {
      return { title: "Cursor Usage", args: [] };
    }
    return null;
  }

  async function getAuthHints(toolId: string): Promise<string[]> {
    if (toolId === "codex") {
      return (await readCodexAuthHints()).hints;
    }
    if (toolId === "gemini") {
      return readGeminiAuthHints();
    }
    if (toolId === "claude") {
      return readClaudeAuthHints(getClaudeEnv());
    }
    return [];
  }

  async function getCliToolStatus(tool: AgentCatalogEntry) {
    if (!tool.supportsUsageStatus) {
      console.log("[nora main] tool status skipped", {
        toolId: tool.id,
        reason: "unsupported"
      });
      return null;
    }

    const statusCommand = getToolStatusArgs(tool.id);
    if (!statusCommand) {
      console.log("[nora main] tool status skipped", {
        toolId: tool.id,
        reason: "no-status-command"
      });
      return null;
    }

    const codexAuthHints = tool.id === "codex" ? await readCodexAuthHints() : null;
    const authHints = codexAuthHints?.hints ?? await getAuthHints(tool.id);
    const shellCommand = [tool.detectedCommand || tool.id, ...statusCommand.args].join(" ");
    console.log("[nora main] tool status probe start", {
      toolId: tool.id,
      title: statusCommand.title,
      shellCommand,
      authHintCount: authHints.length
    });

    if (tool.id === "codex") {
      if (!codexAuthHints?.readable || authHints.length === 0) {
        console.log("[nora main] codex status probe skipped", {
          toolId: tool.id,
          reason: codexAuthHints?.readable ? "no-auth-hints" : "auth-file-unreadable"
        });
        return createToolUsageInfo({
          status: "unavailable",
          title: statusCommand.title,
          notice: "Codex is not signed in.",
          fetchedAt: deps.nowIso()
        });
      }

      const interactiveStatus = await deps.getInteractiveCodexStatus(tool);
      const dedupedLines = dedupeLines([...authHints, ...interactiveStatus.lines]).slice(-24);
      console.log("[nora main] tool status probe success", {
        toolId: tool.id,
        title: statusCommand.title,
        lineCount: dedupedLines.length,
        lines: dedupedLines,
        source: "interactive-status"
      });
      return buildCliUsageInfo(tool, statusCommand.title, {
        ...interactiveStatus,
        lines: dedupedLines
      });
    }

    if (tool.id === "claude") {
      const claudeUsage = await deps.getClaudeUsageStatus({
        title: statusCommand.title,
        configDir: resolveClaudeConfigDir(getClaudeEnv()),
        account: parseCliUsageLines(authHints).account,
        hintLines: authHints,
        nowIso: deps.nowIso
      });
      console.log("[nora main] tool status probe success", {
        toolId: tool.id,
        title: statusCommand.title,
        status: claudeUsage.status,
        lineCount: claudeUsage.lines.length,
        source: "oauth-usage"
      });
      return claudeUsage;
    }

    if (tool.id === "cursor") {
      const cursorUsage = await deps.getCursorUsageStatus({
        title: statusCommand.title,
        stateDbPath: resolveCursorStateDbPath(),
        nowIso: deps.nowIso
      });
      console.log("[nora main] tool status probe success", {
        toolId: tool.id,
        title: statusCommand.title,
        status: cursorUsage.status,
        windowCount: cursorUsage.windows.length,
        source: "dashboard-usage"
      });
      return cursorUsage;
    }

    try {
      const { stdout, stderr } = await deps.execFileAsync(
        deps.getShell(),
        deps.getShellArgs(shellCommand),
        {
          cwd: process.cwd(),
          env: buildProcessEnv(process.env, deps.getToolEnv(tool.id)),
          timeout: 15_000,
          maxBuffer: 1024 * 1024
        }
      );
      const lines = `${stdout}\n${stderr}`
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("OpenAI Codex v"))
        .filter((line) => !line.startsWith("WARNING: proceeding, even though we could not update PATH"));
      const dedupedLines = dedupeLines([...authHints, ...lines]).slice(-16);
      console.log("[nora main] tool status probe success", {
        toolId: tool.id,
        title: statusCommand.title,
        lineCount: dedupedLines.length,
        lines: dedupedLines
      });
      return buildCliUsageInfo(tool, statusCommand.title, {
        status: "available",
        lines: dedupedLines.length ? dedupedLines : [`${tool.label} returned no status output.`]
      });
    } catch (error: unknown) {
      const stdout = deps.getExecStdout(error);
      const stderr =
        error && typeof error === "object" && "stderr" in error && typeof error.stderr === "string"
          ? error.stderr
          : "";
      const lines = `${stdout}\n${stderr}`
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("WARNING: proceeding, even though we could not update PATH"));
      const dedupedLines = dedupeLines([...authHints, ...lines]).slice(-16);
      console.error("[nora main] tool status probe failed", {
        toolId: tool.id,
        title: statusCommand.title,
        error: error instanceof Error ? error.message : String(error),
        lineCount: dedupedLines.length,
        lines: dedupedLines
      });

      return buildCliUsageInfo(tool, `${tool.label} Status Failed`, {
        status: "error",
        lines: dedupedLines.length ? dedupedLines : [error instanceof Error ? error.message : "Unknown error"]
      });
    }
  }

  /** Normalizes captured CLI text into structured windows so the renderer never parses provider output. */
  function buildCliUsageInfo(tool: AgentCatalogEntry, title: string, capture: CliStatusCapture): ToolUsageInfo {
    const { windows, account } = parseCliUsageLines(capture.lines);
    return createToolUsageInfo({
      status: capture.status,
      title,
      windows,
      account,
      lines: capture.lines,
      ...(capture.status === "error" && !windows.length
        ? { notice: `${tool.label} did not return usage information.` }
        : {}),
      ...(capture.rawOutput ? { rawOutput: capture.rawOutput } : {}),
      fetchedAt: deps.nowIso()
    });
  }

  return { getToolStatusArgs, getCliToolStatus };
}
