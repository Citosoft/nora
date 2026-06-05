import type { AppState, CreateProjectWorkspacePayload, CreateProjectWorkspaceResult } from "@shared/appTypes";
import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { dialog, type BrowserWindow } from "electron";

const execFileAsync = promisify(execFile);
const PROJECT_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,79}$/;

export interface ProjectWorkspaceCreationDeps {
  getMainWindow: () => BrowserWindow | null;
  getSnapshot: () => AppState;
  compactStateForRenderer: (snapshot: AppState) => AppState;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
  selectProject: (projectRoot: string) => Promise<AppState>;
}

function normalizeProjectDirectoryName(projectName: string): string {
  const normalized = projectName.trim().replace(/\s+/g, "-");
  if (!normalized) {
    throw new Error("Project name is required.");
  }
  if (!PROJECT_NAME_PATTERN.test(normalized) || normalized === "." || normalized === "..") {
    throw new Error("Project name can use letters, numbers, spaces, dots, underscores, and hyphens.");
  }

  return normalized;
}

export async function createProjectWorkspace(
  payload: CreateProjectWorkspacePayload,
  deps: ProjectWorkspaceCreationDeps
): Promise<CreateProjectWorkspaceResult> {
  const mainWindow = deps.getMainWindow();
  if (!mainWindow) {
    return {
      state: deps.compactStateForRenderer(deps.getSnapshot()),
      projectRoot: null
    };
  }

  const projectDirectoryName = normalizeProjectDirectoryName(payload.projectName);
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose where to create the project",
    properties: ["openDirectory", "createDirectory"]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return {
      state: deps.compactStateForRenderer(deps.getSnapshot()),
      projectRoot: null
    };
  }

  const parentPath = result.filePaths[0];
  const projectPath = path.join(parentPath, projectDirectoryName);
  await mkdir(projectPath, { recursive: false });
  await execFileAsync("git", ["init"], { cwd: projectPath, timeout: 30_000 });

  return {
    state: await deps.withSnapshot(() => deps.selectProject(projectPath)),
    projectRoot: projectPath
  };
}
