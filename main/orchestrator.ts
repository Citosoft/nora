import type {
  AgentContextPreview,
  AgentSession,
  AppState,
  CommitChangesPayload,
  CreateAgentPayload,
  CreateTerminalPayload,
  LocalTerminalState,
  ProjectSummary,
  SessionRecord,
  TerminalSession,
  ToolUsageInfo,
  WorkspaceSummary,
  WorktreeRecord
} from "@shared/appTypes";
import { APP_RUNTIME_SETTINGS } from "@shared/constants/appRuntimeSettings";
import { spawn as spawnPty } from "node-pty";
import { spawn as spawnChild } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import { AGENT_DEFINITIONS, SHARED_AGENT_SKILLS_TOOL_ID, getDefaultToolCommand } from "./agentCatalog";
import { installAgentSkill as installGlobalAgentSkill, readAgentSkillCatalogs, removeAgentSkill as removeGlobalAgentSkill, searchAgentSkills } from "./agentSkills";
import { getProjectsDir, getWorktreeDir } from "./noraPaths";
import { hasBusyTerminalActivity } from "./orchestrator/agentBusyActivity";
import { buildAgentLaunchCommand, normalizeAgentLaunchCommand } from "./orchestrator/agentLaunch";
import { prepareLoopRunWorktree } from "./loops/prepareLoopRunWorktree";
import type { PreparedLoopRunWorktree, PrepareLoopRunWorktreeInput } from "./types/prepareLoopRunWorktree.types";
import { createInitialState } from "./orchestrator/createAppInitialState";
import { createForgeHelpers } from "./orchestrator/forge";
import { getGitProgressCommand, normalizeLocalPath } from "./orchestrator/gitWorkspaceCommandUtils";
import { createLocalTerminalHelpers } from "./orchestrator/localTerminal";
import { getWorktreeArtifactPaths } from "./orchestrator/artifactPaths";
import { summarizeChanges } from "./orchestrator/changeDiffUtils";
import { buildAgentCatalog, detectTerminalShells } from "./orchestrator/environmentDetection";
import {
  describeGitTimeout,
  getExecStdout,
  isExecTimeoutError
} from "./orchestrator/execErrors";
import {
  findRemoteMountForPath,
  isWindowsUncPath,
  pathIsWithinAnyMount
} from "./orchestrator/pathMountUtils";
import { readStoredProjectFiles } from "./orchestrator/readStoredProjects";
import {
  buildResumeCommand,
  extractResumeDetails
} from "./orchestrator/resumeCommandUtils";
import { slugify } from "./orchestrator/slug";
import { detectLocalUrlFromOutput, didReturnToShellPrompt } from "./orchestrator/terminalOutputDetect";
import { delay, futureIso, nowIso } from "./orchestrator/time";
import { createPersistenceHelpers } from "./orchestrator/persistence";
import { reconcileWorkspaceAgentsAfterCatalogRefresh } from "./orchestrator/agentCatalogReconciliation";
import { createProjectOpenHelpers } from "./orchestrator/projectOpen";
import { createRuntimeHelpers } from "./orchestrator/runtime";
import { createSessionCreationHelpers } from "./orchestrator/sessionCreation";
import { createSessionLifecycleHelpers } from "./orchestrator/sessionLifecycle";
import {
  getInstallCommandExecution,
  getPtyEnv,
  getPtyShellArgs,
  getShell,
  getShellArgs,
  getShellArgsForExecutable,
  hasShellMetacharacters,
  isWindows,
  parseCommandArgs
} from "./orchestrator/shell";
import {
  commitChangesWithValidation,
  getActiveChangesRoot,
  pullChangesWithValidation,
  pushChangesWithValidation,
  stopAllAgents as stopAllAgentsAction
} from "./orchestrator/sessionActions";
import { createWorkspaceActions } from "./orchestrator/workspaceActions";
import {
  createCachedAgentTerminalActionsDependencies,
  createCachedSessionActionsDependencies,
  createCachedWorkspaceActions
} from "./orchestrator/orchestratorActionBuilders";
import {
  createAgentTerminalActionDependencyMap,
  createSessionActionDependencyMap,
  createWorkspaceActionDependencyMap
} from "./orchestrator/actionDependencyMaps";
import { createOrchestratorStores } from "./orchestrator/orchestratorStores";
import { createServicesBridge } from "./orchestrator/servicesBridge";
import { OrchestratorLifecycleService } from "./orchestrator/orchestratorLifecycleService";
import {
  getProjectTarget as getProjectTargetForSummary,
  getWorktreeTarget as getWorktreeTargetForSummary,
  resolveWorkspaceFileTarget as resolveWorkspaceFileTargetFromState
} from "./orchestrator/workspacePathResolution";
import {
  resolveTerminalShellFromList
} from "./orchestrator/runtimeFacade";
import { buildDomainMainServicesFromOrchestrator } from "./orchestrator/domainMainServices/buildDomainMainServicesFromOrchestrator";
import { ForgeMainService } from "./orchestrator/domainMainServices/forgeMainService";
import { SessionMainService } from "./orchestrator/domainMainServices/sessionMainService";
import { SnapshotMainService } from "./orchestrator/domainMainServices/snapshotMainService";
import { ToolingMainService } from "./orchestrator/domainMainServices/toolingMainService";
import { WorkspaceMainService } from "./orchestrator/domainMainServices/workspaceMainService";
import { buildAgentTerminalActionsDependencies, buildSessionActionsDependencies } from "./orchestrator/dependencyBuilders";
import {
  getWorkspaceLocation,
  mergePersistedProjectSummary,
  sameWorkspaceLocation
} from "./orchestrator/workspaceTarget";
import { normalizeRemoteShellPath, shellQuote } from "./orchestrator/remoteGit";
import {
  getLastMeaningfulAgentOutputLine,
  getLastMeaningfulTerminalLine
} from "./orchestrator/terminalLineExtraction";
import { SessionRuntimeCoordinator } from "./orchestrator/sessionRuntimeCoordinator";
import { StateGateway } from "./orchestrator/stateGateway";
import { ToolingCoordinator } from "./orchestrator/toolingCoordinator";
import { ToolingRuntimeService } from "./orchestrator/toolingRuntimeService";
import { WorkspaceStateCoordinator } from "./orchestrator/workspaceStateCoordinator";
import { WorkspaceStateService } from "./orchestrator/workspaceStateService";
import { OrchestratorWorkspaceReadSurface } from "./orchestrator/workspaceReadSurface";
import { createTerminalStateHelpers } from "./orchestrator/terminalState";
import { TerminalMutationFacade } from "./orchestrator/terminalMutationFacade";
import { createToolingHelpers } from "./orchestrator/tooling";
import { createToolStatusHelpers } from "./orchestrator/toolStatus";
import { createTranscriptHelpers } from "./orchestrator/transcripts";
import { createWorkspaceLifecycleHelpers } from "./orchestrator/workspaceLifecycle";
import { createWorkspaceMutationHelpers } from "./orchestrator/workspaceMutations";
import { createWorkspaceNavigationHelpers } from "./orchestrator/workspaceNavigation";
import { createWorkspaceRefreshHelpers } from "./orchestrator/workspaceRefresh";
import { createWorktreeHelpers } from "./orchestrator/worktrees";
import { createWorktreeSelectionHelpers } from "./orchestrator/worktreeSelection";
import { findSshExecutable, readActiveRemoteMounts, resolveRemotePayload } from "./remoteMounts";

import {
  addForgeWorkItemCommentForRepo,
  addTaskToWorkspaceTaskBoard,
  commitWorkspaceChanges,
  createForgePullRequestForRepo,
  createWorkspaceDirectory,
  deleteWorkspaceFile,
  detectDefaultWorktreePrepareCommand,
  detectLocalAgentCatalogFromEnvironment,
  detectRemoteAgentCatalogForTarget,
  invalidateLocalAgentDetectionCache,
  peekLocalAgentCatalogDetections,
  resolveLocalAgentCatalogFromEnvironment,
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
  listWorkspaceDirectories,
  listWorkspaceNotes,
  listWorkspaceSpecs,
  listWorkspaceTaskPaths,
  listWorkspaceTasks,
  listImportedContextBundles,
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
} from "./orchestrator/orchestratorModuleScope";

import { type MainServices } from "./services/mainServices";
import { StateStore } from "./stateStore";
import type { ProjectIndexStore } from "./projectIndexStore";
import type { RecentProjectsStore } from "./recentProjectsStore";
import type { SessionIndexStore } from "./sessionIndexStore";
import type { ToolConfigStore } from "./toolConfigStore";
import type {
  OrchestratorOptions,
  WorkspaceTarget
} from "./types/internal.types";
import type { OrchestratorFacade } from "./types/orchestratorFacade.types";
import type { SessionCreationHelpers } from "./types/orchestratorSessionCreation.types";
import type { TerminalStateHelpers } from "./types/orchestratorTerminalState.types";
import type { WorkspaceLifecycleHelpers } from "./types/orchestratorWorkspaceLifecycle.types";
import type { WorkspaceMutationHelpers } from "./types/orchestratorWorkspaceMutations.types";
import type { WorkspaceNavigationHelpers } from "./types/orchestratorWorkspaceNavigation.types";
import type { WorktreeSelectionHelpers } from "./types/orchestratorWorktreeSelection.types";

export class Orchestrator implements OrchestratorFacade {
  private readonly store = new StateStore<AppState>(createInitialState());
  private readonly stateGateway = new StateGateway(this.store);
  private readonly sessionRuntime = new SessionRuntimeCoordinator();
  private readonly workspaceState = new WorkspaceStateCoordinator();
  private readonly toolingState = new ToolingCoordinator();
  private readonly workspaceStateService = new WorkspaceStateService(this.workspaceState);
  private readonly toolingRuntimeService = new ToolingRuntimeService(() => this.toolingState.getToolConfigs());
  private readonly recentProjectsStore: RecentProjectsStore;
  private readonly toolConfigStore: ToolConfigStore;
  private readonly projectIndexStore: ProjectIndexStore;
  private readonly sessionIndexStore: SessionIndexStore;
  private readonly onWorkspaceLoadingProgress?: (payload: { projectId: string; detail: string; command: string | null }) => void;
  private readonly onLocalTerminalChanged?: (state: LocalTerminalState | null) => void;
  private readonly workspaceNavigationHelpers: WorkspaceNavigationHelpers;
  private readonly worktreeHelpers: ReturnType<typeof createWorktreeHelpers>;
  private readonly worktreeSelectionHelpers: WorktreeSelectionHelpers;
  private readonly terminalStateHelpers: TerminalStateHelpers;
  private readonly runtimeHelpers: ReturnType<typeof createRuntimeHelpers>;
  private readonly transcriptHelpers: ReturnType<typeof createTranscriptHelpers>;
  private readonly sessionLifecycleHelpers: ReturnType<typeof createSessionLifecycleHelpers>;
  private readonly persistenceHelpers: ReturnType<typeof createPersistenceHelpers>;
  private readonly projectOpenHelpers: ReturnType<typeof createProjectOpenHelpers>;
  private readonly workspaceRefreshHelpers: ReturnType<typeof createWorkspaceRefreshHelpers>;
  private readonly toolingHelpers: ReturnType<typeof createToolingHelpers>;
  private readonly forgeHelpers: ReturnType<typeof createForgeHelpers>;
  private readonly localTerminalHelpers: ReturnType<typeof createLocalTerminalHelpers>;
  private readonly toolStatusHelpers: ReturnType<typeof createToolStatusHelpers>;
  private readonly sessionCreationHelpers: SessionCreationHelpers;
  private readonly workspaceMutationHelpers: WorkspaceMutationHelpers;
  private readonly workspaceLifecycleHelpers: WorkspaceLifecycleHelpers;
  private readonly lifecycleService: OrchestratorLifecycleService;
  private readonly terminalMutationFacade: TerminalMutationFacade;
  private workspaceActionsCache: ReturnType<typeof createWorkspaceActions> | null = null;
  private sessionActionsDependenciesCache: ReturnType<typeof buildSessionActionsDependencies> | null = null;
  private agentTerminalActionsDependenciesCache: ReturnType<typeof buildAgentTerminalActionsDependencies> | null = null;
  private activeVercelRuntimeLogStreamAbortController: AbortController | null = null;
  private readonly workspaceReadSurface: OrchestratorWorkspaceReadSurface;
  private readonly workspaceMainService: WorkspaceMainService;
  private readonly sessionMainService: SessionMainService;
  private readonly toolingMainService: ToolingMainService;
  private readonly forgeMainService: ForgeMainService;

  constructor(options: OrchestratorOptions) {
    const stores = createOrchestratorStores(options);
    this.recentProjectsStore = stores.recentProjectsStore;
    this.toolConfigStore = stores.toolConfigStore;
    this.projectIndexStore = stores.projectIndexStore;
    this.sessionIndexStore = stores.sessionIndexStore;
    this.onWorkspaceLoadingProgress = options.onWorkspaceLoadingProgress;
    this.onLocalTerminalChanged = options.onLocalTerminalChanged;
    this.worktreeHelpers = createWorktreeHelpers({
      nowIso,
      slugify,
      execGit,
      detectWorkspaceScripts,
      readCurrentBranch,
      getProjectTarget: (project) => this.getProjectTarget(project),
      getWorktreeTarget: (project, worktree) => this.getWorktreeTarget(project, worktree),
      findRemoteMountForPath,
      getActiveRemoteMounts: () => this.getSnapshot().activeRemoteMounts,
      sessionIndexSaveState: (state) => this.sessionIndexStore.saveState(state),
      isWindowsUncPath
    });
    this.workspaceNavigationHelpers = createWorkspaceNavigationHelpers({
      getSnapshot: () => this.getSnapshot(),
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      refreshProjectState: () => this.refreshProjectState(),
      openProject: (projectTarget, openOptions) => this.openProject(projectTarget, openOptions),
      getProjectTarget: (project) => this.getProjectTarget(project),
      loadIndexedProjects: () => this.projectIndexStore.load(),
      resolveRemotePayload
    });
    this.worktreeSelectionHelpers = createWorktreeSelectionHelpers({
      nowIso,
      getSnapshot: () => this.getSnapshot(),
      createInitialSessionState: (project) => this.worktreeHelpers.createInitialSessionState(project),
      getOrCreateRootWorktree: (project, session, existingWorktrees) =>
        this.worktreeHelpers.getOrCreateRootWorktree(project, session, existingWorktrees),
      planManagedWorktree: (project, session, agentName, worktreeBranch) =>
        this.worktreeHelpers.planManagedWorktree(project, session, agentName, worktreeBranch),
      createWorktree: (project, session, agentName, plannedWorktree) =>
        this.worktreeHelpers.createWorktree(project, session, agentName, plannedWorktree),
      isWindowsUncPath
    });
    this.transcriptHelpers = createTranscriptHelpers({
      getWriteChain: (agentId) => this.sessionRuntime.getContextWriteChain(agentId),
      setWriteChain: (agentId, chain) => {
        this.sessionRuntime.setContextWriteChain(agentId, chain);
      },
      findAgentByContextFilePath: (contextFilePath) =>
        this.getSnapshot().agents.find((agent) => agent.contextFilePath === contextFilePath) || null
    });
    this.terminalStateHelpers = createTerminalStateHelpers({
      nowIso,
      futureIso,
      getSnapshot: () => this.getSnapshot(),
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      getLocalTerminalState: () => this.sessionRuntime.getLocalTerminalState(),
      setLocalTerminalState: (state) => {
        this.sessionRuntime.setLocalTerminalState(state);
      },
      getTerminalBuffer: (sessionId) => this.sessionRuntime.getTerminalBuffer(sessionId),
      setTerminalBuffer: (sessionId, value) => {
        this.sessionRuntime.setTerminalBuffer(sessionId, value);
      },
      deleteTerminalActivity: (sessionId) => {
        this.sessionRuntime.deleteTerminalActivity(sessionId);
      },
      getTerminalActivity: (sessionId) => this.sessionRuntime.getTerminalActivity(sessionId),
      setTerminalActivity: (sessionId, timestamps) => {
        this.sessionRuntime.setTerminalActivity(sessionId, timestamps);
      },
      setLiveTerminalSnapshot: (terminalId, terminal) => {
        this.sessionRuntime.setLiveTerminalSnapshot(terminalId, terminal);
      },
      appendAgentTerminalChunk: (agent, chunk) => {
        this.transcriptHelpers.appendAgentTerminalChunk(agent, chunk);
      },
      resetAgentTranscriptFile: (agent) => this.transcriptHelpers.resetAgentTranscript(agent),
      emitTerminalData: (sessionId, chunk) => {
        this.sessionRuntime.emitTerminalData(sessionId, chunk);
      },
      notifyLocalTerminalChanged: (state) => {
        this.onLocalTerminalChanged?.(state);
      },
      detectLocalUrlFromOutput,
      didReturnToShellPrompt,
      getLastMeaningfulTerminalLine,
      getLastMeaningfulAgentOutputLine,
      hasBusyTerminalActivity,
      extractResumeDetails,
      buildResumeCommand
    });
    this.terminalMutationFacade = new TerminalMutationFacade(this.terminalStateHelpers, this.transcriptHelpers);
    this.runtimeHelpers = createRuntimeHelpers({
      nowIso,
      findSshExecutable,
      getWorkspaceLocation,
      normalizeRemoteShellPath,
      shellQuote,
      runRemoteSshCommand,
      execFileAsync,
      isWindows,
      hasShellMetacharacters,
      parseCommandArgs,
      getShell,
      getShellArgs,
      getPtyShellArgs,
      getPtyEnv,
      spawnPty,
      spawnChild,
      getShellArgsForExecutable,
      getAgentById: (agentId) => this.getSnapshot().agents.find((item) => item.id === agentId) || null,
      getRuntimeSession: (sessionId) => this.sessionRuntime.getRuntimeSession(sessionId),
      setRuntimeSession: (sessionId, session) => {
        this.sessionRuntime.setRuntimeSession(sessionId, session);
      },
      deleteRuntimeSession: (sessionId) => {
        this.sessionRuntime.deleteRuntimeSession(sessionId);
      },
      updateAgent: (agentId, partial) => {
        this.terminalMutationFacade.updateAgent(agentId, partial);
      },
      updateTerminal: (terminalId, partial) => {
        this.terminalMutationFacade.updateTerminal(terminalId, partial);
      },
      updateLocalTerminal: (partial) => {
        this.terminalMutationFacade.updateLocalTerminal(partial);
      },
      appendAgentOutput: (agentId, chunk) => {
        this.terminalMutationFacade.appendAgentOutput(agentId, chunk);
      },
      appendTerminalOutput: (terminalId, chunk) => {
        this.terminalMutationFacade.appendTerminalOutput(terminalId, chunk);
      },
      appendLocalTerminalOutput: (chunk) => {
        this.terminalMutationFacade.appendLocalTerminalOutput(chunk);
      }
    });
    this.toolStatusHelpers = createToolStatusHelpers({
      nowIso,
      execFileAsync,
      getShell,
      getShellArgs,
      getToolEnv: (toolId) => this.toolingRuntimeService.getToolEnv(toolId),
      getExecStdout,
      getInteractiveCodexStatus: (title, tool) => this.toolingRuntimeService.getInteractiveCodexStatus(title, tool)
    });
    this.sessionLifecycleHelpers = createSessionLifecycleHelpers({
      nowIso,
      normalizeAgentLaunchCommand,
      buildResumeCommand,
      getSnapshot: () => this.getSnapshot(),
      setState: (partial) => {
        this.stateGateway.setState(partial);
      },
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      refreshProjectState: () => this.refreshProjectState(),
      getRuntimeSession: (sessionId) => this.sessionRuntime.getRuntimeSession(sessionId),
      deleteRuntimeSession: (sessionId) => {
        this.sessionRuntime.deleteRuntimeSession(sessionId);
      },
      deleteLiveTerminalSnapshot: (terminalId) => {
        this.sessionRuntime.deleteLiveTerminalSnapshot(terminalId);
      },
      getToolEnv: (toolId) => this.toolingRuntimeService.getToolEnv(toolId),
      resolveTerminalShell: (shellId) =>
        resolveTerminalShellFromList({
          availableShells: this.getSnapshot().terminalShells,
          shellId,
          getShell
        }),
      resetAgentTranscript: (agent) => this.terminalMutationFacade.resetAgentTranscript(agent),
      resetTerminalTranscript: (terminal) => this.terminalMutationFacade.resetTerminalTranscript(terminal),
      appendAgentOutput: (agentId, chunk) => this.terminalMutationFacade.appendAgentOutput(agentId, chunk),
      appendTerminalOutput: (terminalId, chunk) => this.terminalMutationFacade.appendTerminalOutput(terminalId, chunk),
      updateAgent: (agentId, partial) => this.terminalMutationFacade.updateAgent(agentId, partial),
      updateTerminal: (terminalId, partial) => this.terminalMutationFacade.updateTerminal(terminalId, partial),
      spawnAgentPty: (agentId, command, target, toolEnv) => this.runtimeHelpers.spawnAgentPty(agentId, command, target, toolEnv),
      spawnTerminalPty: (terminalId, command, target, shell) => this.runtimeHelpers.spawnTerminalPty(terminalId, command, target, shell),
      detachAgentFromWorktree: (agent) => this.detachAgentFromWorktree(agent),
      detachTerminalFromWorktree: (terminal) => this.detachTerminalFromWorktree(terminal),
      upsertWorktree: (worktrees, worktree) => this.upsertWorktree(worktrees, worktree),
      getProjectTarget: (project) => this.getProjectTarget(project),
      execGit,
      getWorktreeDir,
      setTerminalBuffer: (sessionId, value) => {
        this.sessionRuntime.setTerminalBuffer(sessionId, value);
      },
      deleteTerminalBuffer: (sessionId) => {
        this.sessionRuntime.deleteTerminalBuffer(sessionId);
      },
      deleteTerminalActivity: (sessionId) => {
        this.sessionRuntime.deleteTerminalActivity(sessionId);
      },
      deleteContextWriteChain: (agentId) => {
        this.sessionRuntime.deleteContextWriteChain(agentId);
      }
    });
    this.persistenceHelpers = createPersistenceHelpers({
      nowIso,
      saveProject: async (project) => {
        await this.projectIndexStore.save(project);
      },
      saveSessionState: (state) => this.sessionIndexStore.saveState(state),
      loadRecentProjects: () => this.recentProjectsStore.load(),
      loadIndexedProjects: () => this.projectIndexStore.load(),
      resolveProjectTarget: (projectRoot) => this.resolveProjectTarget(projectRoot),
      getProjectMetadata: (target) => getProjectMetadata(target),
      mergePersistedProjectSummary,
      focusWorkspace: (projectId) => this.focusWorkspace(projectId),
      resolveTerminalShell: (shellId) =>
        resolveTerminalShellFromList({
          availableShells: this.getSnapshot().terminalShells,
          shellId,
          getShell
        }),
      getWorktreeArtifactPaths,
      setTerminalBuffer: (sessionId, value) => {
        this.sessionRuntime.setTerminalBuffer(sessionId, value);
      }
    });
    this.projectOpenHelpers = createProjectOpenHelpers({
      nowIso,
      sameWorkspaceLocation,
      getGitProgressCommand,
      getProjectMetadata,
      mergePersistedProjectSummary,
      readActiveRemoteMounts,
      detectRemoteAgentCatalog: detectRemoteAgentCatalogForTarget,
      detectWorkspaceScripts,
      detectDefaultWorktreePrepareCommand,
      readProjectBranches,
      detectLocalAgentCatalog: detectLocalAgentCatalogFromEnvironment,
      buildAgentCatalog,
      readAgentSkillCatalogs,
      sharedAgentSkillsToolId: SHARED_AGENT_SKILLS_TOOL_ID,
      getSnapshot: () => this.getSnapshot(),
      loadIndexedProjects: () => this.projectIndexStore.load(),
      persistWorkspaceState: (state) => this.persistenceHelpers.persistWorkspaceState(state),
      stopAllAgents: () => this.stopAllAgents(),
      recordRecentProject: (project) => this.recentProjectsStore.record(project),
      saveProject: async (project) => {
        await this.projectIndexStore.save(project);
      },
      loadStatesForProject: (projectId) => this.sessionIndexStore.loadStatesForProject(projectId),
      createInitialSessionState: (project) => this.worktreeHelpers.createInitialSessionState(project),
      getRestorableAgents: (agents) => this.persistenceHelpers.getRestorableAgents(agents),
      getRestorableTerminals: (terminals) => this.persistenceHelpers.getRestorableTerminals(terminals),
      getLiveTerminalSnapshots: () => this.sessionRuntime.getLiveTerminalSnapshots(),
      getProjectTarget: (project) => this.getProjectTarget(project),
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      updateAgent: (agentId, partial) => this.terminalMutationFacade.updateAgent(agentId, partial),
      buildResumeCommand,
      normalizeAgentLaunchCommand,
      resetAgentTranscript: (agent) => this.terminalMutationFacade.resetAgentTranscript(agent),
      getWorktreeTarget: (project, worktree) => this.getWorktreeTarget(project, worktree),
      getToolEnv: (toolId) => this.toolingRuntimeService.getToolEnv(toolId),
      spawnAgentPty: (agentId, command, target, toolEnv) => this.runtimeHelpers.spawnAgentPty(agentId, command, target, toolEnv),
      hasRuntimeSession: (sessionId) => this.sessionRuntime.hasRuntimeSession(sessionId),
      resetTerminalTranscript: (terminal) => this.terminalMutationFacade.resetTerminalTranscript(terminal),
      resolveTerminalShell: (shellId) =>
        resolveTerminalShellFromList({
          availableShells: this.getSnapshot().terminalShells,
          shellId,
          getShell
        }),
      spawnTerminalPty: (terminalId, command, target, shell) => this.runtimeHelpers.spawnTerminalPty(terminalId, command, target, shell),
      refreshProjectState: () => this.refreshProjectState(),
      reportWorkspaceLoadingProgress: (projectId, detail, command) => this.reportWorkspaceLoadingProgress(projectId, detail, command),
      unsuppressWorkspace: (projectRoot, projectId) => this.workspaceStateService.unsuppressWorkspace(projectRoot, projectId),
      toolConfigs: this.toolingState.getToolConfigs()
    });
    this.workspaceRefreshHelpers = createWorkspaceRefreshHelpers({
      nowIso,
      readActiveRemoteMounts,
      getSnapshot: () => this.getSnapshot(),
      setState: (partial) => {
        this.stateGateway.setState(partial);
      },
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      getActiveChangesRoot,
      getProjectTarget: (project) => this.getProjectTarget(project),
      getWorktreeTarget: (project, worktree) => this.getWorktreeTarget(project, worktree),
      readCurrentBranch,
      getGitProgressCommand,
      reportWorkspaceLoadingProgress: (projectId, detail, command) => this.reportWorkspaceLoadingProgress(projectId, detail, command),
      detectWorkspaceScripts,
      detectDefaultWorktreePrepareCommand,
      detectWorkspaceInstructionFile,
      readCommitHistory,
      readProjectBranches,
      readGitChanges,
      normalizeLocalPath,
      summarizeChanges,
      isExecTimeoutError,
      describeGitTimeout,
      readCommitEntry,
      readCommitChanges,
      refreshWorkspaceSummaries: (reason) => this.refreshWorkspaceSummaries(reason),
      loadIndexedProjects: () => this.projectIndexStore.load(),
      loadRecentProjects: () => this.recentProjectsStore.load(),
      readStoredProjectFiles,
      isWorkspaceSuppressed: (project) => this.workspaceStateService.isWorkspaceSuppressed(project),
      isSuppressedWorkspaceRoot: (rootPath) => this.workspaceStateService.isSuppressedWorkspaceRoot(rootPath),
      getProjectMetadata: (target) => getProjectMetadata(target),
      mergePersistedProjectSummary,
      saveAllProjects: (projects) => this.projectIndexStore.saveAll(projects),
      loadStatesForProject: (projectId) => this.sessionIndexStore.loadStatesForProject(projectId),
      getLiveTerminalSnapshots: () => this.sessionRuntime.getLiveTerminalSnapshots()
    });
    this.toolingHelpers = createToolingHelpers({
      nowIso,
      detectRemoteAgentCatalog: detectRemoteAgentCatalogForTarget,
      detectLocalAgentCatalog: detectLocalAgentCatalogFromEnvironment,
      resolveLocalAgentCatalogDetections: resolveLocalAgentCatalogFromEnvironment,
      peekLocalAgentCatalogDetections,
      invalidateLocalAgentDetectionCache,
      buildAgentCatalog,
      getToolConfigs: () => this.toolingState.getToolConfigs(),
      readAgentSkillCatalogs,
      sharedAgentSkillsToolId: SHARED_AGENT_SKILLS_TOOL_ID,
      getSnapshot: () => this.getSnapshot(),
      getProjectTarget: (project) => this.getProjectTarget(project),
      saveProject: async (project) => {
        await this.projectIndexStore.save(project);
      },
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      refreshWorkspaceSummaries: (reason) => this.refreshWorkspaceSummaries(reason),
      getDefaultToolCommand,
      getInstallCommandExecution,
      maxInstallLogLines: APP_RUNTIME_SETTINGS.orchestrator.maxInstallLogLines,
      hasInstallSession: (toolId) => this.toolingState.hasInstallSession(toolId),
      setInstallSession: (toolId, child) => {
        this.toolingState.setInstallSession(toolId, child);
      },
      deleteInstallSession: (toolId) => {
        this.toolingState.deleteInstallSession(toolId);
      },
      updateCatalogTool: (toolId, partial) => this.terminalMutationFacade.updateCatalogTool(toolId, partial),
      installAgentSkill: (toolId, skillReference, onOutput) => installGlobalAgentSkill(toolId, skillReference, onOutput),
      removeAgentSkill: (toolId, skillId) => removeGlobalAgentSkill(toolId, skillId),
      updateAgentSkillCatalog: (catalog) => this.terminalMutationFacade.updateAgentSkillCatalog(catalog),
      saveToolConfigStore: (toolId, values) => this.toolConfigStore.save(toolId, values),
      setToolConfigs: (configs) => {
        this.toolingState.setToolConfigs(configs);
      },
      getCliToolStatus: (tool) => this.toolStatusHelpers.getCliToolStatus(tool) as Promise<ToolUsageInfo>,
      searchAgentSkills: (toolId, query) => searchAgentSkills(toolId, query),
      reconcileWorkspaceAgentsAfterCatalogRefresh: () =>
        reconcileWorkspaceAgentsAfterCatalogRefresh({
          nowIso,
          getSnapshot: () => this.getSnapshot(),
          updateAgent: (agentId, partial) => this.terminalMutationFacade.updateAgent(agentId, partial),
          hasRuntimeSession: (sessionId) => this.sessionRuntime.hasRuntimeSession(sessionId),
          buildResumeCommand,
          normalizeAgentLaunchCommand,
          resetAgentTranscript: (agent) => this.terminalMutationFacade.resetAgentTranscript(agent),
          getWorktreeTarget: (project, worktree) => this.getWorktreeTarget(project, worktree),
          getToolEnv: (toolId) => this.toolingRuntimeService.getToolEnv(toolId),
          spawnAgentPty: (agentId, command, target, toolEnv) => this.runtimeHelpers.spawnAgentPty(agentId, command, target, toolEnv)
        })
    });
    this.toolingMainService = new ToolingMainService(this.toolingHelpers);
    this.forgeHelpers = createForgeHelpers({
      resolveProjectSummaryById: (projectId) => this.resolveProjectSummaryById(projectId),
      getProjectTarget: (project) => this.getProjectTarget(project),
      getWorkspaceForgeRepo,
      fetchForgeOverviewForRepo,
      fetchGitlabUserMergeRequests,
      fetchForgeBranchPullRequestStatusForRepo,
      fetchForgeWorkItemDetail,
      fetchForgeWorkflowRunDetailForRepo,
      addForgeWorkItemCommentForRepo,
      createForgePullRequestForRepo,
      performForgeWorkItemActionForRepo,
      getSnapshot: () => this.getSnapshot(),
      getActiveChangesRoot,
      hasRemoteTrackingBranchForTarget: async (target) => {
        try {
          await execGit(target, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"]);
          return true;
        } catch {
          return false;
        }
      },
      hasRemoteBranchForTarget: async (target, branch) => {
        try {
          const { stdout } = await execGit(target, ["ls-remote", "--heads", "origin", branch]);
          return stdout.trim().length > 0;
        } catch {
          return false;
        }
      },
      pushWorkspaceChanges,
      readCurrentBranch
    });
    this.forgeMainService = new ForgeMainService(this.forgeHelpers);
    this.localTerminalHelpers = createLocalTerminalHelpers({
      nowIso,
      getLocalTerminalState: () => this.sessionRuntime.getLocalTerminalState(),
      setLocalTerminalState: (state) => {
        this.sessionRuntime.setLocalTerminalState(state);
      },
      notifyLocalTerminalChanged: () => this.onLocalTerminalChanged?.(this.sessionRuntime.getLocalTerminalState()),
      resolveTerminalShell: (shellId) =>
        resolveTerminalShellFromList({
          availableShells: this.getSnapshot().terminalShells,
          shellId,
          getShell
        }),
      setTerminalBuffer: (sessionId, value) => {
        this.sessionRuntime.setTerminalBuffer(sessionId, value);
      },
      deleteTerminalBuffer: (sessionId) => {
        this.sessionRuntime.deleteTerminalBuffer(sessionId);
      },
      deleteTerminalActivity: (sessionId) => {
        this.sessionRuntime.deleteTerminalActivity(sessionId);
      },
      getRuntimeSession: (sessionId) => this.sessionRuntime.getRuntimeSession(sessionId),
      deleteRuntimeSession: (sessionId) => {
        this.sessionRuntime.deleteRuntimeSession(sessionId);
      },
      resetLocalTerminalTranscript: () => this.terminalMutationFacade.resetLocalTerminalTranscript(),
      appendLocalTerminalOutput: (chunk) => this.terminalMutationFacade.appendLocalTerminalOutput(chunk),
      updateLocalTerminal: (partial) => this.terminalMutationFacade.updateLocalTerminal(partial),
      spawnLocalTerminalPty: (localTerminal, shell) => this.runtimeHelpers.spawnLocalTerminalPty(localTerminal, shell),
      homeDir: () => os.homedir(),
      randomId: () => randomUUID()
    });
    this.sessionCreationHelpers = createSessionCreationHelpers({
      nowIso,
      futureIso,
      randomId: () => randomUUID(),
      getSnapshot: () => this.getSnapshot(),
      resolveAgentLaunchCommand: (tool, payload) => {
        const buildLaunchCommand = (command: string): string =>
          buildAgentLaunchCommand(tool.id, command, {
            initialPrompt: payload.task,
            initialPromptDelivery: payload.initialPromptDelivery,
            startupTrustMode: payload.startupTrustMode
          });
        const commandOverride = payload.commandOverride.trim();
        if (commandOverride) {
          return buildLaunchCommand(commandOverride);
        }

        const detectedPath = tool.detectedPath?.trim();
        if (detectedPath) {
          const detectedPathCommand = /\s/.test(detectedPath) ? `"${detectedPath}"` : detectedPath;
          return buildLaunchCommand(detectedPathCommand);
        }

        const detectedCommand = tool.detectedCommand?.trim();
        if (detectedCommand) {
          return buildLaunchCommand(detectedCommand);
        }

        const windowsLaunchCommand = AGENT_DEFINITIONS.find((entry) => entry.id === tool.id)?.windowsLaunchCommand?.trim();
        if (isWindows() && windowsLaunchCommand) {
          return buildLaunchCommand(windowsLaunchCommand);
        }

        return buildLaunchCommand(tool.launchCommand || tool.id);
      },
      getToolEnv: (toolId) => this.toolingRuntimeService.getToolEnv(toolId),
      getWorktreeArtifactPaths,
      resolveWorktreeForSpawn: (project, payload, agentName, onCreatingWorktree) =>
        this.resolveWorktreeForSpawn(project, payload, agentName, onCreatingWorktree),
      resolveWorktreeForTerminal: (project, target) => this.resolveWorktreeForTerminal(project, target),
      resolveTerminalShell: (shellId) =>
        resolveTerminalShellFromList({
          availableShells: this.getSnapshot().terminalShells,
          shellId,
          getShell
        }),
      initializeAgentContextFiles: (agent) => this.terminalMutationFacade.initializeAgentContextFiles(agent),
      appendAgentContextEntries: (agent, entries) => this.terminalMutationFacade.appendContextEntries(agent, entries),
      attachAgentToWorktree: (agent, worktree) => this.attachAgentToWorktree(agent, worktree),
      attachTerminalToWorktree: (terminal, worktree) => this.attachTerminalToWorktree(terminal, worktree),
      upsertSession: (sessions, session) => this.upsertSession(sessions, session),
      upsertWorktree: (worktrees, worktree) => this.upsertWorktree(worktrees, worktree),
      upsertWorkspaceSummary: (workspaces, workspace) => this.upsertWorkspaceSummary(workspaces, workspace),
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      setTerminalBuffer: (sessionId, value) => {
        this.sessionRuntime.setTerminalBuffer(sessionId, value);
      },
      setLiveTerminalSnapshot: (sessionId, terminal) => {
        this.sessionRuntime.setLiveTerminalSnapshot(sessionId, terminal);
      },
      persistWorkspaceState: (state) => this.persistenceHelpers.persistWorkspaceState(state),
      updateAgent: (agentId, partial) => this.terminalMutationFacade.updateAgent(agentId, partial),
      refreshProjectState: () => this.refreshProjectState(),
      getWorktreeTarget: (project, worktree) => this.getWorktreeTarget(project, worktree),
      checkoutBranchForLaunch: (target, branchCheckout) => this.checkoutBranchForLaunch(target, branchCheckout),
      appendAgentSystemMessage: (agentId, message) => this.terminalMutationFacade.appendAgentSystemMessage(agentId, message),
      getBranchCheckoutFailureTranscript: (branchCheckout, error) =>
        this.getBranchCheckoutFailureTranscript(branchCheckout, error),
      prepareWorktree: (target, command) => this.runtimeHelpers.prepareWorktree(target, command),
      getPreparationFailureTranscript: (command, error) => this.runtimeHelpers.getPreparationFailureTranscript(command, error),
      spawnAgentPty: (agentId, command, target, toolEnv) => this.runtimeHelpers.spawnAgentPty(agentId, command, target, toolEnv),
      spawnTerminalPty: (terminalId, command, target, shell) => this.runtimeHelpers.spawnTerminalPty(terminalId, command, target, shell)
    });
    this.workspaceMutationHelpers = createWorkspaceMutationHelpers({
      getSnapshot: () => this.getSnapshot(),
      setState: (partial) => {
        this.stateGateway.setState(partial);
      },
      refreshProjectState: () => this.refreshProjectState(),
      refreshWorkspaceSummaries: (reason) => this.refreshWorkspaceSummaries(reason),
      resolveProjectSummaryById: (projectId) => this.resolveProjectSummaryById(projectId),
      getProjectTarget: (project) => this.getProjectTarget(project),
      resolveWorkspaceFileTarget: (project, rootPath) => this.resolveWorkspaceFileTarget(project, rootPath),
      moveWorkspaceFileOperation: moveWorkspaceFile,
      renameWorkspaceTaskBoardPosition,
      deleteWorkspaceFileOperation: deleteWorkspaceFile,
      removeWorkspaceTaskBoardPosition,
      writeWorkspaceTextFileOperation: writeWorkspaceTextFile,
      writeWorkspaceBinaryFileOperation: writeWorkspaceBinaryFile,
      createWorkspaceDirectoryOperation: createWorkspaceDirectory,
      discardWorkspaceChangeOperation: discardWorkspaceChange
    });
    this.workspaceLifecycleHelpers = createWorkspaceLifecycleHelpers({
      getSnapshot: () => this.getSnapshot(),
      updateState: (updater) => {
        this.stateGateway.updateState(updater);
      },
      clearRuntimeState: () => {
        this.sessionRuntime.clearAllRuntimeState();
      },
      persistWorkspaceState: (state) => this.persistenceHelpers.persistWorkspaceState(state),
      stopAllAgents: () => this.stopAllAgents(),
      loadRecentProjects: () => this.recentProjectsStore.load(),
      removeRecentProject: (projectRoot) => this.recentProjectsStore.remove(projectRoot),
      saveRecentProjects: (projects) => this.recentProjectsStore.save(projects),
      loadIndexedProjects: () => this.projectIndexStore.load(),
      removeIndexedProject: (projectId) => this.projectIndexStore.remove(projectId),
      saveAllProjects: (projects) => this.projectIndexStore.saveAll(projects),
      removeProjectSessions: (projectId) => this.sessionIndexStore.removeProject(projectId),
      readActiveRemoteMounts,
      refreshWorkspaceSummaries: (reason) => this.refreshWorkspaceSummaries(reason),
      suppressWorkspace: (projectRoot, projectId) => this.workspaceStateService.suppressWorkspace(projectRoot, projectId),
      getProjectMetadata,
      getProjectsDir,
      removeDirectory: async (directoryPath) => {
        await fs.rm(directoryPath, { recursive: true, force: true }).catch(() => {});
      },
      pathIsWithinAnyMount,
      createFallbackProjectTarget: (projectRoot, indexedProject) => ({
        path: projectRoot,
        location: indexedProject ? indexedProject.location : { kind: "local" }
      }),
      getManagedWorktreePaths: async (projects) => {
        const persistedSessions = (await Promise.all(
          projects.map((project) => this.sessionIndexStore.loadStatesForProject(project.id))
        )).flat();
        return persistedSessions
          .flatMap((entry) => entry.worktrees)
          .filter((worktree) => worktree.createdFromRef !== "ROOT")
          .map((worktree) => worktree.path);
      },
      removeManyDirectories: async (directoryPaths) => {
        await Promise.allSettled(
          directoryPaths.map((directoryPath) =>
            fs.rm(directoryPath, {
              recursive: true,
              force: true
            })
          )
        );
      }
    });
    this.lifecycleService = new OrchestratorLifecycleService({
      initialize: {
        detectTerminalShells,
        readActiveRemoteMounts,
        loadRecentProjects: () => this.recentProjectsStore.load(),
        loadToolConfigs: () => this.toolConfigStore.load(),
        setToolConfigs: (configs) => {
          this.toolingState.setToolConfigs(configs);
        },
        updateState: (updater) => this.stateGateway.updateState(updater),
        scheduleCatalogRefresh: () => this.toolingMainService.scheduleCatalogRefresh(),
        restoreWorkspaceState: () => this.persistenceHelpers.restoreWorkspaceState(),
        refreshWorkspaceSummaries: (reason) => this.refreshWorkspaceSummaries(reason),
        getSnapshot: () => this.getSnapshot()
      },
      runRefreshWorkspaceSummaries: (reason) => this.runRefreshWorkspaceSummaries(reason),
      workspaceStateService: this.workspaceStateService
    });

    this.workspaceReadSurface = new OrchestratorWorkspaceReadSurface(() => this.createWorkspaceActions());
    this.workspaceMainService = new WorkspaceMainService({
      getWorkspaceActions: () => this.workspaceReadSurface.getWorkspaceActionsForMainService(),
      navigation: this.workspaceNavigationHelpers,
      lifecycle: this.workspaceLifecycleHelpers,
      refresh: this.workspaceRefreshHelpers,
      mutations: this.workspaceMutationHelpers,
      commitChanges: (payload) => commitChangesWithValidation(this.createSessionActionsDependencies(), payload),
      pullChanges: () => pullChangesWithValidation(this.createSessionActionsDependencies()),
      pushChanges: () => pushChangesWithValidation(this.createSessionActionsDependencies())
    });
    this.sessionMainService = new SessionMainService({
      sessionCreation: this.sessionCreationHelpers,
      localTerminal: this.localTerminalHelpers,
      sessionLifecycle: this.sessionLifecycleHelpers,
      getAgentTerminalActionDependencies: () => this.createAgentTerminalActionsDependencies(),
      getSessionActionDependencies: () => this.createSessionActionsDependencies(),
      getSnapshot: () => this.getSnapshot(),
      updateTerminal: (terminalId, partial) => this.terminalMutationFacade.updateTerminal(terminalId, partial),
      nowIso,
      randomId: () => randomUUID(),
      readAgentContextEntries: (agent) => this.terminalMutationFacade.readContextEntries(agent.contextFilePath),
      appendAgentContextEntries: (agent, entries) => this.terminalMutationFacade.appendContextEntries(agent, entries),
      writeAgentContextBundle: (agent, bundleId, content) =>
        this.terminalMutationFacade.writeContextBundle(agent, bundleId, content),
      resizeRuntimeSession: (sessionId, cols, rows) => this.sessionRuntime.resizeRuntimeSession(sessionId, cols, rows)
    });

    this.store.subscribe(() => {
      this.workspaceStateService.schedulePersistWorkspaceState(
        () => this.getSnapshot(),
        (state) => this.persistenceHelpers.persistWorkspaceState(state)
      );
    });
  }

  createServices(): MainServices {
    const snapshot = new SnapshotMainService({
      getSnapshot: () => this.stateGateway.getSnapshot(),
      getTerminalBuffer: (sessionId: string) => this.sessionRuntime.getTerminalBuffer(sessionId),
      getLocalTerminalState: () => this.sessionRuntime.getLocalTerminalState(),
      readContextFile: (contextFilePath: string) => this.terminalMutationFacade.readContextFile(contextFilePath),
      readContextEntries: (contextFilePath: string) => this.terminalMutationFacade.readContextEntries(contextFilePath)
    });
    const domains = buildDomainMainServicesFromOrchestrator(
      snapshot,
      this.workspaceMainService,
      this.sessionMainService,
      this.toolingMainService,
      this.forgeMainService
    );

    return createServicesBridge({
      snapshot: domains.snapshot,
      workspace: domains.workspace,
      session: domains.session,
      tooling: domains.tooling,
      forge: domains.forge,
      vercelApiTimeoutMs: APP_RUNTIME_SETTINGS.orchestrator.vercelApiTimeoutMs,
      getActiveVercelRuntimeLogStreamAbortController: () => this.activeVercelRuntimeLogStreamAbortController,
      setActiveVercelRuntimeLogStreamAbortController: (controller) => {
        this.activeVercelRuntimeLogStreamAbortController = controller;
      }
    });
  }

  getSnapshot(): AppState {
    return this.stateGateway.getSnapshot();
  }

  private getProjectTarget(project: ProjectSummary): WorkspaceTarget {
    return getProjectTargetForSummary(project);
  }

  private resolveWorkspaceFileTarget(project: ProjectSummary, rootPath?: string): WorkspaceTarget {
    return resolveWorkspaceFileTargetFromState(project, this.getSnapshot().worktrees, rootPath);
  }

  private getWorktreeTarget(project: ProjectSummary, worktree: Pick<WorktreeRecord, "path" | "location">): WorkspaceTarget {
    return getWorktreeTargetForSummary(project, worktree);
  }

  onStateChanged(listener: (state: AppState) => void): () => void {
    return this.store.subscribe(listener);
  }

  onAgentTerminalData(listener: (agentId: string, data: string) => void): () => void {
    this.sessionRuntime.addTerminalListener(listener);
    return () => {
      this.sessionRuntime.removeTerminalListener(listener);
    };
  }

  private reportWorkspaceLoadingProgress(
    projectId: string,
    detail: string,
    command: string | null
  ): void {
    this.onWorkspaceLoadingProgress?.({ projectId, detail, command });
  }

  async clearAgentContext(agentId: string): Promise<AgentContextPreview> {
    return this.sessionMainService.clearAgentContext(agentId);
  }

  async clearAgentTerminal(agentId: string): Promise<AppState> {
    return this.sessionMainService.clearAgentTerminal(agentId);
  }

  async initialize(): Promise<AppState> {
    return this.lifecycleService.initialize();
  }

  refreshCatalog(options?: import("./types/agentDetectionCache.types").RefreshCatalogOptions): Promise<AppState> {
    return this.toolingMainService.refreshCatalog(options);
  }

  async selectProject(projectRoot: string): Promise<AppState> {
    return this.workspaceMainService.selectProject(projectRoot);
  }

  async focusWorkspace(projectId: string): Promise<AppState> {
    return this.workspaceMainService.focusWorkspace(projectId);
  }

  async openDirectSshProject(payload: { host: string; user?: string; port?: number | null; remotePath: string; alias?: string }): Promise<AppState> {
    return this.workspaceMainService.openDirectSshProject(payload);
  }

  private async resolveProjectTarget(projectRoot: string): Promise<WorkspaceTarget> {
    return this.workspaceNavigationHelpers.resolveProjectTarget(projectRoot);
  }

  private async resolveProjectSummaryById(projectId: string): Promise<ProjectSummary> {
    return this.workspaceNavigationHelpers.resolveProjectSummaryById(projectId);
  }

  private async openProject(
    projectTarget: WorkspaceTarget,
    options: {
      focusedAgentMode: "first-agent" | "none";
    }
  ): Promise<AppState> {
    return this.projectOpenHelpers.openProject(projectTarget, options);
  }

  async closeProject(): Promise<AppState> {
    return this.workspaceMainService.closeProject();
  }

  async removeProject(projectRoot: string): Promise<AppState> {
    return this.workspaceMainService.removeProject(projectRoot);
  }

  async removeProjectsWithinMount(mountPoint: string, relatedMountRoots: string[] = []): Promise<void> {
    return this.workspaceMainService.removeProjectsWithinMount(mountPoint, relatedMountRoots);
  }

  async resetWorkspaces(): Promise<AppState> {
    return this.workspaceMainService.resetWorkspaces();
  }

  async refreshProjectState(): Promise<AppState> {
    return this.workspaceMainService.refreshProjectState();
  }

  async commitChanges(payload: CommitChangesPayload): Promise<AppState> {
    return this.workspaceMainService.commitChanges(payload);
  }

  async pullChanges(): Promise<AppState> {
    return this.workspaceMainService.pullChanges();
  }

  async pushChanges(): Promise<AppState> {
    return this.workspaceMainService.pushChanges();
  }

  async createAgent(payload: CreateAgentPayload): Promise<AppState> {
    return this.sessionMainService.createAgent(payload);
  }

  async createTerminal(payload: CreateTerminalPayload): Promise<AppState> {
    return this.sessionMainService.createTerminal(payload);
  }

  async sendAgentInput(agentId: string, input: string): Promise<AppState> {
    return this.sessionMainService.sendAgentInput(agentId, input);
  }

  async sendAgentTerminalInput(agentId: string, input: string): Promise<void> {
    return this.sessionMainService.sendAgentTerminalInput(agentId, input);
  }

  getTerminalBuffer(sessionId: string): string {
    return this.sessionRuntime.getTerminalBuffer(sessionId);
  }

  getLocalTerminalState(): LocalTerminalState | null {
    return this.sessionRuntime.getLocalTerminalState();
  }

  async clearTerminal(sessionId: string): Promise<AppState> {
    return this.sessionMainService.clearTerminal(sessionId);
  }

  async sendTerminalInput(sessionId: string, input: string): Promise<void> {
    return this.sessionMainService.sendTerminalInput(sessionId, input);
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): AppState {
    return this.sessionMainService.resizeTerminal(sessionId, cols, rows);
  }

  private async refreshWorkspaceSummaries(reason = "unknown"): Promise<void> {
    return this.lifecycleService.refreshWorkspaceSummaries(reason);
  }

  private async runRefreshWorkspaceSummaries(reason: string): Promise<void> {
    await this.workspaceRefreshHelpers.runRefreshWorkspaceSummaries(reason);
  }

  resizeAgentTerminal(agentId: string, cols: number, rows: number): AppState {
    return this.sessionMainService.resizeAgentTerminal(agentId, cols, rows);
  }

  async moveWorkspaceFile(payload: { projectId: string; fromPath: string; toPath: string; rootPath?: string }): Promise<AppState> {
    return this.workspaceMainService.moveWorkspaceFile(payload);
  }

  async createWorkspaceDirectory(payload: { projectId: string; path: string; rootPath?: string }): Promise<AppState> {
    return this.workspaceMainService.createWorkspaceDirectory(payload);
  }

  async deleteWorkspaceFile(payload: { projectId: string; path: string; rootPath?: string }): Promise<AppState> {
    return this.workspaceMainService.deleteWorkspaceFile(payload);
  }

  async writeWorkspaceFile(payload: { projectId: string; path: string; content: string; rootPath?: string }): Promise<AppState> {
    return this.workspaceMainService.writeWorkspaceFile(payload);
  }

  async importWorkspaceBinaryFile(payload: { projectId: string; path: string; content: Buffer; rootPath?: string }): Promise<AppState> {
    return this.workspaceMainService.importWorkspaceBinaryFile(payload);
  }

  selectChange(pathName: string): AppState {
    return this.workspaceMainService.selectChange(pathName);
  }

  async inspectCommit(hash: string): Promise<AppState> {
    return this.workspaceMainService.inspectCommit(hash);
  }

  async clearCommitInspection(): Promise<AppState> {
    return this.workspaceMainService.clearCommitInspection();
  }

  async stopAllAgents(): Promise<void> {
    await stopAllAgentsAction(this.createSessionActionsDependencies());
  }

  async stopAllAgentsGracefully(onProgress?: (payload: { detail: string; command: string | null }) => void): Promise<void> {
    return this.sessionMainService.stopAllAgentsGracefully(onProgress);
  }

  private createSessionActionsDependencies() {
    this.sessionActionsDependenciesCache = createCachedSessionActionsDependencies(
      this.sessionActionsDependenciesCache,
      createSessionActionDependencyMap({
      getSnapshot: () => this.getSnapshot(),
      refreshProjectState: () => this.refreshProjectState(),
      commitWorkspaceChanges,
      pullWorkspaceChanges,
      pushWorkspaceChanges,
      appendAgentSystemMessage: (agentId: string, message: string) =>
        this.terminalMutationFacade.appendAgentSystemMessage(agentId, message),
      stopAllAgents: () => this.stopAllAgents(),
      killAgentSession: (agentId: string) => {
        this.sessionRuntime.killRuntimeSession(agentId);
      },
      setAgentStopped: (agentId: string) => {
        this.terminalMutationFacade.updateAgent(agentId, {
          status: "stopped",
          pid: null
        });
      },
      hasAgentSession: (agentId: string) => this.sessionRuntime.hasRuntimeSession(agentId),
      writeAgentSessionInput: (agentId: string, input: string) => {
        const session = this.sessionRuntime.getRuntimeSession(agentId);
        if (!session) {
          throw new Error("Agent session is not running.");
        }
        session.write(input);
      },
      delay
      })
    );
    return this.sessionActionsDependenciesCache;
  }

  private createWorkspaceActions() {
    this.workspaceActionsCache = createCachedWorkspaceActions(
      this.workspaceActionsCache,
      createWorkspaceActionDependencyMap({
      resolveProjectSummaryById: (projectId: string) => this.resolveProjectSummaryById(projectId),
      resolveWorkspaceFileTarget: (project: ProjectSummary, rootPath?: string) => this.resolveWorkspaceFileTarget(project, rootPath),
      getProjectTarget: (project: ProjectSummary) => this.getProjectTarget(project),
      getSnapshot: () => this.getSnapshot(),
      setState: (partial) => this.stateGateway.setState(partial),
      updateState: (updater) => this.stateGateway.updateState(updater),
      refreshProjectState: () => this.refreshProjectState(),
      refreshWorkspaceSummaries: (reason: string) => this.refreshWorkspaceSummaries(reason),
      nowIso,
      slugify,
      maxWorkspaceGitStatusLines: APP_RUNTIME_SETTINGS.orchestrator.maxWorkspaceGitStatusLines,
      readWorkspaceTextFile,
      resolveExistingWorkspaceAbsolutePath,
      readWorkspaceBinaryFile,
      getWorkspaceImageMimeType,
      listWorkspaceTrackedAndUntrackedFiles,
      listImportedContextBundles,
      listWorkspaceDirectories,
      listWorkspaceSpecs,
      listWorkspaceNotes,
      searchWorkspaceFiles,
      statWorkspacePath,
      execGit,
      listWorkspaceTasks,
      readWorkspaceTaskBoard,
      writeWorkspaceTaskBoard,
      writeWorkspaceTextFile,
      addTaskToWorkspaceTaskBoard,
      listWorkspaceTaskPaths,
      readWorkspaceSplitViewCollection,
      writeWorkspaceSplitViewCollection,
      saveProject: async (project: ProjectSummary) => {
        await this.projectIndexStore.save(project);
      }
      })
    );
    return this.workspaceActionsCache;
  }

  private createAgentTerminalActionsDependencies() {
    this.agentTerminalActionsDependenciesCache = createCachedAgentTerminalActionsDependencies(
      this.agentTerminalActionsDependenciesCache,
      createAgentTerminalActionDependencyMap({
      nowIso,
      getSnapshot: () => this.getSnapshot(),
      getPtySession: (sessionId: string) => this.sessionRuntime.getRuntimeSession(sessionId) || null,
      getContextWriteChain: (agentId: string) => this.sessionRuntime.getContextWriteChain(agentId) || null,
      setContextWriteChain: (agentId: string, chain: Promise<void>) => {
        this.sessionRuntime.setContextWriteChain(agentId, chain);
      },
      setTerminalBuffer: (sessionId: string, value: string) => {
        this.sessionRuntime.setTerminalBuffer(sessionId, value);
      },
      deleteTerminalActivity: (sessionId: string) => {
        this.sessionRuntime.deleteTerminalActivity(sessionId);
      },
      updateAgent: (agentId: string, partial: Partial<AgentSession>) => {
        this.terminalMutationFacade.updateAgent(agentId, partial);
      },
      updateTerminal: (terminalId: string, partial: Partial<TerminalSession>) => {
        this.terminalMutationFacade.updateTerminal(terminalId, partial);
      },
      resetTerminalTranscript: (terminal: TerminalSession) => this.terminalMutationFacade.resetTerminalTranscript(terminal),
      clearAgentContextFile: (agent: AgentSession) => this.terminalMutationFacade.clearAgentContext(agent)
      })
    );
    return this.agentTerminalActionsDependenciesCache;
  }

  private upsertSession(sessions: SessionRecord[], session: SessionRecord): SessionRecord[] {
    return this.worktreeHelpers.upsertSession(sessions, session);
  }

  private upsertWorktree(worktrees: WorktreeRecord[], worktree: WorktreeRecord): WorktreeRecord[] {
    return this.worktreeHelpers.upsertWorktree(worktrees, worktree);
  }

  private upsertWorkspaceSummary(workspaces: WorkspaceSummary[], workspace: WorkspaceSummary): WorkspaceSummary[] {
    return this.worktreeHelpers.upsertWorkspaceSummary(workspaces, workspace);
  }

  private async resolveWorktreeForSpawn(
    project: ProjectSummary,
    payload: CreateAgentPayload,
    agentName: string,
    onCreatingWorktree?: (session: SessionRecord, worktree: WorktreeRecord) => Promise<void>
  ): Promise<{ session: SessionRecord; worktree: WorktreeRecord; createdWorktree: boolean }> {
    return this.worktreeSelectionHelpers.resolveWorktreeForSpawn(project, payload, agentName, onCreatingWorktree);
  }

  private async resolveWorktreeForTerminal(
    project: ProjectSummary,
    target: CreateTerminalPayload["target"]
  ): Promise<{ session: SessionRecord; worktree: WorktreeRecord }> {
    return this.worktreeSelectionHelpers.resolveWorktreeForTerminal(project, target);
  }

  private async checkoutBranchForLaunch(
    target: WorkspaceTarget,
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>
  ): Promise<string> {
    return this.worktreeHelpers.checkoutBranchForLaunch(target, branchCheckout);
  }

  private getBranchCheckoutFailureTranscript(
    branchCheckout: NonNullable<CreateAgentPayload["branchCheckout"]>,
    error: unknown
  ): string {
    return this.worktreeHelpers.getBranchCheckoutFailureTranscript(branchCheckout, error);
  }

  private async attachAgentToWorktree(agent: AgentSession, worktree: WorktreeRecord): Promise<void> {
    await this.worktreeHelpers.attachAgentToWorktree(agent, worktree);
  }

  private async attachTerminalToWorktree(terminal: TerminalSession, worktree: WorktreeRecord): Promise<void> {
    await this.worktreeHelpers.attachTerminalToWorktree(terminal, worktree);
  }

  private async detachAgentFromWorktree(agent: AgentSession): Promise<WorktreeRecord | null> {
    return this.worktreeHelpers.detachAgentFromWorktree(
      agent,
      this.getSnapshot().worktrees.find((item) => item.id === agent.worktreeId) ?? null
    );
  }

  private async detachTerminalFromWorktree(terminal: TerminalSession): Promise<WorktreeRecord | null> {
    return this.worktreeHelpers.detachTerminalFromWorktree(
      terminal,
      this.getSnapshot().worktrees.find((item) => item.id === terminal.worktreeId) ?? null
    );
  }

  prepareLoopRunWorktree(input: PrepareLoopRunWorktreeInput): Promise<PreparedLoopRunWorktree> {
    return prepareLoopRunWorktree(
      {
        nowIso,
        getSnapshot: () => this.getSnapshot(),
        resolveWorktreeForSpawn: (project, payload, agentName, onCreatingWorktree) =>
          this.resolveWorktreeForSpawn(project, payload, agentName, onCreatingWorktree),
        getWorktreeTarget: (project, worktree) => this.getWorktreeTarget(project, worktree),
        checkoutBranchForLaunch: (target, branchCheckout) => this.checkoutBranchForLaunch(target, branchCheckout),
        prepareWorktree: (target, command) => this.runtimeHelpers.prepareWorktree(target, command),
        updateState: (updater) => {
          this.stateGateway.updateState(updater);
        },
        upsertSession: (sessions, session) => this.upsertSession(sessions, session),
        upsertWorktree: (worktrees, worktree) => this.upsertWorktree(worktrees, worktree),
        upsertWorkspaceSummary: (workspaces, workspace) => this.upsertWorkspaceSummary(workspaces, workspace),
        persistWorkspaceState: (state) => this.persistenceHelpers.persistWorkspaceState(state)
      },
      input
    );
  }

  resolveLoopToolLaunch(toolId: string): { detectedCommand: string; env: Record<string, string> } {
    const tool = this.getSnapshot().agentCatalog.find((entry) => entry.id === toolId);
    if (!tool) {
      throw new Error(`Unknown agent tool: ${toolId}`);
    }
    if (!tool.enabled) {
      throw new Error(`${tool.label} is disabled in settings.`);
    }
    const detectedCommand = tool.detectedCommand?.trim() || tool.detectedPath?.trim();
    if (!detectedCommand) {
      throw new Error(`${tool.label} is not installed yet.`);
    }
    const command = /\s/.test(detectedCommand) && !detectedCommand.startsWith("\"")
      ? `"${detectedCommand}"`
      : detectedCommand;
    return {
      detectedCommand: normalizeAgentLaunchCommand(tool.id, command),
      env: this.toolingRuntimeService.getToolEnv(tool.id)
    };
  }

}
