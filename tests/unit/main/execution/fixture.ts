import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestContext } from "node:test";
import { ConversationEngine } from "@main/execution/engine";
import { SqliteExecutionStore } from "@main/execution/sqliteStore";
import type { ConversationCommand, ConversationSnapshot, ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { WorkspaceAuthority } from "@main/types/execution/workspace.types";
import type { ProviderUpdate } from "@main/types/execution/provider.types";

export const workspaceAuthority: WorkspaceAuthority = { async prepare(selection) { return selection; }, async verify() {} };

export const provider: ProviderBinding = { kind: "codex", instanceId: "account-a", model: "test-model", reasoning: null, permissionPolicy: "native-default" };
export function fixture(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), "nora-execution-"));
  const path = join(directory, "execution.sqlite");
  let store = new SqliteExecutionStore(path, "local");
  let sequence = 0;
  let now = "2026-10-21T10:00:00.000Z";
  // Domain tests isolate ownership; ownership integration has its own behavioral suite.
  const deps = () => ({ store, now: () => now, nextId: () => `id-${++sequence}`, assertOwnership() {} });
  let engine = new ConversationEngine(deps());
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  const command = (input: ConversationCommand) => engine.execute(input);
  const create = (id = "conversation", checkoutId = id, binding = provider) => command({ kind: "create", commandId: `create-${id}`,
    conversationId: id, title: id, parentId: null, provider: binding,
    workspace: { environmentId: "local", projectId: "project", checkoutId, path: `/test/${checkoutId}`, branch: "main", access: "write" } });
  const submit = (runId = "run", conversationId = "conversation") => command({ kind: "submit", commandId: `submit-${conversationId}-${runId}`, conversationId, runId, instruction: runId });
  const snapshot = (id = "conversation"): ConversationSnapshot => {
    const result = engine.snapshot(id);
    assert.ok(result);
    return result;
  };
  const update = (input: Omit<Extract<ProviderUpdate, { kind: "finished" }>, "conversationId" | "runId" | "attemptId">
    | Omit<Extract<ProviderUpdate, { kind: "started" }>, "conversationId" | "runId" | "attemptId">, runId = "run", conversationId = "conversation") => {
    const run = snapshot(conversationId).runs.find((entry) => entry.id === runId);
    assert.ok(run);
    engine.accept({ ...input, conversationId, runId, attemptId: run.attemptId });
  };
  return { path, command, create, submit, snapshot, update, get engine() { return engine; }, get store() { return store; },
    setTime(value: string) { now = value; },
    restart() { store.close(); store = new SqliteExecutionStore(path, "local"); engine = new ConversationEngine(deps()); } };
}

