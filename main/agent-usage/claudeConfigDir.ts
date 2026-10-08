import os from "node:os";
import path from "node:path";

/** Claude Code's config root (`CLAUDE_CONFIG_DIR`, else `~/.claude`): transcripts, credentials, and settings live here. */
export const resolveClaudeConfigDir = (env: NodeJS.ProcessEnv = process.env): string =>
  env.CLAUDE_CONFIG_DIR?.trim() || path.join(os.homedir(), ".claude");
