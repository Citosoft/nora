import { createToolingHelpers } from "@main/orchestrator/tooling";
import type { ToolingHelperDeps } from "@main/types/orchestratorTooling.types";
import type {
  AgentCatalogEntry,
  AgentSkillCatalog,
  AgentSkillSearchResult,
  AgentToolConfig,
  AppState,
  ToolUsageInfo
} from "@shared/appTypes";
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function createAgentCatalogEntry(partial: Partial<AgentCatalogEntry> = {}): AgentCatalogEntry {
  return {
    id: "codex",
    label: "Codex",
    aliases: ["codex"],
    launchCommand: "codex",
    installTemplate: "node install.js",
    description: "Codex CLI",
    usageNotes: [],
    authFields: [],
    supportsUsageStatus: true,
    usageDashboardUrl: null,
    supportsAccountSwitch: true,
    detected: false,
    enabled: true,
    detectedCommand: null,
    detectedPath: null,
    detectionProbe: null,
    detectionStdout: null,
    detectionStderr: null,
    installStatus: "idle",
    installLog: [],
    config: {
      values: {},
      updatedAt: null
    },
    ...partial
  };
}

function createAppState(agentCatalog: AgentCatalogEntry[]): AppState {
  return {
    screen: "workspace",
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
    agents: [],
    terminals: [],
    terminalShells: [],
    agentCatalog,
    agentSkillCatalogs: [],
    errorMessage: null
  };
}

function createSkillCatalog(toolId: string): AgentSkillCatalog {
  return {
    toolId,
    supported: false,
    rootPath: null,
    skills: [],
    sourceLabel: null,
    installHint: null,
    errorMessage: null,
    refreshedAt: null
  };
}

function createAgentDetectionCacheDeps(
  partial: Partial<ToolingHelperDeps> = {}
): Pick<
  ToolingHelperDeps,
  | "detectLocalAgentCatalog"
  | "resolveLocalAgentCatalogDetections"
  | "peekLocalAgentCatalogDetections"
  | "invalidateLocalAgentDetectionCache"
  | "reconcileWorkspaceAgentsAfterCatalogRefresh"
> {
  return {
    detectLocalAgentCatalog: async () => [],
    resolveLocalAgentCatalogDetections: async () => [],
    peekLocalAgentCatalogDetections: () => null,
    invalidateLocalAgentDetectionCache: () => undefined,
    reconcileWorkspaceAgentsAfterCatalogRefresh: async () => undefined,
    ...partial
  };
}

function createSwitchToolDeps(tool: AgentCatalogEntry, onCommand: (command: string) => void): ToolingHelperDeps {
  let state = createAppState([tool]);
  return {
    ...createAgentDetectionCacheDeps(),
    nowIso: () => "2026-06-02T00:00:00.000Z",
    detectRemoteAgentCatalog: async () => [],
    buildAgentCatalog: () => state.agentCatalog,
    getToolConfigs: () => ({}),
    readAgentSkillCatalogs: async (toolIds) => toolIds.map(createSkillCatalog),
    sharedAgentSkillsToolId: "shared-agent-skills",
    getSnapshot: () => state,
    getProjectTarget: () => {
      throw new Error("Unexpected project target request.");
    },
    saveProject: async () => undefined,
    updateState: (updater) => {
      state = updater(state);
    },
    refreshWorkspaceSummaries: async () => undefined,
    getDefaultToolCommand: () => null,
    getInstallCommandExecution: (command) => {
      onCommand(command);
      return {
        executable: process.execPath,
        args: ["-e", "process.exit(0)"]
      };
    },
    maxInstallLogLines: 20,
    hasInstallSession: () => false,
    setInstallSession: () => undefined,
    deleteInstallSession: () => undefined,
    updateCatalogTool: (toolId, partial) => {
      state = {
        ...state,
        agentCatalog: state.agentCatalog.map((entry) =>
          entry.id === toolId
            ? {
                ...entry,
                ...partial
              }
            : entry
        )
      };
    },
    installAgentSkill: async (toolId) => createSkillCatalog(toolId),
    removeAgentSkill: async (toolId) => createSkillCatalog(toolId),
    updateAgentSkillCatalog: () => undefined,
    saveToolConfigStore: async (_toolId, values) => ({
      codex: {
        values,
        updatedAt: "2026-06-02T00:00:00.000Z"
      } satisfies AgentToolConfig
    }),
    setToolConfigs: () => undefined,
    getCliToolStatus: async (): Promise<ToolUsageInfo | null> => null,
    searchAgentSkills: async (toolId, query): Promise<AgentSkillSearchResult> => ({
      toolId,
      query,
      command: "",
      status: "available",
      lines: [],
      rawOutput: "",
      matches: [],
      fetchedAt: "2026-06-02T00:00:00.000Z"
    })
  };
}

function writeFakeCliExecutable(basePath: string, scriptLines: string[]): string {
  const scriptBody = scriptLines.join("\n");
  if (process.platform === "win32") {
    const jsPath = `${basePath}.js`;
    const cmdPath = `${basePath}.cmd`;
    writeFileSync(jsPath, scriptBody, "utf8");
    writeFileSync(cmdPath, `@echo off\r\nnode "${jsPath}" %*\r\n`, "utf8");
    return cmdPath;
  }

  writeFileSync(basePath, ["#!/usr/bin/env node", scriptBody].join("\n"), "utf8");
  chmodSync(basePath, 0o755);
  return basePath;
}

async function waitForJsonFile<Value>(filePath: string): Promise<Value> {
  const startedAt = Date.now();
  while (true) {
    if (existsSync(filePath)) {
      try {
        return JSON.parse(readFileSync(filePath, "utf8")) as Value;
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
      }
    }
    if (Date.now() - startedAt > 1000) {
      throw new Error(`Timed out waiting for valid JSON in ${filePath}.`);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }
}

test("installAgentTool resolves with refreshed detection after installer exit", async () => {
  let state = createAppState([createAgentCatalogEntry()]);
  const installStatuses: AgentCatalogEntry["installStatus"][] = [];
  const installSessions = new Set<string>();

  const deps: ToolingHelperDeps = {
    ...createAgentDetectionCacheDeps({
      resolveLocalAgentCatalogDetections: async () => [
        {
          id: "codex",
          detected: true,
          detectedCommand: "codex",
          detectedPath: "/usr/local/bin/codex",
          detectionProbe: "command -v codex",
          detectionStdout: "/usr/local/bin/codex",
          detectionStderr: null
        }
      ]
    }),
    nowIso: () => "2026-06-02T00:00:00.000Z",
    detectRemoteAgentCatalog: async () => [],
    buildAgentCatalog: (detections, existingCatalog) =>
      existingCatalog.map((tool) => {
        const detected = detections.find((entry) => entry.id === tool.id);
        if (!detected) {
          return tool;
        }

        return {
          ...tool,
          detected: detected.detected,
          detectedCommand: detected.detectedCommand,
          detectedPath: detected.detectedPath,
          detectionProbe: detected.detectionProbe,
          detectionStdout: detected.detectionStdout,
          detectionStderr: detected.detectionStderr
        };
      }),
    getToolConfigs: () => ({}),
    readAgentSkillCatalogs: async (toolIds) => toolIds.map(createSkillCatalog),
    sharedAgentSkillsToolId: "shared-agent-skills",
    getSnapshot: () => state,
    getProjectTarget: () => {
      throw new Error("Unexpected project target request.");
    },
    saveProject: async () => undefined,
    updateState: (updater) => {
      state = updater(state);
    },
    refreshWorkspaceSummaries: async () => undefined,
    getDefaultToolCommand: () => "node install.js",
    getInstallCommandExecution: () => ({
      executable: process.execPath,
      args: ["-e", "process.exit(0)"]
    }),
    maxInstallLogLines: 20,
    hasInstallSession: (toolId) => installSessions.has(toolId),
    setInstallSession: (toolId) => {
      installSessions.add(toolId);
    },
    deleteInstallSession: (toolId) => {
      installSessions.delete(toolId);
    },
    updateCatalogTool: (toolId, partial) => {
      if (partial.installStatus) {
        installStatuses.push(partial.installStatus);
      }
      state = {
        ...state,
        agentCatalog: state.agentCatalog.map((tool) =>
          tool.id === toolId
            ? {
                ...tool,
                ...partial
              }
            : tool
        )
      };
    },
    installAgentSkill: async (toolId) => createSkillCatalog(toolId),
    removeAgentSkill: async (toolId) => createSkillCatalog(toolId),
    updateAgentSkillCatalog: (catalog) => {
      state = {
        ...state,
        agentSkillCatalogs: [catalog]
      };
    },
    saveToolConfigStore: async (_toolId, values) => ({
      codex: {
        values,
        updatedAt: "2026-06-02T00:00:00.000Z"
      } satisfies AgentToolConfig
    }),
    setToolConfigs: () => undefined,
    getCliToolStatus: async (): Promise<ToolUsageInfo | null> => null,
    searchAgentSkills: async (toolId, query): Promise<AgentSkillSearchResult> => ({
      toolId,
      query,
      command: "",
      status: "available",
      lines: [],
      rawOutput: "",
      matches: [],
      fetchedAt: "2026-06-02T00:00:00.000Z"
    })
  };

  const helpers = createToolingHelpers(deps);
  const installResult = helpers.installAgentTool({
    toolId: "codex",
    action: "install",
    installCommand: "node install.js"
  });

  assert.equal(state.agentCatalog[0]?.installStatus, "running");
  assert.equal(installSessions.has("codex"), true);

  const result = await installResult;

  assert.deepEqual(installStatuses, ["running", "installed"]);
  assert.equal(installSessions.has("codex"), false);
  assert.equal(result.agentCatalog[0]?.detected, true);
  assert.equal(result.agentCatalog[0]?.detectedPath, "/usr/local/bin/codex");
});

test("switchToolAccount uses Claude Code's browser auth command", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "nora-claude-switch-"));
  const argvPath = join(tempRoot, "argv.json");
  const executablePath = writeFakeCliExecutable(join(tempRoot, "fake-claude"), [
    "const fs = require('node:fs');",
    `fs.writeFileSync(${JSON.stringify(argvPath)}, JSON.stringify(process.argv.slice(2)));`
  ]);
  const tool = createAgentCatalogEntry({
    id: "claude",
    label: "Claude Code",
    aliases: ["claude", "claude-code"],
    supportsUsageStatus: true,
    supportsAccountSwitch: true,
    detected: true,
    detectedCommand: executablePath
  });

  try {
    const helpers = createToolingHelpers(createSwitchToolDeps(tool, () => {
      throw new Error("Claude switch should spawn the CLI directly.");
    }));

    await helpers.switchToolAccount("claude");

    const argv = await waitForJsonFile<string[]>(argvPath);
    assert.deepEqual(argv, ["auth", "login", "--claudeai"]);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("switchToolAccount resolves after launching Claude browser auth", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "nora-claude-switch-running-"));
  const childInfoPath = join(tempRoot, "child.json");
  const executablePath = writeFakeCliExecutable(join(tempRoot, "fake-claude"), [
    "const fs = require('node:fs');",
    `fs.writeFileSync(${JSON.stringify(childInfoPath)}, JSON.stringify({ pid: process.pid, argv: process.argv.slice(2) }));`,
    "setTimeout(() => process.exit(0), 30000);"
  ]);
  const tool = createAgentCatalogEntry({
    id: "claude",
    label: "Claude Code",
    aliases: ["claude", "claude-code"],
    supportsUsageStatus: true,
    supportsAccountSwitch: true,
    detected: true,
    detectedCommand: executablePath
  });

  try {
    const helpers = createToolingHelpers(createSwitchToolDeps(tool, () => {
      throw new Error("Claude switch should spawn the CLI directly.");
    }));

    await Promise.race([
      helpers.switchToolAccount("claude"),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Claude switch did not resolve after launch.")), 1000);
      })
    ]);

    const childInfo = await waitForJsonFile<{ pid: number; argv: string[] }>(childInfoPath);
    assert.deepEqual(childInfo.argv, ["auth", "login", "--claudeai"]);
    process.kill(childInfo.pid);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("switchToolAccount keeps logout/login flow for Codex", async () => {
  let command = "";
  const tool = createAgentCatalogEntry({
    detected: true,
    detectedCommand: "codex"
  });

  const helpers = createToolingHelpers(createSwitchToolDeps(tool, (nextCommand) => {
    command = nextCommand;
  }));

  await helpers.switchToolAccount("codex");

  assert.equal(command, "codex logout && codex login");
});
