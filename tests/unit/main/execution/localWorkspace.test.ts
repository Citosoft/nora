import assert from "node:assert/strict";
import { mkdtemp, mkdir, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { LocalWorkspaceAuthority } from "@main/execution/localWorkspace";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { fixture, provider } from "./fixture";
import { ProviderDouble } from "./providerDouble";

const selection: WorkspaceRef = { environmentId: "local", projectId: "project", checkoutId: "registered",
  path: "/caller/forgery", branch: "forged-branch", access: "write" };

test("registered root and symlink aliases share identity; unrelated checkouts and environments do not", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "nora-workspaces-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "checkout"); const alias = join(directory, "alias"); const isolated = join(directory, "isolated");
  await mkdir(root); await mkdir(isolated); await symlink(root, alias, process.platform === "win32" ? "junction" : "dir");
  const registrations = [{ projectId: "project", checkoutId: "registered", path: root },
    { projectId: "project", checkoutId: "alias", path: alias }, { projectId: "project", checkoutId: "isolated", path: isolated }];
  const options = { environmentId: "local", registrations: () => registrations,
    inspectCheckout: async (path: string) => ({ rootPath: path, branch: "main" }) };
  const authority = new LocalWorkspaceAuthority(options);
  const prepared = await authority.prepare(selection);
  assert.equal(prepared.path, root); assert.equal(prepared.branch, "main"); assert.notEqual(prepared.checkoutId, selection.checkoutId);
  assert.equal((await authority.prepare({ ...selection, checkoutId: "alias" })).checkoutId, prepared.checkoutId);
  assert.notEqual((await authority.prepare({ ...selection, checkoutId: "isolated" })).checkoutId, prepared.checkoutId);
  const remote = new LocalWorkspaceAuthority({ ...options, environmentId: "remote-worker" });
  assert.notEqual((await remote.prepare({ ...selection, environmentId: "remote-worker" })).checkoutId, prepared.checkoutId);
  await assert.rejects(authority.prepare({ ...selection, environmentId: "remote-worker" }), /different execution host/);
  await assert.rejects(authority.prepare({ ...selection, checkoutId: "unregistered" }), /registered checkout/);
  await authority.verify(prepared);
  await rename(root, join(directory, "old")); await mkdir(root);
  await assert.rejects(authority.verify(prepared), /identity or branch changed/);
});

test("host canonicalizes create, serializes writers across aliases and keeps retry receipts after filesystem loss", async (t) => {
  const f = fixture(t);
  const directory = await mkdtemp(join(tmpdir(), "nora-admission-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const alias = join(directory, "alias"); const root = join(directory, "root"); await mkdir(root); await symlink(root, alias, "dir");
  const workspaces = new LocalWorkspaceAuthority({ environmentId: "local", registrations: () => [
    { projectId: "project", checkoutId: "registered", path: root }, { projectId: "project", checkoutId: "alias", path: alias }],
    inspectCheckout: async (path) => ({ rootPath: path, branch: "main" }) });
  const providers = new ProviderRegistry(); const double = new ProviderDouble(); providers.register(double);
  const host = new ExecutionHost({ store: f.store, providers, workspaces, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-10-21T10:00:00.000Z", nextId: randomUUID, shutdownGraceMs: 0, onFailure() {} });
  host.start();
  const create = { kind: "create" as const, commandId: "create", conversationId: "one", parentId: null, title: "One", workspace: selection, provider };
  try {
    const receipt = await host.execute(create);
    await host.execute({ ...create, commandId: "other", conversationId: "two", workspace: { ...selection, checkoutId: "alias" } });
    await host.execute({ kind: "submit", commandId: "send", conversationId: "one", runId: "run", instruction: "Work" });
    await assert.rejects(host.execute({ kind: "submit", commandId: "send", conversationId: "two", runId: "run", instruction: "Work" }), /isolated worktree/);
    await rename(root, join(directory, "removed"));
    assert.deepEqual(await host.execute(create), receipt);
    await assert.rejects(host.execute({ ...create, title: "Changed" }), /different content/);
    await assert.rejects(host.execute({ ...create, commandId: "new", conversationId: "three" }), /could not be inspected/);
    assert.equal(host.header("one")?.conversation.workspace.path, root);
  } finally { await host.shutdown(); }
});

test("writer admission rejects overlapping folders even when their selected IDs differ", (t) => {
  const f = fixture(t); f.create("outer", "root");
  f.command({ kind: "create", commandId: "nested", conversationId: "nested", title: "Nested", parentId: null, provider,
    workspace: { ...f.snapshot("outer").conversation.workspace, checkoutId: "different", path: "/test/root/nested" } });
  f.submit("run", "outer");
  assert.throws(() => f.submit("run", "nested"), /isolated worktree/);
});
