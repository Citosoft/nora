import path from "node:path";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

/** OpenBot's Electron data folder, which holds `openbot.db`. */
export function openBotDataDirectory(env: AppImportEnvironment): string {
  if (env.platform === "darwin") return path.join(env.homeDir, "Library", "Application Support", "OpenBot");
  if (env.platform === "win32") return path.join(env.appDataDir ?? path.join(env.homeDir, "AppData", "Roaming"), "OpenBot");
  return path.join(env.xdgConfigHome ?? path.join(env.homeDir, ".config"), "OpenBot");
}

/** Each agent's own folder (`agent-<id>`, `bot-<id>` or `<id>`), with its AGENTS.md and skills. */
export function openBotAgentsDirectory(env: AppImportEnvironment): string {
  return path.join(env.homeDir, "OpenBot", "Agents");
}

export const OPENBOT_DATABASE = "openbot.db";
/** OpenBot's list of servers it connects to, in its data folder. */
export const OPENBOT_REMOTE_SERVERS = "openbot-remote-servers-v1.json";
