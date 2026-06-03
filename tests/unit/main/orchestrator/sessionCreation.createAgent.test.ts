import { createSessionCreationHelpers } from "@main/orchestrator/sessionCreation";
import type { WorkspaceTarget } from "@main/types/internal.types";
import type { SessionCreationDeps } from "@main/types/orchestratorSessionCreation.types";
import type {
  AgentCatalogEntry,
  AppState,
  CreateAgentPayload,
  ProjectSummary,
  SessionRecord,
  WorktreeRecord
} from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

type DepsHarness = {
  deps: SessionCreationDeps;
  getState: () => AppState;
  calls: {
    resolveWorktreeForSpawn: number;
    spawnAgentPty: number;
    refreshProjectState: number;
  };
};

function createProjectSummary(location: ProjectSummary["location"] | undefined): ProjectSummary {
  return {
    id: "project-1",
    name: "project",
    rootPath: "/tmp/project",
    gitCommonDir: "/tmp/project/.git",
    location,
    remoteAgentCatalog: null,
    workspaceInstructionFile: null,
    workspaceTerminalPresets: [],
    baseBranch: "main",
    framework: null,
    platform: "linux",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    lastOpenedAt: "2026-04-10T00:00:00.000Z"
  };
}

function createAgentTool(overrides: Partial<AgentCatalogEntry> = {}): AgentCatalogEntry {
  return {
    id: "codex",
    label: "Codex",
    aliases: [],
    launchCommand: "codex",
    installTemplate: "npm i -g codex",
    description: "agent",
    usageNotes: [],
    authFields: [],
    supportsUsageStatus: false,
    usageDashboardUrl: null,
    supportsAccountSwitch: false,
    detected: true,
    enabled: true,
    detectedCommand: "codex",
    detectedPath: "/usr/bin/codex",
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null,
    installStatus: "idle",
    installLog: [],
    config: {
      values: {},
      updatedAt: null
    },
    ...overrides
  };
}

function createSessionRecord(): SessionRecord {
  return {
    id: "session-1",
    projectId: "project-1",
    name: "Session",
    status: "active",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    lastUsedAt: "2026-04-10T00:00:00.000Z",
    focusedWorktreeId: "worktree-1"
  };
}

function createWorktreeRecord(location: WorktreeRecord["location"]): WorktreeRecord {
  return {
    id: "worktree-1",
    projectId: "project-1",
    sessionId: "session-1",
    path: "/tmp/project",
    location,
    branch: "main",
    createdFromRef: "main",
    createdAt: "2026-04-10T00:00:00.000Z",
    updatedAt: "2026-04-10T00:00:00.000Z",
    lastUsedAt: "2026-04-10T00:00:00.000Z",
    status: "ready",
    writerAgentId: null,
    readerAgentIds: [],
    terminalSessionIds: [],
    scripts: []
  };
}

function createState(project: ProjectSummary | null, tool: AgentCatalogEntry): AppState {
  return {
    screen: project ? "workspace" : "project-selector",
    project,
    projectBranches: [],
    currentSessionId: null,
    sessions: [],
    worktrees: [],
    workspaces: [],
    recentProjects: [],
    focusedAgentId: null,
    focusedTerminalId: null,
    selectedChangePath: null,
    selectedCommitHash: null,
    selectedCommit: null,
    changesRoot: null,
    changes: [],
    commitHistory: [],
    activeRemoteMounts: [],
    projectScripts: [],
    defaultWorktreePrepareCommand: null,
    agents: [],
    terminals: [],
    terminalShells: [],
    agentCatalog: [tool],
    agentSkillCatalogs: [],
    errorMessage: null
  };
}

function createAgentPayload(overrides: Partial<CreateAgentPayload> = {}): CreateAgentPayload {
  return {
    toolId: "codex",
    name: "Agent",
    task: "Run task",
    commandOverride: "",
    mode: "write",
    target: { kind: "new" },
    branchCheckout: null,
    worktreeBranch: null,
    prepareWorktree: false,
    prepareCommand: "",
    ...overrides
  };
}

function createHarness(args: {
  state: AppState;
  spawnThrows?: Error;
}): DepsHarness {
  let state = args.state;
  const session = createSessionRecord();
  const worktree = createWorktreeRecord(state.project?.location);
  const calls = {
    resolveWorktreeForSpawn: 0,
    spawnAgentPty: 0,
    refreshProjectState: 0
  };

  const deps: SessionCreationDeps = {
    nowIso: () => "2026-04-10T00:00:00.000Z",
    futureIso: () => "2026-04-10T00:00:05.000Z",
    randomId: () => "agent-1",
    getSnapshot: () => state,
    resolveAgentLaunchCommand: () => "codex run",
    getToolEnv: () => ({}),
    getWorktreeArtifactPaths: () => ({
      contextFilePath: "/tmp/project/.nora/context.md",
      terminalStreamPath: "/tmp/project/.nora/terminal.log"
    }),
    resolveWorktreeForSpawn: async () => {
      calls.resolveWorktreeForSpawn += 1;
      return { session, worktree, createdWorktree: false };
    },
    resolveWorktreeForTerminal: async () => ({ session, worktree }),
    resolveTerminalShell: () => ({ id: "bash", label: "Bash", executable: "bash" }),
    initializeAgentContextFiles: async () => undefined,
    appendAgentContextEntries: async () => undefined,
    attachAgentToWorktree: async () => undefined,
    attachTerminalToWorktree: async () => undefined,
    upsertSession: (sessions, nextSession) => {
      const withoutMatch = sessions.filter((entry) => entry.id !== nextSession.id);
      return [...withoutMatch, nextSession];
    },
    upsertWorktree: (worktrees, nextWorktree) => {
      const withoutMatch = worktrees.filter((entry) => entry.id !== nextWorktree.id);
      return [...withoutMatch, nextWorktree];
    },
    upsertWorkspaceSummary: (_workspaces, workspace) => [workspace],
    updateState: (updater) => {
      state = updater(state);
    },
    setTerminalBuffer: () => undefined,
    setLiveTerminalSnapshot: () => undefined,
    persistWorkspaceState: async () => undefined,
    updateAgent: (agentId, partial) => {
      state = {
        ...state,
        agents: state.agents.map((agent) => (agent.id === agentId ? { ...agent, ...partial } : agent))
      };
    },
    refreshProjectState: async () => {
      calls.refreshProjectState += 1;
      return state;
    },
    getWorktreeTarget: (project, targetWorktree): WorkspaceTarget => ({
      path: targetWorktree.path,
      location: project.location
    }),
    checkoutBranchForLaunch: async () => "",
    appendAgentSystemMessage: () => undefined,
    getBranchCheckoutFailureTranscript: () => "branch-failed",
    prepareWorktree: async () => undefined,
    getPreparationFailureTranscript: () => "prepare-failed",
    spawnAgentPty: async () => {
      calls.spawnAgentPty += 1;
      if (args.spawnThrows) {
        throw args.spawnThrows;
      }
    },
    spawnTerminalPty: async () => undefined
  };

  return {
    deps,
    getState: () => state,
    calls
  };
}

test("createAgent throws when no project is selected", async () => {
  const tool = createAgentTool();
  const harness = createHarness({ state: createState(null, tool) });
  const helpers = createSessionCreationHelpers(harness.deps);

  await assert.rejects(
    () => helpers.createAgent(createAgentPayload()),
    /Choose a project before launching an agent/
  );
});

test("createAgent throws for unknown tools", async () => {
  const tool = createAgentTool({ id: "other-tool" });
  const state = createState(createProjectSummary(undefined), tool);
  const harness = createHarness({ state });
  const helpers = createSessionCreationHelpers(harness.deps);

  await assert.rejects(
    () => helpers.createAgent(createAgentPayload({ toolId: "codex" })),
    /Unknown agent tool: codex/
  );
  assert.equal(harness.calls.resolveWorktreeForSpawn, 0);
});

test("createAgent blocks disabled tools", async () => {
  const tool = createAgentTool({ enabled: false });
  const state = createState(createProjectSummary(undefined), tool);
  const harness = createHarness({ state });
  const helpers = createSessionCreationHelpers(harness.deps);

  await assert.rejects(
    () => helpers.createAgent(createAgentPayload()),
    /is disabled in settings/
  );
  assert.equal(harness.calls.resolveWorktreeForSpawn, 0);
});

test("createAgent blocks undetected local tools", async () => {
  const tool = createAgentTool({ detected: false, detectedCommand: null });
  const state = createState(createProjectSummary(undefined), tool);
  const harness = createHarness({ state });
  const helpers = createSessionCreationHelpers(harness.deps);

  await assert.rejects(
    () => helpers.createAgent(createAgentPayload()),
    /is not installed yet/
  );
  assert.equal(harness.calls.resolveWorktreeForSpawn, 0);
});

test("createAgent allows direct SSH projects even when the tool is not detected locally", async () => {
  const tool = createAgentTool({ detected: false, detectedCommand: null });
  const state = createState(
    createProjectSummary({
      kind: "ssh",
      host: "example.com",
      user: "devuser",
      port: 22,
      remotePath: "/srv/project",
      alias: null
    }),
    tool
  );
  const harness = createHarness({ state });
  const helpers = createSessionCreationHelpers(harness.deps);

  const result = await helpers.createAgent(createAgentPayload());

  assert.equal(harness.calls.resolveWorktreeForSpawn, 1);
  assert.equal(harness.calls.spawnAgentPty, 1);
  assert.equal(result.agents.length, 1);
  assert.equal(result.agents[0].status, "starting");
});

test("createAgent reports and persists launch errors when PTY spawn fails", async () => {
  const tool = createAgentTool();
  const state = createState(createProjectSummary(undefined), tool);
  const harness = createHarness({
    state,
    spawnThrows: new Error("spawn failed")
  });
  const helpers = createSessionCreationHelpers(harness.deps);

  const result = await helpers.createAgent(createAgentPayload());
  const createdAgent = harness.getState().agents.find((entry) => entry.id === "agent-1");

  assert.equal(harness.calls.spawnAgentPty, 1);
  assert.equal(harness.calls.refreshProjectState, 1);
  assert.equal(result.errorMessage, "Agent launch failed: spawn failed");
  assert.equal(createdAgent?.status, "error");
  assert.equal(createdAgent?.lastTerminalLine, "Agent launch failed");
});
