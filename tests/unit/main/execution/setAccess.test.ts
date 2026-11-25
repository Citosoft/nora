import assert from "node:assert/strict";
import test from "node:test";
import { fixture, provider } from "./fixture";
import { bot } from "../../shared/bots/fixtures";

test("set-access toggles idle threads between read and write", (t) => {
  const f = fixture(t);
  f.create();
  assert.equal(f.snapshot().conversation.workspace.access, "write");
  f.command({ kind: "set-access", commandId: "to-read", conversationId: "conversation", access: "read" });
  assert.equal(f.snapshot().conversation.workspace.access, "read");
  f.command({ kind: "set-access", commandId: "to-write", conversationId: "conversation", access: "write" });
  assert.equal(f.snapshot().conversation.workspace.access, "write");
});

test("set-access refuses active work in the same thread while allowing a shared checkout", (t) => {
  const f = fixture(t);
  f.create();
  f.submit();
  assert.throws(() => f.command({ kind: "set-access", commandId: "busy", conversationId: "conversation", access: "read" }), /Stop active work/);
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  f.command({ kind: "set-access", commandId: "idle-read", conversationId: "conversation", access: "read" });

  f.create("writer", "shared");
  f.submit("writer-run", "writer");
  f.create("blocked", "shared");
  f.command({ kind: "set-access", commandId: "make-read", conversationId: "blocked", access: "read" });
  f.command({ kind: "set-access", commandId: "blocked-write", conversationId: "blocked", access: "write" });
  assert.equal(f.snapshot("blocked").conversation.workspace.access, "write");
});

test("set-access refuses direct chats and workflow stage threads", (t) => {
  const f = fixture(t);
  const ada = bot("ada");
  const descriptor = { botId: "ada", name: ada.name, role: ada.role, avatar: ada.avatar, scope: { kind: "global" as const }, workspaceId: "project", retiredAt: null };
  const nora = { kind: "nora" as const, instanceId: "direct", model: "direct", reasoning: null, permissionPolicy: "direct" };
  f.engine.execute({ kind: "create", commandId: "create-dm", conversationId: "dm", title: "Ada", parentId: null, provider: nora,
    workspace: { environmentId: "local", projectId: "project", checkoutId: "dm", path: "/test/dm", branch: "main", access: "write" },
    direct: { botId: "ada", workspaceId: "project" } }, { direct: descriptor });
  assert.throws(() => f.command({ kind: "set-access", commandId: "dm", conversationId: "dm", access: "write" }), /direct chats/);

  f.command({ kind: "create", commandId: "create-review", conversationId: "review", title: "Review", parentId: null, provider,
    workspace: { environmentId: "local", projectId: "project", checkoutId: "review", path: "/test/review", branch: "main", access: "read" },
    source: { kind: "workflow", projectId: "project", runId: "run", stageId: "review" } });
  assert.throws(() => f.command({ kind: "set-access", commandId: "workflow", conversationId: "review", access: "write" }), /Workflow stage/);
});
