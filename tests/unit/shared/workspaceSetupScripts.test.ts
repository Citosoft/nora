import type { WorkspaceSetupScript } from "@shared/appTypes";
import {
  applyWorkspaceSetupScriptsUpdate,
  describeWorkspaceSetupScriptError,
  normalizeWorkspaceSetupScripts,
  selectWorkspaceSetupScriptsForTrigger
} from "@shared/workspaceSetupScripts";
import assert from "node:assert/strict";
import test from "node:test";

function sequentialIds(): () => string {
  let next = 0;
  return () => `generated-${++next}`;
}

function userScript(id: string, trigger: WorkspaceSetupScript["trigger"], command = `echo ${id}`): WorkspaceSetupScript {
  return { id, name: id, command, trigger, origin: { kind: "user" } };
}

test("normalizeWorkspaceSetupScripts returns no scripts for projects saved before setup scripts existed", () => {
  assert.deepEqual(normalizeWorkspaceSetupScripts(undefined), []);
  assert.deepEqual(normalizeWorkspaceSetupScripts({ not: "a list" }), []);
});

test("normalizeWorkspaceSetupScripts drops blank commands and defaults unknown triggers to manual", () => {
  const scripts = normalizeWorkspaceSetupScripts([
    { id: "install", name: " Install ", command: " npm install ", trigger: "worktree-create" },
    { id: "blank", name: "Nothing", command: "   ", trigger: "worktree-create" },
    { id: "future", name: "Future", command: "make", trigger: "on-merge" },
    "garbage",
    null
  ]);

  assert.deepEqual(scripts, [
    { id: "install", name: "Install", command: "npm install", trigger: "worktree-create", origin: { kind: "user" } },
    { id: "future", name: "Future", command: "make", trigger: "manual", origin: { kind: "user" } }
  ]);
});

test("normalizeWorkspaceSetupScripts fills missing names and ids and keeps ids unique", () => {
  const scripts = normalizeWorkspaceSetupScripts([
    { command: "pnpm install\npnpm build", trigger: "manual" },
    { id: "dup", command: "a", trigger: "manual" },
    { id: "dup", command: "b", trigger: "manual" }
  ]);

  assert.deepEqual(scripts.map((script) => [script.id, script.name]), [
    ["setup-script-1", "pnpm install"],
    ["dup", "a"],
    ["dup-3", "b"]
  ]);
});

test("normalizeWorkspaceSetupScripts keeps importer origins and repairs malformed ones", () => {
  const [imported, malformed] = normalizeWorkspaceSetupScripts([
    { id: "a", name: "a", command: "a", trigger: "manual", origin: { kind: "imported", importerId: "orca", externalId: "setup" } },
    { id: "b", name: "b", command: "b", trigger: "manual", origin: { kind: "imported", importerId: " " } }
  ]);

  assert.deepEqual(imported.origin, { kind: "imported", importerId: "orca", externalId: "setup" });
  assert.deepEqual(malformed.origin, { kind: "user" });
});

test("replace-all swaps the whole list and generates ids for new scripts", () => {
  const next = applyWorkspaceSetupScriptsUpdate(
    [userScript("old", "manual")],
    { kind: "replace-all", scripts: [{ name: "Install", command: "npm ci", trigger: "worktree-create" }] },
    sequentialIds()
  );

  assert.deepEqual(next, [
    { id: "generated-1", name: "Install", command: "npm ci", trigger: "worktree-create", origin: { kind: "user" } }
  ]);
});

test("replace-imported only replaces the importer's own scripts and keeps their position", () => {
  const current: WorkspaceSetupScript[] = [
    userScript("first", "worktree-create"),
    { ...userScript("t3-old", "worktree-create"), origin: { kind: "imported", importerId: "t3code", externalId: "old" } },
    { ...userScript("orca", "worktree-archive"), origin: { kind: "imported", importerId: "orca", externalId: null } },
    userScript("last", "manual")
  ];

  const next = applyWorkspaceSetupScriptsUpdate(
    current,
    {
      kind: "replace-imported",
      importerId: "t3code",
      scripts: [
        { name: "Bootstrap", command: "bun install", trigger: "worktree-create", origin: { kind: "imported", importerId: "ignored", externalId: "bootstrap" } },
        { name: "Dev", command: "bun dev", trigger: "manual" }
      ]
    },
    sequentialIds()
  );

  assert.deepEqual(next.map((script) => script.id), ["first", "generated-1", "generated-2", "orca", "last"]);
  assert.deepEqual(next[1].origin, { kind: "imported", importerId: "t3code", externalId: "bootstrap" });
  assert.deepEqual(next[2].origin, { kind: "imported", importerId: "t3code", externalId: null });
});

test("replace-imported appends a first import after the existing scripts", () => {
  const next = applyWorkspaceSetupScriptsUpdate(
    [userScript("mine", "manual")],
    { kind: "replace-imported", importerId: "orca", scripts: [{ name: "Setup", command: "make setup", trigger: "worktree-create" }] },
    sequentialIds()
  );

  assert.deepEqual(next.map((script) => script.id), ["mine", "generated-1"]);
});

test("replace-imported requires an importer id", () => {
  assert.throws(
    () => applyWorkspaceSetupScriptsUpdate([], { kind: "replace-imported", importerId: " ", scripts: [] }, sequentialIds()),
    /importer id/
  );
});

test("selectWorkspaceSetupScriptsForTrigger picks one lifecycle moment in configured order and never manual scripts", () => {
  const scripts = [
    userScript("install", "worktree-create"),
    userScript("cleanup", "worktree-archive"),
    userScript("seed", "worktree-create"),
    userScript("deploy", "manual")
  ];

  assert.deepEqual(selectWorkspaceSetupScriptsForTrigger(scripts, "worktree-create").map((script) => script.id), ["install", "seed"]);
  assert.deepEqual(selectWorkspaceSetupScriptsForTrigger(scripts, "worktree-archive").map((script) => script.id), ["cleanup"]);
  assert.deepEqual(selectWorkspaceSetupScriptsForTrigger(undefined, "worktree-create"), []);
});

test("describeWorkspaceSetupScriptError prefers the last stderr line, then stdout, then the message", () => {
  const withStderr = Object.assign(new Error("Command failed"), { stderr: "warn\nnpm ERR! missing script\n\n", stdout: "ok" });
  const withStdout = Object.assign(new Error("Command failed"), { stderr: "", stdout: "step 1\nboom" });

  assert.equal(describeWorkspaceSetupScriptError(withStderr), "npm ERR! missing script");
  assert.equal(describeWorkspaceSetupScriptError(withStdout), "boom");
  assert.equal(describeWorkspaceSetupScriptError(new Error("spawn ENOENT")), "spawn ENOENT");
  assert.equal(describeWorkspaceSetupScriptError("weird"), "Unknown error");
});
