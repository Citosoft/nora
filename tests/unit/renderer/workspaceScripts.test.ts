import assert from "node:assert/strict";
import { test } from "node:test";
import { createScriptTerminalDefaults, createScriptTerminalPayload } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceScriptLauncher } from "@shared/appTypes";

test("home command launches preserve the detected package manager and command and target the project root", () => {
  for (const packageManager of ["npm", "pnpm", "yarn"] as const) {
    const command = packageManager === "npm" ? "npm run start" : `${packageManager} start`;
    const script: WorkspaceScriptLauncher = { id: `${packageManager}:start`, packageManager, scriptName: "start", command, label: command };
    assert.deepEqual(createScriptTerminalPayload(script, "zsh"), {
      name: "run start", shellId: "zsh", target: { kind: "root" },
      launchConfig: { kind: "script", label: "run start", command, scriptName: "start", packageManager }
    });
    assert.equal(createScriptTerminalDefaults(script, "zsh").launchConfig.command, command);
    assert.equal(Object.hasOwn(createScriptTerminalDefaults(script, "zsh"), "target"), false);
  }
});
