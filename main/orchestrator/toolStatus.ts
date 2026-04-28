import type { AgentCatalogEntry } from "@shared/appTypes";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildProcessEnv } from "../processEnv";
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

async function readCodexAuthHints(): Promise<string[]> {
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
    return hints;
  } catch {
    console.warn("[nora main] codex auth hint read failed", { authPath });
    return [];
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

async function readClaudeAuthHints(): Promise<string[]> {
  const configPath = path.join(os.homedir(), ".claude.json");
  try {
    console.log("[nora main] claude auth hint read start", { configPath });
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const userId = asString(parsed.userID);
    const hints = userId ? [`User ID: ${userId}`] : [];
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
  function getToolStatusArgs(toolId: string): { title: string; args: string[] } | null {
    if (toolId === "codex") {
      return { title: "Codex CLI Usage", args: [] };
    }
    if (toolId === "gemini") {
      return { title: "Gemini CLI Status", args: ["--version"] };
    }
    if (toolId === "claude") {
      return { title: "Claude CLI Status", args: ["--version"] };
    }
    if (toolId === "cursor") {
      return { title: "Cursor Agent Status", args: ["status"] };
    }
    return null;
  }

  async function getAuthHints(toolId: string): Promise<string[]> {
    if (toolId === "codex") {
      return readCodexAuthHints();
    }
    if (toolId === "gemini") {
      return readGeminiAuthHints();
    }
    if (toolId === "claude") {
      return readClaudeAuthHints();
    }
    return [];
  }

  async function getCliToolStatus(tool: AgentCatalogEntry) {
    const statusCommand = getToolStatusArgs(tool.id);
    if (!statusCommand) {
      console.log("[nora main] tool status skipped", {
        toolId: tool.id,
        reason: "no-status-command"
      });
      return null;
    }

    const authHints = await getAuthHints(tool.id);
    const shellCommand = [tool.detectedCommand || tool.id, ...statusCommand.args].join(" ");
    console.log("[nora main] tool status probe start", {
      toolId: tool.id,
      title: statusCommand.title,
      shellCommand,
      authHintCount: authHints.length
    });

    if (tool.id === "codex") {
      const interactiveStatus = await deps.getInteractiveCodexStatus(statusCommand.title, tool);
      const dedupedLines = dedupeLines([...authHints, ...interactiveStatus.lines]).slice(-24);
      console.log("[nora main] tool status probe success", {
        toolId: tool.id,
        title: statusCommand.title,
        lineCount: dedupedLines.length,
        lines: dedupedLines,
        source: "interactive-status"
      });
      return {
        ...interactiveStatus,
        lines: dedupedLines
      };
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
      return {
        status: "available" as const,
        title: statusCommand.title,
        lines: dedupedLines.length ? dedupedLines : [`${tool.label} returned no status output.`],
        fetchedAt: deps.nowIso()
      };
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

      return {
        status: "error" as const,
        title: `${tool.label} Status Failed`,
        lines: dedupedLines.length ? dedupedLines : [error instanceof Error ? error.message : "Unknown error"],
        fetchedAt: deps.nowIso()
      };
    }
  }

  return { getToolStatusArgs, getCliToolStatus };
}
