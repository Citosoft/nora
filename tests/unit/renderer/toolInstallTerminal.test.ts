import { createToolInstallTerminalPayload } from "@/components/app/logic/toolInstallTerminal";
import assert from "node:assert/strict";
import test from "node:test";

test("createToolInstallTerminalPayload builds a root script terminal payload", () => {
  const payload = createToolInstallTerminalPayload("Codex", "npm install -g @openai/codex", "darwin");

  assert.equal(payload.name, "Install Codex");
  assert.equal(payload.target.kind, "root");
  assert.equal(payload.launchConfig.kind, "script");
  assert.equal(payload.launchConfig.label, "Install Codex");
  assert.equal(payload.launchConfig.command.includes("npm install -g @openai/codex"), true);
  assert.equal(payload.launchConfig.command.includes("__NORA_INSTALL_EXIT_CODE__:$exit_code"), true);
  assert.equal(payload.launchConfig.command.includes("exec ${SHELL:-/bin/zsh} -il"), true);
});

test("createToolInstallTerminalPayload normalizes empty label and command whitespace", () => {
  const payload = createToolInstallTerminalPayload("   ", "  brew install node  ", "darwin");

  assert.equal(payload.name, "Install CLI");
  assert.equal(payload.launchConfig.label, "Install CLI");
  assert.equal(payload.launchConfig.command.includes("brew install node"), true);
});

test("createToolInstallTerminalPayload keeps command unchanged on win32", () => {
  const payload = createToolInstallTerminalPayload("Codex", "npm install -g @openai/codex", "win32");
  assert.equal(payload.launchConfig.command, "npm install -g @openai/codex");
});
