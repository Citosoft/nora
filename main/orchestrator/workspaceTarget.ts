import type { ProjectSummary, WorkspaceLocation } from "@shared/appTypes";
import { createMissingProjectFolderError } from "@shared/projectFolderErrors";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { WorkspaceTarget } from "../types/internal.types";

type ProjectMetadataDependencies = {
  execGit: (target: WorkspaceTarget, args: string[]) => Promise<{ stdout: string; stderr: string }>;
  getGitProgressCommand: (target: WorkspaceTarget, args: string[]) => Promise<string>;
  nowIso: () => string;
  detectWorkspaceFramework: (target: WorkspaceTarget) => Promise<ProjectSummary["framework"]>;
  detectWorkspaceInstructionFile: (target: WorkspaceTarget) => Promise<ProjectSummary["workspaceInstructionFile"]>;
  computeWorkspaceProjectId: (target: WorkspaceTarget, rootPath: string) => string;
  getWorkspaceLocation: (target: WorkspaceTarget) => WorkspaceLocation;
  projectFolderExists: (target: WorkspaceTarget) => Promise<boolean>;
};

function isUnbornHeadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("ambiguous argument 'HEAD'") || message.includes("unknown revision or path not in the working tree");
}

async function readCurrentBranchName(
  target: WorkspaceTarget,
  execGit: ProjectMetadataDependencies["execGit"]
): Promise<string> {
  try {
    const { stdout } = await execGit(target, ["rev-parse", "--abbrev-ref", "HEAD"]);
    return stdout.trim();
  } catch (error) {
    if (!isUnbornHeadError(error)) {
      throw error;
    }

    const { stdout } = await execGit(target, ["symbolic-ref", "--short", "HEAD"]);
    return stdout.trim() || "main";
  }
}

export function getWorkspaceLocation(target: WorkspaceTarget): WorkspaceLocation {
  return target.location || { kind: "local" };
}

/**
 * Local folders are checked directly. SSH folders report true so the remote git call surfaces
 * connection problems instead of being misreported as a deleted folder.
 */
export async function localProjectFolderExists(target: WorkspaceTarget): Promise<boolean> {
  if (getWorkspaceLocation(target).kind === "ssh") {
    return true;
  }
  return fs.stat(target.path).then((stats) => stats.isDirectory(), () => false);
}

export function getWorkspaceScope(target: WorkspaceTarget, rootPath = target.path): string {
  const location = getWorkspaceLocation(target);
  if (location.kind === "ssh") {
    return `${location.user}@${location.host}:${location.port || 22}:${rootPath}`;
  }
  return rootPath;
}

export function sameWorkspaceLocation(left?: WorkspaceLocation, right?: WorkspaceLocation): boolean {
  const normalizedLeft = left || { kind: "local" as const };
  const normalizedRight = right || { kind: "local" as const };

  if (normalizedLeft.kind !== normalizedRight.kind) {
    return false;
  }

  if (normalizedLeft.kind === "local" && normalizedRight.kind === "local") {
    return true;
  }

  if (normalizedLeft.kind === "ssh" && normalizedRight.kind === "ssh") {
    return (
      normalizedLeft.host === normalizedRight.host &&
      normalizedLeft.user === normalizedRight.user &&
      (normalizedLeft.port || null) === (normalizedRight.port || null) &&
      normalizedLeft.remotePath === normalizedRight.remotePath
    );
  }

  return false;
}

export function computeWorkspaceProjectId(
  target: WorkspaceTarget,
  rootPath: string,
  slugify: (value: string) => string
): string {
  const normalizedName = path.posix.basename(rootPath.replace(/\\/g, "/")) || path.basename(rootPath);
  const name = slugify(normalizedName) || "project";
  const hash = createHash("sha1").update(getWorkspaceScope(target, rootPath)).digest("hex").slice(0, 8);
  return `${name}-${hash}`;
}

export function mergePersistedProjectSummary(
  baseProject: ProjectSummary,
  persistedProject?: ProjectSummary | null
): ProjectSummary {
  if (!persistedProject) {
    return baseProject;
  }

  return {
    ...baseProject,
    createdAt: persistedProject.createdAt || baseProject.createdAt,
    workspaceTerminalPresets: persistedProject.workspaceTerminalPresets ?? baseProject.workspaceTerminalPresets
  };
}

function isNotGitRepositoryError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("not a git repository");
}

type GitProjectInfo = Pick<ProjectSummary, "versionControl" | "rootPath" | "gitCommonDir" | "baseBranch">;

export function createGetProjectMetadata(deps: ProjectMetadataDependencies) {
  async function readGitProjectInfo(
    target: WorkspaceTarget,
    reporter?: (detail: string, command: string) => Promise<void> | void
  ): Promise<GitProjectInfo> {
    await reporter?.("Checking repository root...", await deps.getGitProgressCommand(target, ["rev-parse", "--show-toplevel"]));
    let topLevel: string;
    try {
      topLevel = (await deps.execGit(target, ["rev-parse", "--show-toplevel"])).stdout.trim();
    } catch (error) {
      if (!isNotGitRepositoryError(error)) {
        throw error;
      }
      const location = deps.getWorkspaceLocation(target);
      return {
        versionControl: "none",
        rootPath: location.kind === "ssh" ? target.path : path.resolve(target.path),
        gitCommonDir: "",
        baseBranch: ""
      };
    }
    await reporter?.("Reading current branch...", await deps.getGitProgressCommand(target, ["rev-parse", "--abbrev-ref", "HEAD"]));
    const baseBranch = await readCurrentBranchName(target, deps.execGit);
    await reporter?.("Resolving git common dir...", await deps.getGitProgressCommand(target, ["rev-parse", "--git-common-dir"]));
    const { stdout: gitCommonDirStdout } = await deps.execGit(target, ["rev-parse", "--git-common-dir"]);
    const gitCommonDir = gitCommonDirStdout.trim();
    return {
      versionControl: "git",
      rootPath: topLevel,
      gitCommonDir: deps.getWorkspaceLocation(target).kind === "ssh" ? gitCommonDir : path.resolve(topLevel, gitCommonDir),
      baseBranch
    };
  }

  return async (
    target: WorkspaceTarget,
    reporter?: (detail: string, command: string) => Promise<void> | void
  ): Promise<ProjectSummary> => {
    // Checked first so a deleted folder is not mistaken for a git failure or a plain folder.
    if (!(await deps.projectFolderExists(target))) {
      throw createMissingProjectFolderError(target.path);
    }
    const gitInfo = await readGitProjectInfo(target, reporter);
    const { rootPath } = gitInfo;
    const timestamp = deps.nowIso();
    const location = deps.getWorkspaceLocation(target);
    await reporter?.("Inspecting framework metadata...", "read package.json");
    const framework = await deps.detectWorkspaceFramework({ ...target, path: rootPath, location });
    await reporter?.("Detecting workspace instructions...", "check AGENTS.md");
    const workspaceInstructionFile = await deps.detectWorkspaceInstructionFile({ ...target, path: rootPath, location });

    return {
      id: deps.computeWorkspaceProjectId({ ...target, path: rootPath, location }, rootPath),
      name: path.posix.basename(rootPath.replace(/\\/g, "/")) || path.basename(rootPath),
      ...gitInfo,
      location,
      workspaceTerminalPresets: [],
      workspaceInstructionFile,
      framework,
      platform: location.kind === "ssh" ? "ssh" : process.platform,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp
    };
  };
}
