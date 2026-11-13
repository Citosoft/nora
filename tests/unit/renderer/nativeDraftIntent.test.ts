import assert from "node:assert/strict";
import test from "node:test";
import { createDraftIntent, deliverDraftIntent } from "@/components/app/logic/nativeDraftIntent";
import type { ConversationClient } from "@/components/app/types/conversationClient.types";
import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import { provider } from "../main/execution/fixture";

test("lost instruction replies retry original create/submit identities instead of creating another native turn", async () => {
  let sequence = 0;
  const intent = createDraftIntent({ conversationId: null, provider, role: { id: "writing" }, botId: null, text: "Draft a brief", workspace: {
    id: "personal", name: "Personal", kind: "personal", workspace: { projectId: "personal", checkoutId: "c", environmentId: "local", path: "/personal", branch: "", access: "write" }
  } }, () => `id-${++sequence}`);
  const commands: ConversationCommand[] = [];
  let loseReply = true;
  const client: ConversationClient = {
    async reference() { throw new Error("unused"); },
    async externalSessions() { return { status: "available", sessions: [] }; },
    async mcp() { return { kind: "unavailable", message: "unused" }; },
    async skills() { return { kind: "unavailable", message: "unused" }; },
    async context() { return null; },
    async execute(command) { commands.push(command); if (command.kind === "submit" && loseReply) { loseReply = false; throw new Error("Reply lost"); }
      return { commandId: command.commandId, conversationId: command.conversationId, acceptedAt: "2026-11-09T10:00:00.000Z", cursor: 1 }; },
    async header() { return null; }, async summaries() { return []; }, async history() { throw new Error("unused"); },
    async catalog() { throw new Error("unused"); }, subscribe() { return () => {}; }
  };
  await assert.rejects(deliverDraftIntent(client, intent), /Reply lost/);
  assert.equal(await deliverDraftIntent(client, intent), intent.submit.conversationId);
  assert.deepEqual(commands.slice(0, 2), commands.slice(2));
  assert.equal(intent.create?.role?.id, "writing");
  assert.equal(intent.submit.instruction, "Draft a brief");
});

test("bot drafts name the bot instead of the user's role", () => {
  let sequence = 0;
  const workspace = { id: "personal", name: "Personal", kind: "personal" as const,
    workspace: { projectId: "personal", checkoutId: "c", environmentId: "local", path: "/personal", branch: "", access: "write" as const } };
  const intent = createDraftIntent({ conversationId: null, provider, role: { id: "writing" }, botId: "ada", text: "Hello", workspace }, () => `id-${++sequence}`);
  assert.equal(intent.create?.botId, "ada");
  assert.equal(intent.create?.role, undefined);
});
