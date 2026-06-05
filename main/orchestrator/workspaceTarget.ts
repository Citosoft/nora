import type { ProjectSummary, WorkspaceLocation } from "@shared/appTypes";
import { createHash } from "node:crypto";
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

export function createGetProjectMetadata(deps: ProjectMetadataDependencies) {
  return async (
    target: WorkspaceTarget,
    reporter?: (detail: string, command: string) => Promise<void> | void
  ): Promise<ProjectSummary> => {
    await reporter?.("Checking repository root...", await deps.getGitProgressCommand(target, ["rev-parse", "--show-toplevel"]));
    const { stdout: topLevel } = await deps.execGit(target, ["rev-parse", "--show-toplevel"]);
    await reporter?.("Reading current branch...", await deps.getGitProgressCommand(target, ["rev-parse", "--abbrev-ref", "HEAD"]));
    const branchName = await readCurrentBranchName(target, deps.execGit);
    await reporter?.("Resolving git common dir...", await deps.getGitProgressCommand(target, ["rev-parse", "--git-common-dir"]));
    const { stdout: gitCommonDirStdout } = await deps.execGit(target, ["rev-parse", "--git-common-dir"]);

    const rootPath = topLevel.trim();
    const timestamp = deps.nowIso();
    const location = deps.getWorkspaceLocation(target);
    await reporter?.("Inspecting framework metadata...", "read package.json");
    const framework = await deps.detectWorkspaceFramework({ ...target, path: rootPath, location });
    await reporter?.("Detecting workspace instructions...", "check AGENTS.md");
    const workspaceInstructionFile = await deps.detectWorkspaceInstructionFile({ ...target, path: rootPath, location });

    return {
      id: deps.computeWorkspaceProjectId({ ...target, path: rootPath, location }, rootPath),
      name: path.posix.basename(rootPath.replace(/\\/g, "/")) || path.basename(rootPath),
      rootPath,
      gitCommonDir: location.kind === "ssh" ? gitCommonDirStdout.trim() : path.resolve(rootPath, gitCommonDirStdout.trim()),
      location,
      workspaceTerminalPresets: [],
      baseBranch: branchName,
      workspaceInstructionFile,
      framework,
      platform: location.kind === "ssh" ? "ssh" : process.platform,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp
    };
  };
}
