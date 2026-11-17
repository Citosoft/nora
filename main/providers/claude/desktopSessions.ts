import { readFile, readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { ClaudeDesktopSession } from "@main/types/execution/claudeDesktop.types";

export const desktopSessionSchema = z.object({
  sessionId: z.string().startsWith("local_"), cliSessionId: z.string().uuid(), cwd: z.string().min(1),
  title: z.string().optional(), createdAt: z.number().nonnegative(), lastActivityAt: z.number().nonnegative().optional(),
  lastFocusedAt: z.number().nonnegative().optional(), isArchived: z.boolean().optional()
});

export function claudeDesktopDirectory(): string {
  const root = process.platform === "darwin" ? join(homedir(), "Library", "Application Support")
    : process.platform === "win32" ? process.env.APPDATA ?? join(homedir(), "AppData", "Roaming")
    : process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(root, "Claude", "claude-code-sessions");
}

/** Desktop's account/organization index identifies local Code sessions, not regular Claude chats or cloud sessions. */
export async function readClaudeDesktopSessions(directory: string): Promise<ClaudeDesktopSession[]> {
  const sessions: ClaudeDesktopSession[] = [];
  const visit = async (folder: string, depth: number): Promise<void> => {
    const entries = await readdir(folder, { withFileTypes: true }).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
      throw error;
    });
    for (const entry of entries) {
      const file = join(folder, entry.name);
      if (entry.isDirectory() && depth < 2) await visit(file, depth + 1);
      else if (entry.isFile() && entry.name.startsWith("local_") && entry.name.endsWith(".json")) {
        try {
          const parsed = desktopSessionSchema.safeParse(JSON.parse(await readFile(file, "utf8")));
          if (parsed.success) sessions.push(parsed.data);
        } catch { /* A removed or incomplete index entry must not hide other sessions. */ }
      }
    }
  };
  await visit(directory, 0);
  return sessions;
}
