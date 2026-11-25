import assert from "node:assert/strict";
import test from "node:test";
import { previewDirectContext } from "@main/bots/direct/contextPreview";
import { createMemoryDelivery } from "@main/bots/memory/delivery";
import { snapshotBot } from "@shared/bots/snapshot";
import { NORA_CHAT } from "@shared/bots/noraChat";
import type { ContextUsage, TimelineItem, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import type { DirectContextPreviewDeps } from "@main/types/bots/chats.types";
import type { RunContextSubject } from "@main/types/nora-tools/noraTools.types";
import { bot } from "../../shared/bots/fixtures";
import { conversation } from "../nora-tools/fixture";
import { fakeHost } from "./fakeHost";

const ada = bot("ada");
const ref = (projectId: string): WorkspaceRef => ({ projectId, environmentId: "local", checkoutId: projectId, path: `/${projectId}`, branch: "main", access: "read" });
const workspaces = [{ id: "app", name: "App", workspace: ref("app") }, { id: "site", name: "Site", workspace: ref("site") }];
const direct: DirectDescriptor = { botId: "ada", name: "Ada", role: ada.role, avatar: ada.avatar, scope: { kind: "global" }, workspaceId: "app", retiredAt: null };
const message = (id: string, text: string, extra: Partial<Extract<TimelineItem, { kind: "message" }>> = {}): TimelineItem =>
  ({ kind: "message", id, runId: "r", createdAt: "2026-11-13T00:00:00.000Z", role: "user", text, complete: true, ...extra });
const usage: ContextUsage = { usedTokens: 12_000, windowTokens: 200_000, inputTokens: 11_000, cachedInputTokens: 10_000, outputTokens: 400, updatedAt: "2026-11-13T00:00:00.000Z" };

function setup(threads: "none" | "open" = "none") {
  const fake = fakeHost([ada], () => null);
  fake.add(conversation("dm", { title: "Ada", provider: { kind: "nora", instanceId: "direct", model: "direct", reasoning: null, permissionPolicy: "direct" }, direct }));
  fake.items.set("dm", [message("m1", "Fix the footer"), message("m2", "Done, footer fixed.", { role: "assistant", workThreadId: "task", author: { kind: "bot", botId: "ada", name: "Ada", avatar: ada.avatar } })]);
  if (threads === "open") fake.add(conversation("task", { title: "Footer fix", parentId: "dm", workspace: { ...ref("app"), access: "write" }, bot: snapshotBot(ada), context: usage,
    provider: { kind: "claude", instanceId: "claude", model: "opus", reasoning: null, permissionPolicy: "default" } }));
  const subjects: RunContextSubject[] = [];
  const deps: DirectContextPreviewDeps = { host: fake.host, workspaces: () => workspaces, now: () => "2026-11-13T00:00:00.000Z", routerModel: () => "cloud",
    bot: (_workspaceId, botId) => botId === "ada" ? ada : null, noraModel: () => ({ kind: "claude", instanceId: "claude", model: "opus" }),
    runContext: (subject) => { subjects.push(subject); return { tools: true, connectors: 0, toolGuidance: "TOOLS", notesGuidance: "NOTES", turnNotes: null }; } };
  return { fake, deps, subjects };
}

test("the preview shows the router's request and the work thread's for the fallback target, using the draft as the next message", () => {
  const { deps } = setup("open");
  const preview = previewDirectContext(deps, { chatId: "dm", draft: "And the header?", target: null });
  assert.deepEqual(preview.target, { kind: "continue", threadId: "task" });
  assert.equal(preview.fallback, true);
  assert.deepEqual(preview.targets.map((option) => option.target), [{ kind: "continue", threadId: "task" }, { kind: "new", workspaceId: "app" }, { kind: "new", workspaceId: "site" }]);
  const [router, work] = preview.requests;
  assert.match(router.sections.find((section) => section.id === "router-user")?.text ?? "", /Footer fix[\s\S]*Latest message:\nAnd the header\?/);
  assert.equal(work.model, "claude · opus");
  assert.deepEqual(work.lastRequest, usage);
  const ids = work.sections.map((section) => section.id);
  assert.deepEqual(ids, ["provider-base", "bot", "tools", "notes", "runtime", "history", "message"]);
  // A continuing thread gets only what is new since its last reply, ending with the draft.
  const turn = work.sections.find((section) => section.id === "message")?.text ?? "";
  assert.match(turn, /^New in your chat with the user since your last reply:\n\n\[User\]: And the header\?/);
  assert.doesNotMatch(turn, /Fix the footer/);
});

test("a new-thread target carries the whole chat, has no measured history, and previews notes for a thread that does not exist yet", () => {
  const { deps, subjects } = setup("open");
  const preview = previewDirectContext(deps, { chatId: "dm", draft: "", target: { kind: "new", workspaceId: "site" } });
  assert.equal(preview.fallback, false);
  const work = preview.requests[1];
  assert.equal(work.lastRequest, null);
  assert.ok(!work.sections.some((section) => section.id === "history"));
  assert.match(work.sections.find((section) => section.id === "message")?.text ?? "", /in Site\. The chat so far:[\s\S]*Fix the footer[\s\S]*\(your next message\)/);
  assert.equal(subjects.at(-1)?.workspace.projectId, "site");
  assert.notEqual(subjects.at(-1)?.id, "task");
});

test("an unknown target falls back, and a non-direct chat is refused", () => {
  const { deps } = setup();
  const preview = previewDirectContext(deps, { chatId: "dm", draft: "hi", target: { kind: "continue", threadId: "gone" } });
  assert.deepEqual(preview.target, { kind: "new", workspaceId: "app" });
  assert.throws(() => previewDirectContext(deps, { chatId: "missing", draft: "hi", target: null }), /not a direct chat/);
});

test("peeking at saved-note delivery never freezes a thread's notes or uses up its pending changes", () => {
  const delivery = createMemoryDelivery();
  const note = (id: string, text: string) => ({ id, botId: "ada", workspaceId: null, text, source: { kind: "user" as const }, createdAt: "", updatedAt: "" });
  const first = { notes: [note("n1", "Prefers tabs")], omitted: 0 };
  assert.deepEqual(delivery.peek("t", first), delivery.forRun("t", first));
  const changed = { notes: [note("n1", "Prefers spaces")], omitted: 0 };
  const peeked = delivery.peek("t", changed);
  assert.match(peeked.turnNotes ?? "", /Prefers spaces/);
  assert.deepEqual(delivery.peek("t", changed), peeked, "peeking twice changes nothing");
  assert.deepEqual(delivery.forRun("t", changed), peeked, "the run still receives the change");
});

test("Nora's chat previews a new work thread on its chat model, with no bot persona, in any workspace", () => {
  const { fake, deps } = setup();
  fake.add(conversation("nora-dm", { title: "Nora", provider: { kind: "nora", instanceId: "direct", model: "direct", reasoning: null, permissionPolicy: "direct" },
    direct: { botId: NORA_CHAT.id, name: NORA_CHAT.name, role: NORA_CHAT.role, avatar: NORA_CHAT.avatar, scope: { kind: "global" }, workspaceId: "app", retiredAt: null } }));
  const preview = previewDirectContext(deps, { chatId: "nora-dm", draft: "Tidy the styles", target: { kind: "new", workspaceId: "site" } });
  assert.deepEqual(preview.targets.map((option) => option.target), [{ kind: "new", workspaceId: "app" }, { kind: "new", workspaceId: "site" }]);
  const work = preview.requests[1];
  assert.equal(work.model, "claude · opus");
  assert.ok(!work.sections.some((section) => section.id === "bot"));
  assert.match(work.purpose, /^Nora does the work and writes the reply in Site\./);
});
