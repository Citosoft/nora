import assert from "node:assert/strict";
import test from "node:test";
import { effectiveOrcaSetupScripts } from "@main/app-import/sources/orca/hookPrecedence";
import type { AppImportScriptPhase, AppImportSetupScript } from "@shared/types/app-import/appImportPlan.types";

function script(phase: AppImportScriptPhase, origin: AppImportSetupScript["origin"], command: string): AppImportSetupScript {
  return { importKey: `${origin}:${phase}`, workspaceImportKey: "ws", phase, label: command, command, origin };
}

const local = [script("setup", "appSettings", "pnpm install")];
const shared = [script("setup", "repoFile", "npm ci"), script("archive", "repoFile", "rm -rf tmp")];

test("Orca hook precedence: a local script wins by default, otherwise orca.yaml runs", () => {
  assert.deepEqual(effectiveOrcaSetupScripts(local, shared, undefined).map((entry) => entry.command), ["pnpm install", "rm -rf tmp"]);
  assert.deepEqual(effectiveOrcaSetupScripts([], shared, undefined).map((entry) => entry.command), ["npm ci", "rm -rf tmp"]);
});

test("Orca hook precedence follows an explicit source policy", () => {
  assert.deepEqual(effectiveOrcaSetupScripts(local, shared, "shared-only").map((entry) => entry.command), ["npm ci", "rm -rf tmp"]);
  assert.deepEqual(effectiveOrcaSetupScripts(local, shared, "local-only").map((entry) => entry.command), ["pnpm install"]);
  assert.deepEqual(effectiveOrcaSetupScripts(local, shared, "run-both").map((entry) => entry.command), ["npm ci", "pnpm install", "rm -rf tmp"]);
});
