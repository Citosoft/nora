import assert from "node:assert/strict";
import test from "node:test";
import { createThreadWorkspaceStore } from "@/components/app/logic/thread-workspace/store";
import { threadWorkspaceFixture } from "./threadWorkspaceFixtures";
import { pickerCatalog } from "./modelPickerFixtures";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";

for (const kind of ["codex", "claude"] as const) test(`opening a ${kind} CLI conversation creates its binding and opens the thread without submitting a prompt or changing drafts`, async () => {
  const f = threadWorkspaceFixture();
  f.deps.boot = { ...f.deps.boot, providers: [{ kind, instanceId: "account", label: kind }] };
  f.deps.client.catalog = async () => pickerCatalog(f.deps.boot.providers[0]);
  const store = createThreadWorkspaceStore(f.deps);
  const draft = store.openDraft({ workspaceId: "personal", text: "Keep this draft" });
  const session: ExternalSession = { origin: "cli", id: "native-terminal", providerKind: kind, instanceId: "account", cwd: "/personal", title: "Terminal work",
    createdAt: f.deps.now(), updatedAt: f.deps.now() };
  await store.resumeExternal("personal", session);
  assert.equal(f.commands.length, 1);
  const command = f.commands[0]; assert.equal(command.kind, "create");
  if (command.kind !== "create") return;
  assert.equal(command.externalSessionId, session.id); assert.equal(command.provider.kind, kind);
  assert.equal(command.provider.model, "first");
  assert.equal(store.snapshot().layout.documents.find((document) => document.id === draft)?.text, "Keep this draft");
  const active = store.snapshot().layout.documents.find((document) => document.id === store.snapshot().layout.activeId);
  assert.deepEqual(active?.target, { kind: "thread", conversationId: command.conversationId });
});

test("CLI imports fail locally without creating work when the workspace or catalog is unavailable", async () => {
  const f = threadWorkspaceFixture(); const store = createThreadWorkspaceStore(f.deps);
  const session: ExternalSession = { origin: "cli", id: "native-terminal", providerKind: "codex", instanceId: "account", cwd: "/personal", title: "Terminal work",
    createdAt: f.deps.now(), updatedAt: f.deps.now() };
  await assert.rejects(store.resumeExternal("removed", session), /workspace is unavailable/);
  f.deps.client.catalog = async () => ({ status: "unavailable", failure: { code: "provider", message: "Provider unavailable", retryable: true } });
  await assert.rejects(store.resumeExternal("personal", session), /Provider unavailable/);
  assert.equal(f.commands.length, 0);
});
