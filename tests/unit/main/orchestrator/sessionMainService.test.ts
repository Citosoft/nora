import { SessionMainService } from "@main/orchestrator/domainMainServices/sessionMainService";
import type { SessionMainServiceDeps } from "@main/orchestrator/domainMainServices/sessionMainService.types";
import type { AgentContextEntry, AgentSession, AppState } from "@shared/appTypes";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

function createAgent(overrides: Partial<AgentSession>): AgentSession {
  return {
    id: "agent-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    mode: "write",
    name: "Target Agent",
    toolId: "codex",
    toolLabel: "Codex",
    status: "running",
    workspace: "/tmp/project",
    branch: "main",
    host: "local",
    task: "Investigate failures",
    command: "codex",
    pid: 123,
    lastEventAt: "2026-04-29T10:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: null,
    resumeCommand: null,
    contextFilePath: "/tmp/project/.nora/context.md",
    terminalStreamPath: "/tmp/project/.nora/terminal.log",
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "",
    changeSummary: null,
    ...overrides
  };
}

function createSnapshot(agents: AgentSession[]): AppState {
  return {
    screen: "project-selector",
    project: null,
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
    agents,
    terminals: [],
    terminalShells: [],
    agentCatalog: [],
    agentSkillCatalogs: [],
    errorMessage: null
  };
}

function createDeps(args: {
  snapshot: AppState;
  sourceEntriesByAgentId?: Record<string, AgentContextEntry[]>;
  writes: string[];
  appendedEntries: AgentContextEntry[][];
  bundleWrites: Array<{ agentId: string; bundleId: string; content: string }>;
  writeAgentContextBundle?: SessionMainServiceDeps["writeAgentContextBundle"];
}): SessionMainServiceDeps {
  return {
    sessionCreation: {
      createAgent: async () => {
        throw new Error("not used");
      },
      createTerminal: async () => {
        throw new Error("not used");
      }
    },
    localTerminal: {
      openLocalTerminal: async () => {
        throw new Error("not used");
      },
      clearLocalTerminal: async () => null,
      restartLocalTerminal: async () => {
        throw new Error("not used");
      },
      destroyLocalTerminal: async () => null
    },
    sessionLifecycle: {
      focusWorktree: async () => {
        throw new Error("not used");
      },
      focusAgent: async () => {
        throw new Error("not used");
      },
      focusTerminal: async () => {
        throw new Error("not used");
      },
      restartAgent: async () => {
        throw new Error("not used");
      },
      restartTerminal: async () => {
        throw new Error("not used");
      },
      destroyAgent: async () => {
        throw new Error("not used");
      },
      destroyTerminal: async () => {
        throw new Error("not used");
      },
      removeWorktree: async () => {
        throw new Error("not used");
      },
      refreshWorktreeCollectionAfterDetach: async (_project, worktrees) => {
        return worktrees;
      },
      refreshWorktreeCollectionAfterTerminalDetach: async (_project, worktrees) => {
        return worktrees;
      }
    },
    getAgentTerminalActionDependencies: () => ({
      nowIso: () => "2026-04-29T10:00:00.000Z",
      getSnapshot: () => args.snapshot,
      getPtySession: () => ({
        write: (input: string) => {
          args.writes.push(input);
        }
      }),
      getContextWriteChain: () => null,
      setContextWriteChain: () => undefined,
      setTerminalBuffer: () => undefined,
      deleteTerminalActivity: () => undefined,
      updateAgent: () => undefined,
      updateTerminal: () => undefined,
      resetTerminalTranscript: async () => undefined,
      clearAgentContextFile: async () => undefined
    }),
    getSessionActionDependencies: () => ({
      getSnapshot: () => args.snapshot,
      refreshProjectState: async () => args.snapshot,
      commitWorkspaceChanges: async () => undefined,
      pullWorkspaceChanges: async () => undefined,
      pushWorkspaceChanges: async () => undefined,
      appendAgentSystemMessage: () => undefined,
      stopAllAgents: async () => undefined,
      killAgentSession: () => undefined,
      setAgentStopped: () => undefined,
      hasAgentSession: () => false,
      writeAgentSessionInput: () => undefined,
      delay: async () => undefined
    }),
    getSnapshot: () => args.snapshot,
    nowIso: () => "2026-04-29T10:00:00.000Z",
    randomId: () => "bundle-1",
    readAgentContextEntries: async (agent) => args.sourceEntriesByAgentId?.[agent.id] ?? [],
    appendAgentContextEntries: async (_agent, entries) => {
      args.appendedEntries.push(entries);
    },
    updateTerminal: () => undefined,
    writeAgentContextBundle:
      args.writeAgentContextBundle ??
      (async (agent, bundleId, content) => {
        args.bundleWrites.push({ agentId: agent.id, bundleId, content });
        return `/tmp/project/.nora/context-bundle-${bundleId}.md`;
      }),
    resizeRuntimeSession: () => undefined
  };
}

test("sendAgentPrompt writes bundle-backed prompts and records exact provenance entries", async () => {
  const targetAgent = createAgent({ id: "agent-target", name: "Target Agent" });
  const sourceAgent = createAgent({
    id: "agent-source",
    name: "Source Agent",
    contextFilePath: "/tmp/project/.nora/source-context.md",
    terminalStreamPath: "/tmp/project/.nora/source-terminal.log"
  });
  const sourceEntries: AgentContextEntry[] = [{
    id: "entry-1",
    agentId: sourceAgent.id,
    projectId: sourceAgent.projectId,
    sessionId: sourceAgent.sessionId,
    worktreeId: sourceAgent.worktreeId,
    createdAt: "2026-04-29T09:55:00.000Z",
    kind: "agent-output",
    precision: "exact",
    source: "harness",
    title: "Source Agent output",
    content: "Investigate the failing authentication test and keep the DB migration in mind.",
    preview: "Investigate the failing authentication test",
    estimate: {
      characters: 74,
      estimatedTokens: 19
    },
    references: [],
    sourceAgentIds: []
  }];
  const writes: string[] = [];
  const appendedEntries: AgentContextEntry[][] = [];
  const bundleWrites: Array<{ agentId: string; bundleId: string; content: string }> = [];
  const service = new SessionMainService(createDeps({
    snapshot: createSnapshot([targetAgent, sourceAgent]),
    sourceEntriesByAgentId: {
      [sourceAgent.id]: sourceEntries
    },
    writes,
    appendedEntries,
    bundleWrites
  }));

  const result = await service.sendAgentPrompt(targetAgent.id, {
    source: "composer",
    title: "Follow-up prompt",
    text: "Continue from the previous debugging work.",
    workspacePaths: [{ path: "/tmp/project/tasks/auth.md", kind: "file" }],
    contextSelections: [{
      sourceAgentId: sourceAgent.id,
      entryIds: ["entry-1"]
    }],
    references: [{ kind: "workspace-path", label: "Task file", value: "/tmp/project/tasks/auth.md" }]
  });

  assert.equal(result.agentId, targetAgent.id);
  assert.equal(result.bundleFilePath, "/tmp/project/.nora/context-bundle-bundle-1.md");
  assert.match(result.compiledPrompt, /Continue from the previous debugging work\./);
  assert.match(result.compiledPrompt, /Shared agent context bundle:\n- \/tmp\/project\/\.nora\/context-bundle-bundle-1\.md/);
  assert.match(result.compiledPrompt, /Attached workspace paths:\n- \/tmp\/project\/tasks\/auth\.md/);
  assert.deepEqual(writes, [`${result.compiledPrompt}\r`]);
  assert.equal(bundleWrites.length, 1);
  assert.equal(bundleWrites[0]?.agentId, targetAgent.id);
  assert.equal(bundleWrites[0]?.bundleId, "bundle-1");
  assert.match(bundleWrites[0]?.content || "", /## Source Agent \(Codex\)/);
  assert.match(bundleWrites[0]?.content || "", /Investigate the failing authentication test/);
  assert.equal(appendedEntries.length, 1);
  assert.deepEqual(
    appendedEntries[0]?.map((entry) => entry.kind),
    ["user-prompt", "workspace-paths", "context-bundle"]
  );
  assert.deepEqual(appendedEntries[0]?.[2]?.sourceAgentIds, [sourceAgent.id]);
  assert.equal(appendedEntries[0]?.[0]?.precision, "exact");
  assert.deepEqual(appendedEntries[0]?.[1]?.references, [{
    kind: "workspace-path",
    label: "File",
    value: "/tmp/project/tasks/auth.md"
  }]);
});

test("sendAgentPrompt places bundle under workspace .nora/imported_context when copy succeeds", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nora-smsvc-import-"));
  const workspace = path.join(tmp, "checkout");
  await fs.mkdir(workspace, { recursive: true });
  const targetAgent = createAgent({
    id: "agent-target",
    name: "Target Agent",
    workspace,
    contextFilePath: path.join(tmp, "nora-meta", "context-agent-target.md"),
    terminalStreamPath: path.join(tmp, "nora-meta", "terminal-agent-target.log")
  });
  const sourceAgent = createAgent({
    id: "agent-source",
    name: "Source Agent",
    workspace: path.join(tmp, "other-checkout"),
    contextFilePath: path.join(tmp, "nora-meta", "context-source.md"),
    terminalStreamPath: path.join(tmp, "nora-meta", "terminal-source.log")
  });
  const sourceEntries: AgentContextEntry[] = [{
    id: "entry-1",
    agentId: sourceAgent.id,
    projectId: sourceAgent.projectId,
    sessionId: sourceAgent.sessionId,
    worktreeId: sourceAgent.worktreeId,
    createdAt: "2026-04-29T09:55:00.000Z",
    kind: "agent-output",
    precision: "exact",
    source: "harness",
    title: "Line",
    content: "hello",
    preview: "hello",
    estimate: { characters: 5, estimatedTokens: 2 },
    references: [],
    sourceAgentIds: []
  }];

  const writes: string[] = [];
  const appendedEntries: AgentContextEntry[][] = [];
  const bundleWrites: Array<{ agentId: string; bundleId: string; content: string }> = [];
  const internalBundleRoot = path.join(tmp, "bundles");
  const service = new SessionMainService(createDeps({
    snapshot: createSnapshot([targetAgent, sourceAgent]),
    sourceEntriesByAgentId: { [sourceAgent.id]: sourceEntries },
    writes,
    appendedEntries,
    bundleWrites,
    writeAgentContextBundle: async (agent, bundleId, content) => {
      bundleWrites.push({ agentId: agent.id, bundleId, content });
      const p = path.join(internalBundleRoot, `context-bundle-${bundleId}.md`);
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, content, "utf8");
      return p;
    }
  }));

  const result = await service.sendAgentPrompt(targetAgent.id, {
    source: "composer",
    title: "Handoff",
    text: "Go",
    workspacePaths: [],
    contextSelections: [{ sourceAgentId: sourceAgent.id, entryIds: ["entry-1"] }],
    references: []
  });

  const expectedImport = path.join(workspace, ".nora", "imported_context", "context-bundle-bundle-1.md");
  assert.equal(result.bundleFilePath, expectedImport);
  assert.ok(result.compiledPrompt.includes(`Shared agent context bundle:\n- ${expectedImport}`));
  const gi = await fs.readFile(path.join(workspace, ".nora", ".gitignore"), "utf8");
  assert.match(gi, /imported_context\//);
});
