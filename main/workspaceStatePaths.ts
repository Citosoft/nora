import { DEFAULT_APP_SETTINGS, type AppSettings, type WorkspaceStateStorageMode } from "@shared/appTypes";
import fs from "node:fs";
import path from "node:path";
import { getAppSettingsPath, getProjectDir } from "./noraPaths";
import type { WorkspaceTarget } from "./types/internal.types";

export const WORKSPACE_INTERNAL_DIR_NAME = ".nora";
export const WORKSPACE_SPLIT_VIEWS_PATH = `${WORKSPACE_INTERNAL_DIR_NAME}/split-views.json`;
const HOME_WORKSPACE_STATE_ROOT_DIR = "workspace-root";

export function getWorkspaceStateStorageMode(appSettings: AppSettings): WorkspaceStateStorageMode {
  return appSettings.workspaceStateStorageMode;
}

export function loadWorkspaceStateStorageMode(): WorkspaceStateStorageMode {
  try {
    const raw = fs.readFileSync(getAppSettingsPath(), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const candidate = parsed as Partial<AppSettings>;
      if (candidate.workspaceStateStorageMode === "home" || candidate.workspaceStateStorageMode === "repo") {
        return candidate.workspaceStateStorageMode;
      }
    }
  } catch {}

  return DEFAULT_APP_SETTINGS.workspaceStateStorageMode;
}

export function getWorkspaceStateHostRoot(
  target: WorkspaceTarget,
  projectId: string,
  storageMode: WorkspaceStateStorageMode
): string {
  if (storageMode === "repo") {
    return target.path;
  }

  if (target.location?.kind === "ssh") {
    return path.posix.join("$HOME", WORKSPACE_INTERNAL_DIR_NAME, "projects", projectId, HOME_WORKSPACE_STATE_ROOT_DIR);
  }

  return path.join(getProjectDir(projectId), HOME_WORKSPACE_STATE_ROOT_DIR);
}

export function getWorkspaceStateAbsolutePath(
  target: WorkspaceTarget,
  projectId: string,
  storageMode: WorkspaceStateStorageMode,
  relativePath: string
): string {
  const root = getWorkspaceStateHostRoot(target, projectId, storageMode);
  return target.location?.kind === "ssh"
    ? path.posix.join(root.replace(/\\/g, "/"), relativePath.replace(/\\/g, "/"))
    : path.join(root, relativePath);
}
