import {
  addWorkspaceSplitViewTileAtPositionWithAutoExpand,
  appendWorkspaceSplitViewTileWithAutoExpand,
  WORKSPACE_SPLIT_VIEW_GRID_PRESETS,
  createWorkspaceSplitView,
  createWorkspaceSplitViewItemReference,
  isSameWorkspaceSplitViewItem
} from "@/components/app/logic/workspaceSplitViewUtils";
import type { BrowserTabState, FileEditorTab } from "@/components/app/types";
import type { AgentSession, TerminalSession, WorkspaceSplitViewItemReference } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

function createAgent(): AgentSession {
  return {
    id: "agent-1",
    projectId: "project-1",
    sessionId: "session-1",
    worktreeId: "worktree-1",
    mode: "write",
    name: "Builder",
    toolId: "codex",
    toolLabel: "Codex",
    status: "running",
    workspace: "/tmp/project",
    branch: "main",
    host: "local",
    task: "Build feature",
    command: "codex",
    pid: 1,
    lastEventAt: "2026-05-06T12:00:00.000Z",
    lastTerminalLine: "",
    resumeSessionId: null,
    resumeCommand: null,
    contextFilePath: "/tmp/project/.nora/context.md",
    terminalStreamPath: "/tmp/project/.nora/terminal.log",
    isBusy: false,
    busyUntil: null,
    terminalOutput: [],
    rawTerminalOutput: "",
    changeSummary: null
  };
}

function createTerminal(): TerminalSession {
  return {
    id: "terminal-1",
    projectId: "project-1",
    sessionId: "session-2",
    worktreeId: "worktree-1",
    name: "Shell",
    status: "running",
    isBusy: false,
    workspace: "/tmp/project",
    branch: "main",
    host: "local",
    shellId: "bash",
    shellLabel: "Bash",
    command: "bash",
    pid: 2,
    lastEventAt: "2026-05-06T12:00:00.000Z",
    lastTerminalLine: "",
    launchConfig: {
      kind: "blank",
      command: "",
      label: "Blank"
    },
    rawTerminalOutput: "",
    detectedLocalUrl: null,
    detectedLocalPort: null,
    changeSummary: null
  };
}

const browserTab: BrowserTabState = {
  id: "browser-1",
  projectId: "project-1",
  title: "Docs",
  faviconUrl: null,
  history: ["https://example.com/docs"],
  historyIndex: 0,
  status: "running"
};

const fileTab: FileEditorTab = {
  projectId: "project-1",
  path: "specs/launch.md",
  rootPath: null,
  kind: "text",
  content: "",
  savedContent: "",
  imageDataUrl: null,
  imageMimeType: null,
  isLoading: false,
  isSaving: false,
  errorMessage: null
};

test("createWorkspaceSplitViewItemReference prefers focused agent and terminal before center surfaces", () => {
  const agent = createAgent();
  const terminal = createTerminal();

  assert.deepEqual(
    createWorkspaceSplitViewItemReference(agent, terminal, browserTab, fileTab, "file"),
    {
      kind: "agent",
      agentId: agent.id,
      sessionId: agent.sessionId
    }
  );

  assert.deepEqual(
    createWorkspaceSplitViewItemReference(null, terminal, browserTab, fileTab, "file"),
    {
      kind: "terminal",
      terminalId: terminal.id,
      sessionId: terminal.sessionId
    }
  );
});

test("createWorkspaceSplitViewItemReference supports browser and file center surfaces", () => {
  assert.deepEqual(
    createWorkspaceSplitViewItemReference(null, null, browserTab, fileTab, null),
    {
      kind: "browser",
      tabId: "browser-1"
    }
  );

  assert.deepEqual(
    createWorkspaceSplitViewItemReference(null, null, null, fileTab, "file"),
    {
      kind: "file",
      path: "specs/launch.md"
    }
  );

  assert.equal(createWorkspaceSplitViewItemReference(null, null, null, fileTab, "diff"), null);
});

test("isSameWorkspaceSplitViewItem compares every supported item kind by stable identity", () => {
  const samePairs: Array<[WorkspaceSplitViewItemReference, WorkspaceSplitViewItemReference]> = [
    [
      { kind: "agent", agentId: "agent-1", sessionId: "session-a" },
      { kind: "agent", agentId: "agent-1", sessionId: "session-b" }
    ],
    [
      { kind: "terminal", terminalId: "terminal-1", sessionId: "session-a" },
      { kind: "terminal", terminalId: "terminal-1", sessionId: "session-b" }
    ],
    [
      { kind: "browser", tabId: "browser-1" },
      { kind: "browser", tabId: "browser-1" }
    ],
    [
      { kind: "file", path: "specs/launch.md" },
      { kind: "file", path: "specs/launch.md" }
    ]
  ];

  for (const [left, right] of samePairs) {
    assert.equal(isSameWorkspaceSplitViewItem(left, right), true);
  }

  assert.equal(
    isSameWorkspaceSplitViewItem(
      { kind: "browser", tabId: "browser-1" },
      { kind: "browser", tabId: "browser-2" }
    ),
    false
  );
  assert.equal(
    isSameWorkspaceSplitViewItem(
      { kind: "file", path: "specs/launch.md" },
      { kind: "file", path: "specs/review.md" }
    ),
    false
  );
});

test("WORKSPACE_SPLIT_VIEW_GRID_PRESETS includes the 2 x 1 side-by-side option", () => {
  assert.deepEqual(
    WORKSPACE_SPLIT_VIEW_GRID_PRESETS.map((preset) => `${preset.columns}x${preset.rows}`),
    ["2x1", "1x2", "2x2", "3x2", "4x2"]
  );
});

test("appendWorkspaceSplitViewTileWithAutoExpand grows a full 2 x 1 view into 2 x 2", () => {
  const view = createWorkspaceSplitView("Daily", { kind: "agent", agentId: "agent-1", sessionId: "session-1" }, 2, 1);
  const withTwoTiles = appendWorkspaceSplitViewTileWithAutoExpand(view, {
    kind: "terminal",
    terminalId: "terminal-1",
    sessionId: "session-2"
  });

  const expanded = appendWorkspaceSplitViewTileWithAutoExpand(withTwoTiles, {
    kind: "browser",
    tabId: "browser-1"
  });

  assert.equal(expanded.gridColumns, 2);
  assert.equal(expanded.gridRows, 2);
  assert.equal(expanded.tiles.length, 3);
  assert.deepEqual(
    expanded.tiles.map((tile) => [tile.column, tile.row]),
    [
      [1, 1],
      [2, 1],
      [1, 2]
    ]
  );
});

test("addWorkspaceSplitViewTileAtPositionWithAutoExpand preserves the requested slot after expanding", () => {
  const view = createWorkspaceSplitView("Daily", { kind: "agent", agentId: "agent-1", sessionId: "session-1" }, 2, 1);
  const withTwoTiles = appendWorkspaceSplitViewTileWithAutoExpand(view, {
    kind: "terminal",
    terminalId: "terminal-1",
    sessionId: "session-2"
  });

  const expanded = addWorkspaceSplitViewTileAtPositionWithAutoExpand(
    withTwoTiles,
    { kind: "file", path: "specs/launch.md" },
    { column: 1, row: 2 }
  );

  const fileTile = expanded.tiles.find((tile) => tile.item.kind === "file");
  assert.equal(expanded.gridColumns, 2);
  assert.equal(expanded.gridRows, 2);
  assert.equal(fileTile?.column, 1);
  assert.equal(fileTile?.row, 2);
});
