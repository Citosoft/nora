import os from "node:os";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

export function currentAppImportEnvironment(): AppImportEnvironment {
  return {
    homeDir: os.homedir(),
    platform: process.platform,
    appDataDir: process.env.APPDATA?.trim() || null,
    xdgConfigHome: process.env.XDG_CONFIG_HOME?.trim() || null,
    variables: { T3CODE_HOME: process.env.T3CODE_HOME, CODEX_HOME: process.env.CODEX_HOME, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR }
  };
}
