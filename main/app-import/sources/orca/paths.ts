import path from "node:path";
import type { AppImportEnvironment } from "@main/types/app-import/appImportSource.types";

/** Electron `userData` for Orca on each platform. */
export function orcaUserDataDirectory(env: AppImportEnvironment): string {
  if (env.platform === "darwin") return path.join(env.homeDir, "Library", "Application Support", "orca");
  if (env.platform === "win32") return path.join(env.appDataDir ?? path.join(env.homeDir, "AppData", "Roaming"), "orca");
  return path.join(env.xdgConfigHome ?? path.join(env.homeDir, ".config"), "orca");
}

/** User keybinding overrides live outside userData (orca src/main/keybindings/keybinding-file.ts). */
export function orcaKeybindingsFile(env: AppImportEnvironment): string {
  return path.join(env.homeDir, ".orca", "keybindings.json");
}

export const ORCA_PROFILE_INDEX_FILE = "orca-profile-index.json";
export const ORCA_PROFILE_STATE_DATABASE = "profile-state.db";
export const ORCA_DATA_FILE = "orca-data.json";
/** Orca keeps `orca-data.json.bak.0` … `.bak.4` (LEGACY_BACKUP_COUNT). */
export const ORCA_DATA_BACKUP_COUNT = 5;
/** Highest profile-state.db `user_version` this reader understands. */
export const ORCA_PROFILE_STATE_SCHEMA_VERSION = 3;
