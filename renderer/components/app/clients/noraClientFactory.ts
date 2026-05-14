import type { AppGateway } from "@shared/ipc/types/appGateway.types";
import type { NoraBridge } from "@shared/ipc/types/noraBridge.types";

export const NORA_APP_CLIENT_METHODS = [
  "getSnapshot",
  "onStateChanged",
  "onStateDelta",
  "onDomainEvents"
] as const satisfies readonly (keyof AppGateway)[];

export const NORA_WORKSPACE_CLIENT_METHODS = [
  "chooseProject",
  "focusWorkspace",
  "chooseProjectAtPath",
  "closeProject",
  "removeProject",
  "refresh",
  "resetWorkspaces",
  "openSshProject",
  "mountRemoteProject",
  "connectRemoteProject",
  "unmountRemoteProject",
  "selectProject",
  "listWorkspaceFiles",
  "listWorkspaceDirectories",
  "listWorkspaceTasks",
  "listWorkspaceSpecs",
  "listWorkspaceNotes",
  "resolveWorkspaceStatePath",
  "getWorkspaceTaskBoard",
  "saveWorkspaceTaskBoard",
  "getWorkspaceSplitViews",
  "saveWorkspaceSplitViews",
  "saveWorkspaceTerminalPresets",
  "readWorkspaceFile",
  "readWorkspaceImageFile",
  "writeWorkspaceFile",
  "createWorkspaceDirectory",
  "importBrowserImageToWorkspace",
  "moveWorkspaceFile",
  "deleteWorkspaceFile",
  "searchWorkspaceFiles",
  "listImportedContextBundles",
  "listExternalHarnessContextSessions",
  "composeExternalHarnessContextSelections",
  "listNoraDetectableContextBundles",
  "importNoraDetectableContextBundle",
  "readNoraDetectableContextBundle",
  "deleteNoraDetectableContextBundle",
  "statWorkspacePath",
  "getWorkspaceGitStatusSummary",
  "selectChange",
  "discardChange",
  "inspectCommit",
  "clearCommitInspection",
  "commitChanges",
  "generateCommitMessage",
  "pullChanges",
  "pushChanges",
  "onWorkspaceLoadingProgress"
] as const satisfies readonly (keyof NoraBridge)[];

export const NORA_AGENT_CLIENT_METHODS = [
  "createAgent",
  "focusAgent",
  "restartAgent",
  "destroyAgent",
  "sendAgentInput",
  "sendAgentPrompt",
  "sendAgentTerminalInput",
  "getAgentTerminalBuffer",
  "getAgentContextPreview",
  "getAgentContextState",
  "listWorkspaceAgentContextSources",
  "clearAgentContext",
  "clearAgentTerminal",
  "resizeAgentTerminal"
] as const satisfies readonly (keyof NoraBridge)[];

export const NORA_TERMINAL_CLIENT_METHODS = [
  "createTerminal",
  "renameTerminal",
  "focusTerminal",
  "restartTerminal",
  "clearTerminal",
  "destroyTerminal",
  "openLocalTerminal",
  "getLocalTerminalState",
  "onLocalTerminalStateChanged",
  "onTerminalData",
  "sendTerminalInput",
  "getTerminalBuffer",
  "resizeTerminal",
  "sendWindowEnter",
  "restartLocalTerminal",
  "clearLocalTerminal",
  "destroyLocalTerminal",
  "focusWorktree"
] as const satisfies readonly (keyof NoraBridge)[];

export const NORA_SESSION_CLIENT_METHODS = [
  ...NORA_AGENT_CLIENT_METHODS,
  ...NORA_TERMINAL_CLIENT_METHODS
] as const satisfies readonly (keyof NoraBridge)[];

export const NORA_INTEGRATION_CLIENT_METHODS = [
  "getForgeOAuthProviders",
  "startForgeOAuth",
  "getForgeOverview",
  "getForgeBranchPullRequestStatus",
  "getForgeWorkItemDetail",
  "getForgeWorkflowRunDetail",
  "performForgeWorkItemAction",
  "addForgeWorkItemComment",
  "createForgePullRequest",
  "listVercelProjects",
  "listVercelDeployments",
  "redeployVercelDeployment",
  "startVercelRuntimeLogStream",
  "stopVercelRuntimeLogStream",
  "onVercelRuntimeLogEvent"
] as const satisfies readonly (keyof NoraBridge)[];

export const NORA_TOOLING_CLIENT_METHODS = [
  "refreshCatalog",
  "installTool",
  "removeTool",
  "searchToolSkills",
  "installToolSkill",
  "removeToolSkill",
  "saveToolConfig",
  "getToolUsage",
  "switchToolAccount",
  "onToolSkillInstallOutput",
  "listAiModels"
] as const satisfies readonly (keyof NoraBridge)[];

export const NORA_SYSTEM_CLIENT_METHODS = [
  "openExternalUrl",
  "copyText",
  "closeWindow",
  "minimizeWindow",
  "toggleMaximizeWindow",
  "getWindowState",
  "onWindowStateChanged",
  "getDetectedUserIdentity",
  "getAppSettings",
  "saveAppSettings",
  "relaunchApplication",
  "getAnalyticsRuntimeConfig",
  "getStartupDependencyReport",
  "installStartupDependency",
  "getLinuxAptSetupStatus",
  "installLinuxAptUpdates",
  "getLinuxUpdateStatus",
  "getReleaseVersionStatus",
  "getAutoUpdateStatus",
  "getAutoUpdateTestSupport",
  "simulateAutoUpdateStatus",
  "installDownloadedUpdate",
  "getLatestReleaseAssets",
  "downloadReleaseAsset",
  "revealFileInFolder",
  "onReleaseAssetDownloadProgress",
  "onAutoUpdateStatus",
  "onForgeOAuthDevicePrompt",
  "getInstalledIdes",
  "openProjectInIde",
  "getRemoteConnectionOptions",
  "installRemoteMountSupport",
  "onRemoteMountOutput",
  "listChromeCookieProfiles",
  "importChromeBrowserData",
  "transcribeVoiceInput",
  "savePastedImage",
  "showAgentCompletionNotification",
  "onAppClosingProgress",
  "logAnalytics",
  "scanLocalAgentUsage",
  "syncMacApplicationMenu",
  "onMacApplicationMenuCommand"
] as const satisfies readonly (keyof NoraBridge)[];

function getNoraApi(): NoraBridge {
  return (globalThis as typeof globalThis & { nora: NoraBridge }).nora;
}

export function createNoraClient<K extends keyof NoraBridge>(
  methodNames: readonly K[]
): Pick<NoraBridge, K> {
  const client: Partial<NoraBridge> = {};
  const noraApi = getNoraApi() as unknown as Record<string, (...invokeArgs: unknown[]) => unknown>;
  for (const methodName of methodNames) {
    (client as Record<string, unknown>)[methodName as string] = (...args: unknown[]) =>
      noraApi[methodName as string](...args);
  }
  return client as Pick<NoraBridge, K>;
}
