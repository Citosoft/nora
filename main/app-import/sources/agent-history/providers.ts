import path from "node:path";
import { claudeDesktopDirectory } from "@main/providers/claude/desktopSessions";
import { claudeHistoryListers, codexHistoryListers, codexSessionsDirectory } from "./listers";
import { createAgentHistorySource } from "./source";

export const claudeSource = createAgentHistorySource({
  id: "claude",
  dataDirectories: (env) => [path.join(env.variables.CLAUDE_CONFIG_DIR?.trim() || path.join(env.homeDir, ".claude"), "projects"), claudeDesktopDirectory()],
  listers: claudeHistoryListers
});

export const codexSource = createAgentHistorySource({ id: "codex", dataDirectories: (env) => [codexSessionsDirectory(env)], listers: codexHistoryListers });
