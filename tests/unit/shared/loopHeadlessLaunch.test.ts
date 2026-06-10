import {
  buildLoopHeadlessShellCommand,
  canRunLoopHeadless,
  describeLoopHeadlessUnsupportedTool
} from "@shared/loopHeadlessLaunch";
import assert from "node:assert/strict";
import test from "node:test";

test("canRunLoopHeadless covers headless-capable loop agents", () => {
  assert.equal(canRunLoopHeadless("codex"), true);
  assert.equal(canRunLoopHeadless("cursor"), true);
  assert.equal(canRunLoopHeadless("aider"), true);
  assert.equal(canRunLoopHeadless("openclaw"), false);
  assert.match(describeLoopHeadlessUnsupportedTool("openclaw"), /headless or upfront prompt/i);
});

test("buildLoopHeadlessShellCommand presets cursor headless trust and force", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "cursor",
    roleKind: "writer",
    detectedCommand: "cursor-agent",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(
    command,
    "cursor-agent -p --trust --output-format text --workspace '/tmp/worktree' --force 'Implement the loop task'"
  );
});

test("buildLoopHeadlessShellCommand presets codex exec for writer turns", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "codex",
    roleKind: "writer",
    detectedCommand: "codex",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(
    command,
    "codex --no-alt-screen exec --json --color never --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox 'Implement the loop task'"
  );
});

test("buildLoopHeadlessShellCommand presets claude plan mode for reviewers", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "claude",
    roleKind: "reviewer",
    detectedCommand: "claude",
    prompt: "Review the implementation",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(
    command,
    "claude -p --permission-mode plan --output-format stream-json --verbose 'Review the implementation'"
  );
});

test("buildLoopHeadlessShellCommand presets gemini stream-json for writers", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "gemini",
    roleKind: "writer",
    detectedCommand: "gemini",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(
    command,
    "gemini --skip-trust --output-format stream-json --prompt 'Implement the loop task' --approval-mode yolo"
  );
});

test("buildLoopHeadlessShellCommand builds aider message mode", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "aider",
    roleKind: "writer",
    detectedCommand: "aider",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(
    command,
    "aider --message 'Implement the loop task' --yes-always --no-show-release-notes"
  );
});

test("buildLoopHeadlessShellCommand builds goose run headless turns", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "goose",
    roleKind: "writer",
    detectedCommand: "goose session",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(command, "goose run -t 'Implement the loop task' --no-session -q");
});

test("buildLoopHeadlessShellCommand builds copilot print mode with writer tools", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "copilot",
    roleKind: "writer",
    detectedCommand: "copilot",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(
    command,
    "copilot -p 'Implement the loop task' -s --no-ask-user --allow-tool write --allow-tool shell"
  );
});

test("buildLoopHeadlessShellCommand builds cline reviewer plan mode", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "cline",
    roleKind: "reviewer",
    detectedCommand: "cline",
    prompt: "Review the implementation",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(command, "cline -y -p 'Review the implementation'");
});

test("buildLoopHeadlessShellCommand builds rovo yolo run turns", () => {
  const command = buildLoopHeadlessShellCommand({
    toolId: "rovo",
    roleKind: "writer",
    detectedCommand: "acli rovodev run",
    prompt: "Implement the loop task",
    workspacePath: "/tmp/worktree",
    isWindowsPlatform: false
  });

  assert.equal(command, "acli rovodev run --yolo 'Implement the loop task'");
});

test("buildLoopHeadlessShellCommand rejects unsupported loop agents", () => {
  assert.throws(
    () => buildLoopHeadlessShellCommand({
      toolId: "openclaw",
      roleKind: "writer",
      detectedCommand: "openclaw",
      prompt: "Implement the loop task",
      workspacePath: "/tmp/worktree",
      isWindowsPlatform: false
    }),
    /headless or upfront prompt/i
  );
});
