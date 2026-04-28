import { launchAgent, launchAgentWithInstruction } from "@/components/app/logic/launchAgentWithInstruction";
import type { LaunchAgentOptions, LaunchAgentWithInstructionOptions } from "@/components/app/types/agentLaunchWorkflow.types";
import type { AppState, CreateAgentPayload } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

type Harness = {
  events: string[];
  options: LaunchAgentWithInstructionOptions;
};

function createSnapshot(agentId: string | null): AppState {
  return {
    screen: "project-selector",
    project: null,
    projectBranches: [],
    currentSessionId: null,
    sessions: [],
    worktrees: [],
    workspaces: [],
    recentProjects: [],
    focusedAgentId: agentId,
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
    agents: agentId
      ? [{
          id: agentId,
          projectId: "project-1",
          sessionId: "session-1",
          worktreeId: "worktree-1",
          mode: "write",
          name: "Agent One",
          toolId: "codex",
          toolLabel: "Codex",
          status: "running",
          workspace: "/tmp/project",
          branch: "main",
          host: "local",
          task: "Do the thing",
          command: "codex",
          pid: 123,
          lastEventAt: "2026-04-28T10:00:00.000Z",
          lastTerminalLine: "",
          resumeSessionId: null,
          resumeCommand: null,
          contextFilePath: "",
          terminalStreamPath: "",
          isBusy: false,
          busyUntil: null,
          terminalOutput: [],
          rawTerminalOutput: "",
          changeSummary: null
        }]
      : [],
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
    name: "Agent One",
    task: "Do the thing",
    commandOverride: "",
    mode: "write",
    target: { kind: "new" }
  };
}

function createHarness(overrides: Partial<LaunchAgentWithInstructionOptions> = {}): Harness {
  const events: string[] = [];
  let nextStatusId = 1;

  return {
    events,
    options: {
      payload: createPayload(),
      createAgent: async () => createSnapshot("agent-1"),
      instruction: "Review this task",
      handoffStatusMessage: "Sending task details",
      statusBar: {
        beginStatus: (message, loading) => {
          events.push(`begin:${message}:${String(loading)}`);
          const statusId = nextStatusId;
          nextStatusId += 1;
          return statusId;
        },
        endStatus: (statusId) => {
          events.push(`end:${statusId}`);
        }
      },
      updateSnapshot: () => {
        events.push("update");
      },
      focusAgent: async (agentId) => {
        events.push(`focus:${agentId}`);
      },
      trackCreation: (payload) => {
        events.push(`track:${payload.name}`);
      },
      onCreated: async ({ agentId }) => {
        events.push(`created:${agentId}`);
      },
      handoffInstruction: async ({ agentId, instruction, focusAgent, updateSnapshot }) => {
        events.push(`handoff:${agentId}:${instruction}`);
        await focusAgent?.(agentId);
        updateSnapshot(createSnapshot(agentId));
      },
      ...overrides
    }
  };
}

function createLaunchHarness(overrides: Partial<LaunchAgentOptions> = {}): {
  events: string[];
  options: LaunchAgentOptions;
} {
  const events: string[] = [];

  return {
    events,
    options: {
      payload: createPayload(),
      createAgent: async () => createSnapshot("agent-1"),
      trackCreation: (payload) => {
        events.push(`track:${payload.name}`);
      },
      onCreated: async ({ agentId }) => {
        events.push(`created:${agentId}`);
      },
      ...overrides
    }
  };
}

test("launchAgentWithInstruction tracks, stages, and hands off the focused agent", async () => {
  const { events, options } = createHarness();

  const result = await launchAgentWithInstruction(options);

  assert.equal(result?.agentId, "agent-1");
  assert.equal(result?.createdAgent?.sessionId, "session-1");
  assert.equal(result?.snapshot.focusedAgentId, "agent-1");
  assert.deepEqual(events, [
    "track:Agent One",
    "created:agent-1",
    "begin:Sending task details:true",
    "handoff:agent-1:Review this task",
    "focus:agent-1",
    "update",
    "end:1"
  ]);
});

test("launchAgentWithInstruction skips handoff when no focused agent is available", async () => {
  const { events, options } = createHarness({
    createAgent: async () => createSnapshot(null)
  });

  const result = await launchAgentWithInstruction(options);

  assert.equal(result, null);
  assert.deepEqual(events, []);
});

test("launchAgentWithInstruction always ends the status when handoff fails", async () => {
  const { events, options } = createHarness({
    handoffInstruction: async () => {
      throw new Error("boom");
    }
  });

  await assert.rejects(() => launchAgentWithInstruction(options), /boom/);
  assert.deepEqual(events, [
    "track:Agent One",
    "created:agent-1",
    "begin:Sending task details:true",
    "end:1"
  ]);
});

test("launchAgent returns the created agent without opening handoff status when no handoff is configured", async () => {
  const { events, options } = createLaunchHarness();

  const result = await launchAgent(options);

  assert.equal(result?.agentId, "agent-1");
  assert.equal(result?.createdAgent?.sessionId, "session-1");
  assert.deepEqual(events, [
    "track:Agent One",
    "created:agent-1"
  ]);
});
