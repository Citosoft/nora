import { formatIssueReference } from "@/components/app/logic/forge-items/issueReference";
import assert from "node:assert/strict";
import test from "node:test";
import { launchThreadDraft } from "@/components/app/logic/thread-workspace/launchDraft";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { formatTaskHandoffInstruction } from "@/components/app/logic/taskHandoff";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import { pickerCatalog } from "./modelPickerFixtures";

const task = { workspaceId: "project", text: formatTaskHandoffInstruction(".nora/tasks/fix-login.md"),
  source: { kind: "task" as const, projectId: "shell", path: ".nora/tasks/fix-login.md" } };

test("explicit task starts create and submit the instruction before a composer mounts", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const id = await launchThreadDraft(store, task, true);
  assert.ok(id);
  assert.deepEqual(f.commands.map((command) => command.kind), ["create", "submit"]);
  const create = f.commands[0];
  const submit = f.commands[1];
  assert.equal(create.kind, "create");
  if (create.kind !== "create" || submit.kind !== "submit") throw new Error("Expected a submitted thread");
  assert.deepEqual(create.source, task.source);
  assert.equal(create.workspace.projectId, "project");
  assert.equal(submit.instruction, task.text);
  assert.equal(store.snapshot().layout.documents[0].text, "");
  assert.equal(store.snapshot().layout.documents[0].target.kind, "thread");
});

test("ordinary thread launches remain editable drafts", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  assert.ok(await launchThreadDraft(store, task));
  assert.equal(f.commands.length, 0);
  assert.equal(store.snapshot().layout.documents[0].text, task.text);
});

test("explicit starts use the configured default model", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore({ ...f.deps, boot: { ...f.deps.boot, personalization: {
    ...f.deps.boot.personalization, threadModel: { kind: "codex", instanceId: "account", model: "second" }
  } } });
  await launchThreadDraft(store, task, true);
  const create = f.commands[0];
  assert.equal(create.kind === "create" && create.provider.model, "second");
});

test("unavailable models retain the task prompt without sending", async () => {
  const f = threadWorkspaceFixture();
  f.deps.client.catalog = async () => ({ status: "unavailable", failure: { code: "provider", message: "Sign in first", retryable: true } });
  const store = createThreadWorkspaceStore(f.deps);
  await assert.rejects(launchThreadDraft(store, task, true), /Sign in first/);
  assert.equal(f.commands.length, 0);
  assert.equal(store.snapshot().layout.documents[0].text, task.text);
});

test("lost task-start replies preserve the saved instruction identity for retry", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  f.loseNextReply();
  await assert.rejects(launchThreadDraft(store, task, true), /Reply lost/);
  const document = store.snapshot().layout.documents[0];
  assert.ok(document.pending);
  await store.submit(document.id);
  assert.deepEqual(f.commands.slice(0, 2), f.commands.slice(2));
  assert.equal(f.acceptedCount, 2);
});

test("explicit starts wait for model discovery before sending", async () => {
  const f = threadWorkspaceFixture();
  let finish: (() => void) | undefined;
  const ready = new Promise<void>((resolve) => { finish = resolve; });
  f.deps.client.catalog = async () => { await ready; return pickerCatalog(); };
  const store = createThreadWorkspaceStore(f.deps);
  const launch = launchThreadDraft(store, task, true);
  assert.equal(f.commands.length, 0);
  finish?.();
  await launch;
  assert.equal(f.commands.length, 2);
});

test("issue starts submit the compact provider reference unchanged", async () => {
  const f = threadWorkspaceFixture();
  const store = createThreadWorkspaceStore(f.deps);
  const reference = formatIssueReference({ provider: "gitlab", number: 42, webUrl: "https://code.example.com/team/repo/-/issues/42" });
  const text = `Fix issue ${reference}.`;
  const id = await launchThreadDraft(store, { workspaceId: "project", text }, true);
  assert.ok(id);
  const submit = f.commands.find((command) => command.kind === "submit");
  assert.equal(submit?.kind, "submit");
  if (submit?.kind !== "submit") throw new Error("Expected issue submission");
  assert.equal(submit.instruction, text);
  assert.equal(store.snapshot().layout.documents[0].text, "");
});
