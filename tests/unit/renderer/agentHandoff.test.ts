import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraAppClient } from "@/components/app/clients/noraAppClient";
import { sendAgentTerminalText } from "@/components/app/logic/agentHandoff";
import type { AppState } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createSnapshot(agentId: string): AppState {
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
    agents: [],
    terminals: [],
    terminalShells: [],
    agentCatalog: [],
    agentSkillCatalogs: [],
    errorMessage: null
  };
}

test("sendAgentTerminalText focuses, submits, and updates snapshot when requested", async () => {
  const events: string[] = [];
  const originalSendAgentTerminalInput = noraAgentClient.sendAgentTerminalInput;
  const originalGetSnapshot = noraAppClient.getSnapshot;

  noraAgentClient.sendAgentTerminalInput = async (agentId, text) => {
    events.push(`send:${agentId}:${JSON.stringify(text)}`);
  };
  noraAppClient.getSnapshot = async () => createSnapshot("agent-1");

  try {
    await sendAgentTerminalText({
      agentId: "agent-1",
      text: "Selected text",
      focusAgent: async (agentId) => {
        events.push(`focus:${agentId}`);
      },
      submit: true,
      updateSnapshot: (snapshot) => {
        events.push(`snapshot:${snapshot.focusedAgentId}`);
      }
    });
  } finally {
    noraAgentClient.sendAgentTerminalInput = originalSendAgentTerminalInput;
    noraAppClient.getSnapshot = originalGetSnapshot;
  }

  assert.deepEqual(events, [
    "focus:agent-1",
    "send:agent-1:\"Selected text\"",
    "send:agent-1:\"\\r\"",
    "snapshot:agent-1"
  ]);
});

test("sendAgentTerminalText can send without submit or snapshot refresh", async () => {
  const events: string[] = [];
  const originalSendAgentTerminalInput = noraAgentClient.sendAgentTerminalInput;

  noraAgentClient.sendAgentTerminalInput = async (agentId, text) => {
    events.push(`send:${agentId}:${JSON.stringify(text)}`);
  };

  try {
    await sendAgentTerminalText({
      agentId: "agent-2",
      text: "Partial text"
    });
  } finally {
    noraAgentClient.sendAgentTerminalInput = originalSendAgentTerminalInput;
  }

  assert.deepEqual(events, [
    "send:agent-2:\"Partial text\""
  ]);
});
