import type { AgentDetectionInfo } from "@shared/appTypes";
import { APP_RUNTIME_SETTINGS } from "@shared/constants/appRuntimeSettings";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { countDiffLines } from "./changeDiffUtils";
import {
  detectLocalAgentCatalog,
  detectRemoteAgentCatalog,
  findGitExecutable
} from "./environmentDetection";
import { createForgeRemoteOps } from "./forgeRemote";
import {
  buildGitCommand,
  getGitProgressCommand,
  mapGitArgumentToMountedRemotePath,
  mapMountedRemoteTextToLocal,
  resolveMountedGitTarget
} from "./gitWorkspaceCommandUtils";
import { createWorkspaceGitBindings } from "./gitWorkspaceReads";
import {
  createRemoteGitHelpers,
  normalizeRemoteShellPath,
  normalizeWorkspaceRelativePath,
  shellQuote
} from "./remoteGit";
import { slugify } from "./slug";
import { nowIso } from "./time";
import {
  computeWorkspaceProjectId,
  createGetProjectMetadata,
  getWorkspaceLocation
} from "./workspaceTarget";
import { createWorkspaceDiscoveryHelpers } from "./workspaceDiscovery";
import { detectWorkspaceFramework as detectWorkspaceFrameworkFromPackageJson } from "./workspaceFramework";
import { createWorkspaceOperations } from "./workspace";
import { buildProcessEnv } from "../processEnv";
import { findExecutableOnPath, findExistingPath } from "../processLookup";
import type { WorkspaceTarget } from "../types/internal.types";
import { WORKSPACE_INTERNAL_DIR_NAME } from "../workspaceStatePaths";

const execFileAsync = promisify(execFile);
const forgeRemoteOps = createForgeRemoteOps(countDiffLines);
const {
  fetchForgeOverviewForRepo,
  fetchGitlabUserMergeRequests,
  fetchForgeBranchPullRequestStatusForRepo,
  fetchForgeWorkItemDetail,
  fetchForgeWorkflowRunDetailForRepo,
  performForgeWorkItemActionForRepo,
  addForgeWorkItemCommentForRepo,
  createForgePullRequestForRepo
} = forgeRemoteOps;

const detectLocalAgentCatalogFromEnvironment = (): Promise<AgentDetectionInfo[]> =>
  detectLocalAgentCatalog(findExistingPath);

const findGitExecutableFromEnvironment = (): Promise<string | null> =>
  findGitExecutable(findExistingPath, findExecutableOnPath);
const remoteGitHelpers = createRemoteGitHelpers({
  execFileAsync,
  buildProcessEnv,
  buildGitCommand,
  mapGitArgumentToMountedRemotePath,
  mapMountedRemoteTextToLocal,
  resolveMountedGitTarget,
  getWorkspaceLocation,
  findGitExecutableFromEnvironment,
  detectRemoteAgentCatalog,
  remoteSshCommandTimeoutMs: APP_RUNTIME_SETTINGS.orchestrator.remoteSshCommandTimeoutMs,
  localGitCommandTimeoutMs: APP_RUNTIME_SETTINGS.orchestrator.localGitCommandTimeoutMs
});
const { runRemoteSshCommand, execGit, workspacePathExists, detectRemoteAgentCatalogForTarget } = remoteGitHelpers;

const computeWorkspaceProjectIdWithSlug = (target: WorkspaceTarget, rootPath: string): string =>
  computeWorkspaceProjectId(target, rootPath, slugify);

const {
  getWorkspaceForgeRepo,
  commitWorkspaceChanges,
  pullWorkspaceChanges,
  pushWorkspaceChanges,
  discardWorkspaceChange,
  readCurrentBranch,
  readGitChanges,
  readCommitHistory,
  readProjectBranches,
  readCommitEntry,
  readCommitChanges
} = createWorkspaceGitBindings(execGit);

const {
  addTaskToWorkspaceTaskBoard,
  deleteWorkspaceFile,
  getWorkspaceImageMimeType,
  listWorkspaceNotes,
  listWorkspaceTaskPaths,
  listWorkspaceSpecs,
  listWorkspaceTasks,
  listWorkspaceTrackedAndUntrackedFiles,
  listImportedContextBundles,
  listWorkspaceDirectories,
  createWorkspaceDirectory,
  moveWorkspaceFile,
  readWorkspaceBinaryFile,
  readWorkspaceSplitViewCollection,
  readWorkspaceTaskBoard,
  readWorkspaceTextFile,
  resolveExistingWorkspaceAbsolutePath,
  removeWorkspaceTaskBoardPosition,
  renameWorkspaceTaskBoardPosition,
  searchWorkspaceFiles,
  statWorkspacePath,
  writeWorkspaceSplitViewCollection,
  writeWorkspaceTaskBoard,
  writeWorkspaceBinaryFile,
  writeWorkspaceTextFile
} = createWorkspaceOperations({
  getWorkspaceLocation,
  runRemoteSshCommand,
  normalizeWorkspaceRelativePath,
  normalizeRemoteShellPath,
  shellQuote,
  execGit,
  workspaceInternalDirName: WORKSPACE_INTERNAL_DIR_NAME,
  maxWorkspaceSearchResults: APP_RUNTIME_SETTINGS.orchestrator.maxWorkspaceSearchResults
});

const workspaceDiscoveryHelpers = createWorkspaceDiscoveryHelpers({
  workspacePathExists,
  readWorkspaceTextFile,
  getWorkspaceLocation,
  detectWorkspaceFramework: detectWorkspaceFrameworkFromPackageJson
});
const {
  detectWorkspaceInstructionFile,
  detectWorkspaceScripts,
  detectDefaultWorktreePrepareCommand,
  detectWorkspaceFramework
} = workspaceDiscoveryHelpers;
const getProjectMetadata = createGetProjectMetadata({
  execGit,
  getGitProgressCommand,
  nowIso,
  detectWorkspaceFramework,
  detectWorkspaceInstructionFile,
  computeWorkspaceProjectId: computeWorkspaceProjectIdWithSlug,
  getWorkspaceLocation
});

export {
  addForgeWorkItemCommentForRepo,
  addTaskToWorkspaceTaskBoard,
  commitWorkspaceChanges,
  createForgePullRequestForRepo,
  createWorkspaceDirectory,
  deleteWorkspaceFile,
  detectDefaultWorktreePrepareCommand,
  detectLocalAgentCatalogFromEnvironment,
  detectRemoteAgentCatalogForTarget,
  detectWorkspaceInstructionFile,
  detectWorkspaceScripts,
  execFileAsync,
  execGit,
  fetchForgeBranchPullRequestStatusForRepo,
  fetchForgeOverviewForRepo,
  fetchForgeWorkItemDetail,
  fetchForgeWorkflowRunDetailForRepo,
  fetchGitlabUserMergeRequests,
  getProjectMetadata,
  getWorkspaceForgeRepo,
  getWorkspaceImageMimeType,
  listImportedContextBundles,
  listWorkspaceDirectories,
  listWorkspaceNotes,
  listWorkspaceSpecs,
  listWorkspaceTaskPaths,
  listWorkspaceTasks,
  listWorkspaceTrackedAndUntrackedFiles,
  moveWorkspaceFile,
  performForgeWorkItemActionForRepo,
  pullWorkspaceChanges,
  pushWorkspaceChanges,
  discardWorkspaceChange,
  readCommitChanges,
  readCommitEntry,
  readCommitHistory,
  readCurrentBranch,
  readGitChanges,
  readProjectBranches,
  readWorkspaceBinaryFile,
  readWorkspaceSplitViewCollection,
  readWorkspaceTaskBoard,
  readWorkspaceTextFile,
  removeWorkspaceTaskBoardPosition,
  renameWorkspaceTaskBoardPosition,
  resolveExistingWorkspaceAbsolutePath,
  runRemoteSshCommand,
  searchWorkspaceFiles,
  statWorkspacePath,
  writeWorkspaceBinaryFile,
  writeWorkspaceSplitViewCollection,
  writeWorkspaceTaskBoard,
  writeWorkspaceTextFile
};
