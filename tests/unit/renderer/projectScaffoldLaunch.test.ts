import { launchProjectScaffoldAgent } from "@/components/app/logic/projectScaffoldLaunch";
import type { LaunchProjectScaffoldAgentDeps } from "@/components/app/types/projectScaffoldLaunch.types";
import type { AppState, CreateAgentPayload } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createState(focusedAgentId: string | null): AppState {
  return {
    screen: "workspace",
    project: null,
    projectBranches: [],
    currentSessionId: null,
    sessions: [],
    worktrees: [],
    workspaces: [],
    recentProjects: [],
    focusedAgentId,
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
    agentCatalog: [],
    agentSkillCatalogs: [],
    errorMessage: null
  };
}

function createPayload(): CreateAgentPayload {
  return {
    toolId: "codex",
    name: "Scaffold Next.js project",
    task: "Scaffold a new Next.js project.",
    commandOverride: "",
    mode: "write",
    target: { kind: "root" },
    branchCheckout: null,
    worktreeBranch: null,
    prepareWorktree: false,
    launchSource: "dialog"
  };
}

test("launchProjectScaffoldAgent creates the workspace, creates the agent, and hands off the scaffold prompt", async () => {
  const events: string[] = [];
  const deps: LaunchProjectScaffoldAgentDeps = {
    createProjectWorkspace: async (payload) => {
      events.push(`workspace:${payload.projectName}`);
      return {
        state: createState(null),
        projectRoot: "/tmp/my-app"
      };
    },
    createAgent: async (payload) => {
      events.push(`agent:${payload.task}`);
      return createState("agent-1");
    },
    normalizeSnapshot: (snapshot) => snapshot,
    updateSnapshot: (snapshot) => {
      events.push(`snapshot:${snapshot.focusedAgentId ?? "none"}`);
    },
    handoffPrompt: async ({ agentId, prompt, updateSnapshot }) => {
      events.push(`handoff:${agentId}:${prompt.text}`);
      updateSnapshot(createState(agentId));
    }
  };

  const result = await launchProjectScaffoldAgent({ payload: createPayload(), projectName: "my-app" }, deps);

  assert.deepEqual(result, {
    agentId: "agent-1",
    projectRoot: "/tmp/my-app"
  });
  assert.deepEqual(events, [
    "workspace:my-app",
    "snapshot:none",
    "agent:Scaffold a new Next.js project.",
    "snapshot:agent-1",
    "handoff:agent-1:Scaffold a new Next.js project.",
    "snapshot:agent-1"
  ]);
});

test("launchProjectScaffoldAgent stops when the folder picker is cancelled", async () => {
  const events: string[] = [];
  const deps: LaunchProjectScaffoldAgentDeps = {
    createProjectWorkspace: async () => {
      events.push("workspace");
      return {
        state: createState(null),
        projectRoot: null
      };
    },
    createAgent: async () => {
      events.push("agent");
      return createState("agent-1");
    },
    normalizeSnapshot: (snapshot) => snapshot,
    updateSnapshot: (snapshot) => {
      events.push(`snapshot:${snapshot.focusedAgentId ?? "none"}`);
    },
    handoffPrompt: async () => {
      events.push("handoff");
    }
  };

  const result = await launchProjectScaffoldAgent({ payload: createPayload(), projectName: "my-app" }, deps);

  assert.deepEqual(result, {
    agentId: null,
    projectRoot: null
  });
  assert.deepEqual(events, [
    "workspace",
    "snapshot:none"
  ]);
});

test("launchProjectScaffoldAgent skips terminal handoff when the agent receives the prompt at launch", async () => {
  const events: string[] = [];
  const payload = {
    ...createPayload(),
    initialPromptDelivery: "launch-command" as const
  };
  const deps: LaunchProjectScaffoldAgentDeps = {
    createProjectWorkspace: async () => ({
      state: createState(null),
      projectRoot: "/tmp/my-app"
    }),
    createAgent: async () => {
      events.push("agent");
      return createState("agent-1");
    },
    normalizeSnapshot: (snapshot) => snapshot,
    updateSnapshot: (snapshot) => {
      events.push(`snapshot:${snapshot.focusedAgentId ?? "none"}`);
    },
    handoffPrompt: async () => {
      events.push("handoff");
    }
  };

  const result = await launchProjectScaffoldAgent({ payload, projectName: "my-app" }, deps);

  assert.deepEqual(result, {
    agentId: "agent-1",
    projectRoot: "/tmp/my-app"
  });
  assert.deepEqual(events, [
    "snapshot:none",
    "agent",
    "snapshot:agent-1"
  ]);
});
