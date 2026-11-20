import assert from "node:assert/strict";
import test from "node:test";
import { runtimeFixture } from "./runtimeFixture";
import { createRuntimeApi } from "@main/remote-access/http/handler";
import { botsResponseSchema, commandResponseSchema, conversationDetailResponseSchema, conversationsResponseSchema, runtimeInfoSchema, runtimeApiErrorSchema } from "@shared/remote-access/runtimeApi";

const create = { commandId: "create-remote", conversationId: "remote", projectId: "project", title: "Remote thread" };

test("every runtime read requires a verified owning account and an approved browser origin", async (t) => {
  const f = runtimeFixture(t);
  for (const path of ["/v1/runtime/info", "/v1/projects", "/v1/conversations", "/v1/tasks", "/v1/events?after=0"]) {
    assert.equal((await f.request(path, undefined, { Authorization: "" })).status, 401);
    assert.equal((await f.request(path, undefined, { Authorization: "Bearer invalid.token.signature" })).status, 401);
    assert.equal((await f.request(path, undefined, { Authorization: "Bearer other.token.signature" })).status, 403);
    assert.equal((await f.request(path, undefined, { Origin: "https://evil.example" })).status, 403);
  }
  const info = await f.request("/v1/runtime/info");
  assert.equal(info.headers.get("Access-Control-Allow-Origin"), "https://app.withnora.run");
  assert.equal(info.headers.get("Cache-Control"), "no-store");
  assert.equal(runtimeInfoSchema.parse(await info.json()).name, "My Nora");
  f.disable(); assert.equal((await f.request("/v1/projects")).status, 403);
});

test("remote create/send retries use native durable command receipts and safe default permissions", async (t) => {
  const f = runtimeFixture(t);
  const first = await f.request("/v1/conversations", create);
  assert.equal(first.status, 200);
  const receipt = commandResponseSchema.parse(await first.json()).receipt;
  const retry = await f.request("/v1/conversations", create);
  assert.deepEqual(commandResponseSchema.parse(await retry.json()).receipt, receipt);
  assert.equal(f.execution.store.summaries().length, 1);
  const message = { commandId: "send-1", runId: "run-1", instruction: "private instruction must not enter audit" };
  assert.equal((await f.request("/v1/conversations/remote/messages", message)).status, 200);
  assert.equal((await f.request("/v1/conversations/remote/messages", message)).status, 200);
  const detail = conversationDetailResponseSchema.parse(await (await f.request("/v1/conversations/remote")).json());
  assert.equal(detail.header.activeRuns.length, 1);
  assert.equal(detail.header.conversation.provider.permissionPolicy, "native-default");
  assert.equal(f.audit.some((entry) => entry.action === "send-message" && entry.outcome === "accepted"), true);
  assert.equal(JSON.stringify(f.audit).includes("private instruction"), false);
  const list = conversationsResponseSchema.parse(await (await f.request("/v1/conversations?projectId=project&settled=false")).json());
  assert.equal(list.conversations.length, 1);
  assert.equal((await f.request("/v1/conversations/remote/messages", { ...message, instruction: "different" })).status, 409);
});

test("remote callers cannot inject paths, unsupported permissions, unknown fields or stale actions", async (t) => {
  const f = runtimeFixture(t);
  assert.equal((await f.request("/v1/conversations", { ...create, workspace: { path: "/etc" } })).status, 400);
  assert.equal((await f.request("/v1/conversations", { ...create, projectId: "../../etc" })).status, 404);
  const provider = { kind: "codex", instanceId: "account-a", model: "test-model", reasoning: null, permissionPolicy: "dangerous" };
  assert.equal((await f.request("/v1/conversations", { ...create, provider })).status, 403);
  await f.request("/v1/conversations", create);
  assert.equal((await f.request("/v1/actions/not-a-live-action/decision", { commandId: "answer", conversationId: "remote", response: { kind: "approval", optionId: "accept" } })).status >= 400, true);
  assert.equal((await f.request("/v1/events?after=999999")).status, 410);
  assert.equal((await f.request("/v1/conversations?unexpected=true")).status, 400);
});

test("disable during async token verification rejects the late request", async (t) => {
  const f = runtimeFixture(t);
  const api = createRuntimeApi({ ...f.options, verifier: { async verify() {
    f.disable(); return { userId: "owner", sessionId: "session", expiresAt: f.options.now() + 60_000 };
  } } });
  const response = await api.handle(new Request("https://runtime/v1/conversations", { method: "POST", headers: { Authorization: "Bearer owner.token.signature", "Content-Type": "application/json" }, body: JSON.stringify(create) }));
  assert.equal(response.status, 403); assert.equal(f.execution.store.summaries().length, 0);
});

test("bounded JSON and rate limiting reject oversized or excessive requests", async (t) => {
  const f = runtimeFixture(t);
  const oversized = await f.request("/v1/conversations", { ...create, title: "x".repeat(300_000) });
  assert.equal(oversized.status, 413);
  const result = runtimeApiErrorSchema.parse(await oversized.json()); assert.equal(result.error.code, "too-large");
  for (let index = 0; index < 119; index++) await f.request("/v1/projects");
  assert.equal((await f.request("/v1/projects")).status, 429);
});

test("remote approval decisions keep native option validation, deduplication and expiry", async (t) => {
  const f = runtimeFixture(t);
  f.execution.setTime("2026-11-16T10:00:00.000Z");
  f.execution.create(); f.execution.submit(); f.execution.engine.claimEffect();
  f.execution.update({ kind: "started", eventId: "start", nativeConversationId: "native", nativeTurnId: "turn" });
  const run = f.execution.snapshot().runs[0];
  f.execution.engine.accept({ kind: "request", eventId: "approval", conversationId: "conversation", runId: run.id, attemptId: run.attemptId,
    request: { kind: "approval", id: "approval", nativeId: "native-approval", runId: run.id, attemptId: run.attemptId, status: "pending", title: "Allow tool?",
      createdAt: "2026-11-16T10:00:00.000Z", expiresAt: "2026-11-16T10:05:00.000Z", options: [{ id: "allow", label: "Allow once" }] } });
  const response = { commandId: "decide", conversationId: "conversation", response: { kind: "approval", optionId: "allow" } };
  assert.equal((await f.request("/v1/actions/approval/decision", { ...response, commandId: "unsupported", response: { kind: "approval", optionId: "always-allow" } })).status, 400);
  assert.equal((await f.request("/v1/actions/approval/decision", response)).status, 200);
  assert.equal((await f.request("/v1/actions/approval/decision", response)).status, 200);
  assert.equal((await f.request("/v1/actions/approval/decision", { ...response, commandId: "stale" })).status, 410);
  assert.equal(f.audit.some((entry) => entry.action === "decide-action" && entry.outcome === "rejected"), true);
});

const reviewer = { id: "reviewer", name: "Reviewer", role: "Code review", instructions: "Review diffs.", avatar: { seed: 3 }, scope: { kind: "global" as const }, revision: 1,
  binding: { kind: "codex" as const, instanceId: "account-a", model: "test-model", reasoning: null, permissionPolicy: "native-default" } };

test("remote clients list bots and start each bot's direct chat on the runtime's own terms", async (t) => {
  const f = runtimeFixture(t);
  f.boot.personalization.bots = { global: [reviewer], workspaces: {} };
  // The fixture's bare engine has no bot resolver, so supply the descriptor the real execution host derives from the bot's settings.
  f.options.host.execute = async (command) => f.execution.engine.execute(command, command.kind === "create" && command.direct
    ? { direct: { botId: reviewer.id, name: reviewer.name, role: reviewer.role, avatar: reviewer.avatar, scope: reviewer.scope, workspaceId: command.direct.workspaceId } } : {});
  const before = botsResponseSchema.parse(await (await f.request("/v1/bots")).json());
  assert.deepEqual(before.bots.map(({ id, scope, chatConversationId }) => ({ id, scope, chatConversationId })), [{ id: "reviewer", scope: { kind: "global" }, chatConversationId: null }]);

  const body = { commandId: "bot-chat", conversationId: "reviewer-chat", scope: { kind: "global" } };
  assert.equal((await f.request("/v1/bots/reviewer/chat", body)).status, 200);
  assert.equal((await f.request("/v1/bots/reviewer/chat", body)).status, 200);
  assert.equal(f.execution.store.summaries().length, 1);
  const chat = f.execution.store.header("reviewer-chat")?.conversation;
  assert.equal(chat?.title, "Reviewer"); assert.equal(chat?.direct?.botId, "reviewer"); assert.equal(chat?.workspace.access, "read");
  assert.equal(botsResponseSchema.parse(await (await f.request("/v1/bots")).json()).bots[0]?.chatConversationId, "reviewer-chat");

  assert.equal((await f.request("/v1/bots/missing/chat", { ...body, commandId: "other", conversationId: "other" })).status, 404);
  assert.equal((await f.request("/v1/bots/reviewer/chat", { ...body, commandId: "other", conversationId: "other", workspace: { path: "/etc" } })).status, 400);
});
