import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerOperations, WORKER_LIMIT } from "@main/nora-tools/operations/workers";
import { snapshotBot } from "@shared/bots/snapshot";
import { createThreadOperations } from "@main/nora-tools/operations/threads";
import { noraToolsStatus } from "@shared/nora-tools/catalog";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { ProviderCatalogResult } from "@shared/types/provider/catalog.types";
import type { NoraWorkerWorkspaces } from "@main/types/nora-tools/workerWorkspaces.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { NoraToolContext } from "@main/types/nora-tools/noraTools.types";
import { bot } from "../../shared/bots/fixtures";
import { fakeHost } from "../bots/fakeHost";
import { conversation } from "./fixture";

const bots = [bot("ada")];
const boot = { environmentId: "local", cursor: 0, sharedBots: [], workspaces: [], noraTools: noraToolsStatus("idle"),
  providers: [{ kind: "claude", instanceId: "claude", label: "Claude", reportsMcp: true }, { kind: "codex", instanceId: "codex", label: "Codex", reportsMcp: true }],
  personalization: { defaultRole: null, workspaceRoles: {}, bots: { global: bots, workspaces: {} } } } as unknown as NativeBoot;
const catalogs: Record<string, ProviderCatalogResult> = {
  claude: { status: "available", catalog: { capabilities: { readOnlyCommands: true }, models: [{ id: "claude-opus-5-5" }, { id: "claude-haiku-5-5" }], policies: [{ id: "ask", label: "Ask" }] } } as unknown as ProviderCatalogResult,
  codex: { status: "available", catalog: { capabilities: { readOnlyCommands: true }, models: [{ id: "gpt-6" }], policies: [{ id: "codex-default", label: "Default" }] } } as unknown as ProviderCatalogResult
};

/** Instructions starting "slow" stay running until interrupted; everything else is answered with a report. */
function setup(workerWorkspaces?: NoraWorkerWorkspaces) {
  const fake = fakeHost(bots, (_botId, instruction) => instruction.startsWith("slow") ? null : `Report: ${instruction}`);
  let sequence = 0;
  const host = { ...fake.host, catalog: async (kind: string) => catalogs[kind] };
  const isolated: WorkspaceRef[] = [];
  const workspaces: NoraWorkerWorkspaces = workerWorkspaces ?? { async isolate(workspace) {
    const index = isolated.length + 1;
    const checkout = { ...workspace, checkoutId: `worker-${index}`, path: `${workspace.path}-worker-${index}`, branch: `worker-${index}` };
    isolated.push(checkout);
    return checkout;
  } };
  const options = { workerWorkspaces: workspaces, host, nextId: () => `id${++sequence}`, boot: () => boot, saveBot: async () => {},
    memory: {} as never, secrets: {} as never, apps: {} as never, connectorTools: {} as never };
  const workers = createWorkerOperations(options);
  const threads = createThreadOperations(options);
  const parent = conversation("nora", { title: "Release", provider: { kind: "claude", instanceId: "claude", model: "claude-opus-5-5", reasoning: "high", permissionPolicy: "full-access" } });
  fake.add(parent);
  const context: NoraToolContext = { conversation: parent, audience: "nora" };
  return { fake, workers, threads, parent, context, isolated, host };
}
const signal = new AbortController().signal;
const wait = { mode: "all", timeoutMs: 5_000 } as const;

test("start_thread saves the worker's done criteria on its thread and closes its brief with them", async () => {
  const { fake, workers, context } = setup();
  const started = await workers.start({ title: "Docs", prompt: "Update the README", done: "The README lists every command" }, context);
  const create = fake.commands.find((command) => command.kind === "create");
  assert.equal(create?.kind === "create" ? create.done : null, "The README lists every command");
  assert.equal(create?.kind === "create" ? create.conversationId : null, started.id);
  assert.match(create?.kind === "create" ? create.initialInstruction?.instruction ?? "" : "", /^Update the README\n\nDone means: The README lists every command\n/);
});

test("start_thread runs a worker child on the chosen model with the caller's trust, and wait_for_threads returns its report", async () => {
  const { fake, workers, context } = setup();
  const started = await workers.start({ title: "Docs", prompt: "Update the README", model: "claude-haiku-5-5" }, context);
  assert.deepEqual([started.runsAs, started.access], ["claude / claude-haiku-5-5", "write"]);
  const child = fake.conversations.get(started.id);
  assert.deepEqual([child?.parentId, child?.source, child?.workspace.access, child?.provider.model, child?.provider.permissionPolicy, child?.provider.reasoning],
    ["nora", { kind: "worker" }, "write", "claude-haiku-5-5", "full-access", null]);
  const submit = fake.commands.find((command) => command.kind === "submit");
  assert.equal(submit?.kind === "submit" ? submit.instruction : "", "Update the README");
  const create = fake.commands.find((command) => command.kind === "create");
  assert.equal(create?.kind === "create" ? create.initialInstruction?.instruction : "", "Update the README");
  const [report] = await workers.wait(wait, context, signal);
  assert.deepEqual(report, { id: started.id, title: "Docs", status: "completed", report: "Report: Update the README", failure: null });
});

test("a worker on another provider gets that provider's default policy; a bot worker runs on the bot's own model", async () => {
  const { fake, workers, context } = setup();
  const codex = await workers.start({ title: "Tests", prompt: "Write tests", provider: "codex", access: "read" }, context);
  assert.deepEqual([fake.conversations.get(codex.id)?.provider.model, fake.conversations.get(codex.id)?.provider.permissionPolicy, codex.access], ["gpt-6", "codex-default", "read"]);
  const ada = await workers.start({ title: "Review", prompt: "Review the diff", bot: "Ada" }, context);
  assert.deepEqual([fake.conversations.get(ada.id)?.bot?.botId, fake.conversations.get(ada.id)?.source], ["ada", { kind: "worker" }]);
  await assert.rejects(workers.start({ title: "x", prompt: "y", bot: "ada", model: "gpt-6" }, context), /either a bot or a provider and model/);
  await assert.rejects(workers.start({ title: "x", prompt: "y", provider: "codex", model: "nope" }, context), /Codex has no model "nope"/);
});

test("workers cannot start workers, and only the caller's own workers can be messaged or waited on", async () => {
  const { fake, workers, context } = setup();
  await assert.rejects(workers.wait(wait, context, signal), /no workers to wait for/);
  const started = await workers.start({ title: "Docs", prompt: "Update the README" }, context);
  const worker = fake.conversations.get(started.id);
  assert.ok(worker);
  await assert.rejects(workers.start({ title: "x", prompt: "y" }, { conversation: worker, audience: "nora" }), /cannot start workers of its own/);
  fake.add(conversation("other", { parentId: "nora" }));
  await assert.rejects(workers.message("other", "hi", context), /No worker thread with id "other"/);
  await assert.rejects(workers.wait({ ...wait, ids: [started.id, "other"] }, context, signal), /No worker thread with id "other"/);
  await workers.wait(wait, context, signal);
  await workers.message(started.id, "Also the changelog", context);
  const [report] = await workers.wait({ ...wait, ids: [started.id] }, context, signal);
  assert.equal(report.report, "Report: Also the changelog");
});

test("mode any returns at the first finished worker, a timeout returns the rest as running, and a worker waiting on the user returns at once", async () => {
  const { fake, workers, context } = setup();
  const slow = await workers.start({ title: "Slow", prompt: "slow migration" }, context);
  const quick = await workers.start({ title: "Quick", prompt: "rename" }, context);
  const any = await workers.wait({ ...wait, mode: "any" }, context, signal);
  assert.deepEqual(any.map((entry) => [entry.title, entry.status]), [["Slow", "running"], ["Quick", "completed"]]);
  const timedOut = await workers.wait({ ids: [slow.id], mode: "all", timeoutMs: 20 }, context, signal);
  assert.equal(timedOut[0].status, "running");
  const runId = fake.host.summaries().find((entry) => entry.conversation.id === slow.id)?.latestRun?.id ?? "";
  const pending = workers.wait({ ...wait, ids: [slow.id, quick.id] }, context, signal);
  setTimeout(() => fake.emit(slow.id, { kind: "request", request: { id: "req", runId, kind: "approval", status: "pending", options: [{ id: "ok", label: "OK" }] } as never }), 5);
  assert.deepEqual((await pending).map((entry) => entry.status), ["needs-approval", "completed"]);
});

test(`a thread runs at most ${WORKER_LIMIT} workers at once`, async () => {
  const { workers, context } = setup();
  for (let index = 0; index < WORKER_LIMIT; index += 1) await workers.start({ title: `W${index}`, prompt: "slow work" }, context);
  await assert.rejects(workers.start({ title: "One more", prompt: "slow work" }, context), /already has 8 workers running/);
});


test("bots start work as themselves and track or follow up on their workers from later task threads", async () => {
  const { fake, workers, threads, parent } = setup();
  const caller = { ...parent, bot: snapshotBot(bots[0]) };
  fake.add(caller);
  const context: NoraToolContext = { conversation: caller, audience: "bot" };
  const started = await workers.start({ title: "Migration", prompt: "Start the migration" }, context);
  const child = fake.conversations.get(started.id);
  assert.ok(child);
  assert.equal(child.bot?.botId, "ada");
  assert.equal(child.parentId, caller.id);
  await workers.wait({ ...wait, ids: [started.id] }, context, signal);
  const later = { ...caller, id: "later", workspace: { ...caller.workspace, projectId: "another-workspace" } };
  fake.add(later);
  const next: NoraToolContext = { conversation: later, audience: "bot" };
  assert.ok(threads.list({ allWorkspaces: true, includeSettled: false, limit: 30 }, next).some((entry) => entry.id === started.id));
  await workers.message(started.id, "Finish the migration", next);
  assert.equal((await workers.wait({ ...wait, ids: [started.id] }, next, signal))[0].report, "Report: Finish the migration");
  await assert.rejects(workers.start({ title: "Nested", prompt: "x" }, { conversation: child, audience: "bot" }), /cannot start workers/);
  const other: NoraToolContext = { conversation: { ...later, bot: snapshotBot(bot("rex")) }, audience: "bot" };
  await assert.rejects(workers.message(started.id, "x", other), /No worker thread/);
  assert.throws(() => threads.read(started.id, 20, other), /No thread/);
});

test("a bot can track workers on a different model without losing ownership or escalating read access", async () => {
  const { fake, workers, threads, parent } = setup();
  const caller = { ...parent, bot: snapshotBot(bots[0]) };
  fake.add(caller);
  const context: NoraToolContext = { conversation: caller, audience: "bot" };
  const started = await workers.start({ title: "Review", prompt: "Review", model: "claude-haiku-5-5" }, context);
  assert.equal(fake.conversations.get(started.id)?.bot, undefined);
  const later = { ...caller, id: "later" };
  fake.add(later);
  const next: NoraToolContext = { conversation: later, audience: "bot" };
  assert.ok(threads.list({ allWorkspaces: false, includeSettled: false, limit: 30 }, next).some((entry) => entry.id === started.id));
  await workers.wait({ ...wait, ids: [started.id] }, next, signal);
  assert.equal(threads.read(started.id, 20, next).messages[0].text, "Report: Review");
  const read: NoraToolContext = { ...next, conversation: { ...later, workspace: { ...later.workspace, access: "read" } } };
  await assert.rejects(workers.message(started.id, "Change the files", read), /cannot send instructions/);
  await assert.rejects(workers.start({ title: "Write", prompt: "x" }, read), /only read/);
  const inspecting = await workers.start({ title: "Inspect", prompt: "Inspect", access: "read" }, read);
  assert.equal(fake.conversations.get(inspecting.id)?.workspace.access, "read");
});


test("write workers get distinct isolated checkouts while their parent is still working", async () => {
  const { fake, workers, context, isolated, parent } = setup();
  await fake.host.execute({ kind: "submit", commandId: "parent-start", conversationId: parent.id, runId: "parent-run", instruction: "slow parent" });
  const first = await workers.start({ title: "One", prompt: "slow one" }, context);
  const second = await workers.start({ title: "Two", prompt: "slow two", bot: "ada" }, context);
  assert.equal(fake.host.header(parent.id)?.activeRuns.length, 1);
  assert.equal(isolated.length, 2);
  assert.notEqual(first.workspace.checkoutId, parent.workspace.checkoutId);
  assert.notEqual(first.workspace.checkoutId, second.workspace.checkoutId);
  for (const worker of [first, second]) {
    assert.equal(fake.conversations.get(worker.id)?.workspace.path, worker.workspace.path);
    assert.equal(fake.host.header(worker.id)?.activeRuns.length, 1);
  }
});

test("read workers, non-Git writers and explicitly shared writers do not create worktrees", async () => {
  const { workers, context, parent, isolated } = setup();
  const read = await workers.start({ title: "Read", prompt: "Inspect", access: "read" }, context);
  const shared = await workers.start({ title: "Shared", prompt: "Inspect", isolation: "shared" }, context);
  const folder = { ...context, conversation: { ...parent, workspace: { ...parent.workspace, versionControl: "none" as const } } };
  const plain = await workers.start({ title: "Folder", prompt: "Inspect" }, folder);
  assert.equal(isolated.length, 0);
  for (const worker of [read, shared, plain]) assert.equal(worker.workspace.path, parent.workspace.path);
  await assert.rejects(workers.start({ title: "Bad", prompt: "x", isolation: "worktree" }, folder), /not a Git repository/);
  await assert.rejects(workers.start({ title: "Bad", prompt: "x", access: "read", isolation: "worktree" }, context), /Read-only workers share/);
});

test("a failed or invalid isolation never starts a worker in the caller's checkout", async () => {
  const failed = setup({ async isolate() { throw new Error("Disk full"); } });
  await assert.rejects(failed.workers.start({ title: "Task", prompt: "x" }, failed.context), /Disk full/);
  assert.equal(failed.fake.commands.length, 0);
  const wrong = setup({ async isolate(workspace) { return workspace; } });
  await assert.rejects(wrong.workers.start({ title: "Task", prompt: "x" }, wrong.context), /separate writable checkout/);
  assert.equal(wrong.fake.commands.length, 0);
});


test("read-only capability is checked before creating a worker, regardless of its selected model", async () => {
  const f = setup();
  f.host.catalog = async (kind) => {
    const catalog = catalogs[kind];
    return catalog.status === "available" ? { ...catalog, catalog: { ...catalog.catalog, capabilities: { ...catalog.catalog.capabilities, readOnlyCommands: false } } } : catalog;
  };
  await assert.rejects(f.workers.start({ title: "Inspect", prompt: "Inspect", access: "read" }, f.context), /cannot enforce read-only command execution/);
  assert.equal(f.fake.commands.length, 0);
  assert.equal(f.isolated.length, 0);
});
