import { describe, expect, it } from "vitest";
import { z } from "zod";
import { buildCreateConversation, buildDecideAction, buildSendMessage } from "@/commands/commandBuilders";
import { executePendingCommand } from "@/commands/executePendingCommand";
import { createPendingCommandStore, PENDING_COMMANDS_STORAGE_KEY } from "@/commands/pendingCommandStore";
import { createRuntimeClient } from "@/api/runtime/runtimeClient";
import type { FetchLike } from "@/types/http.types";
import type { CommandFactoryDeps } from "@/types/pendingCommand.types";
import { fakeFetch, json, networkError, type RecordedCall } from "./fixtures/fakeFetch";
import { memoryStorage } from "./fixtures/memoryStorage";

function idSequence(): CommandFactoryDeps {
  let next = 0;
  return { createId: () => `id-${++next}`, now: () => new Date("2026-11-16T10:00:00.000Z") };
}

const receiptFor = (call: RecordedCall) => {
  const body = z.object({ commandId: z.string(), conversationId: z.string().optional() }).passthrough().parse(call.body);
  return json(200, { receipt: { commandId: body.commandId, conversationId: body.conversationId ?? "conv-1", cursor: 7, acceptedAt: "2026-11-16T10:00:00.000Z" } });
};

const runtimeClient = (fetch: FetchLike) => createRuntimeClient({ hostname: "abc123.remote.withnora.run", fetch, timeoutMs: 100,
  commandTimeoutMs: 100, getToken: async () => "token" });

describe("pending commands", () => {
  it("saves the command before sending and retries a lost send with the same IDs", async () => {
    const storage = memoryStorage();
    const store = createPendingCommandStore(storage);
    const command = buildSendMessage(idSequence(), { runtimeId: "rt", conversationId: "conv-1", instruction: "  Summarise the report " });
    const { fetch, calls } = fakeFetch(() => {
      expect(storage.data.has(PENDING_COMMANDS_STORAGE_KEY)).toBe(true);
      return networkError();
    }, receiptFor);
    const client = runtimeClient(fetch);

    const first = await executePendingCommand(client, store, command);
    expect(first.status).toBe("uncertain");
    expect(store.get(command.key)?.lastError).toMatch(/couldn't reach your computer/i);

    const saved = store.get(command.key);
    if (!saved) throw new Error("command was not kept");
    const second = await executePendingCommand(client, store, saved);
    expect(second.status).toBe("accepted");
    expect(calls.map((call) => call.body)).toEqual([
      { commandId: "id-2", runId: "id-1", instruction: "Summarise the report" },
      { commandId: "id-2", runId: "id-1", instruction: "Summarise the report" }
    ]);
    expect(store.list()).toEqual([]);
    expect(storage.data.has(PENDING_COMMANDS_STORAGE_KEY)).toBe(false);
  });

  it("survives a reload: a command saved by one store is retried by the next with its IDs", async () => {
    const storage = memoryStorage();
    const command = buildSendMessage(idSequence(), { runtimeId: "rt", conversationId: "conv-1", instruction: "Hello" });
    await createPendingCommandStore(storage).put(command);
    const reloaded = createPendingCommandStore(storage);
    await reloaded.load();
    expect(reloaded.get(command.key)).toEqual(command);
  });

  it("discards a command the runtime definitively rejected", async () => {
    const store = createPendingCommandStore(memoryStorage());
    const command = buildDecideAction(idSequence(), { runtimeId: "rt", conversationId: "conv-1", requestId: "req-1",
      response: { kind: "approval", optionId: "allow-once" } });
    const { fetch } = fakeFetch(() => json(409, { error: { code: "expired", message: "This request has expired." } }));
    const outcome = await executePendingCommand(runtimeClient(fetch), store, command);
    expect(outcome.status).toBe("rejected");
    expect(outcome.status === "rejected" && outcome.error.message).toBe("This request has expired.");
    expect(store.list()).toEqual([]);
  });

  it("keeps the command when the runtime is temporarily unavailable or rate limited", async () => {
    const store = createPendingCommandStore(memoryStorage());
    const command = buildSendMessage(idSequence(), { runtimeId: "rt", conversationId: "conv-1", instruction: "Hi" });
    const { fetch } = fakeFetch(() => json(503, { error: { code: "unavailable", message: "Paused" } }));
    expect((await executePendingCommand(runtimeClient(fetch), store, command)).status).toBe("uncertain");
    expect(store.get(command.key)).toBeDefined();
  });

  it("creates a conversation once and only resends the first message on retry", async () => {
    const store = createPendingCommandStore(memoryStorage());
    const command = buildCreateConversation(idSequence(), { runtimeId: "rt", projectId: "proj-1", title: "Launch", instruction: "Draft a plan" });
    const { fetch, calls } = fakeFetch(receiptFor, networkError, receiptFor);
    const client = runtimeClient(fetch);
    expect((await executePendingCommand(client, store, command)).status).toBe("uncertain");
    expect(store.get(command.key)).toMatchObject({ kind: "create-conversation", created: true });
    expect((await executePendingCommand(client, store, command)).status).toBe("accepted");
    expect(calls.map((call) => [call.url.replace("https://abc123.remote.withnora.run", ""), call.body])).toEqual([
      ["/v1/conversations", { commandId: "id-2", conversationId: "id-1", projectId: "proj-1", title: "Launch" }],
      ["/v1/conversations/id-1/messages", { commandId: "id-3", runId: "id-4", instruction: "Draft a plan" }],
      ["/v1/conversations/id-1/messages", { commandId: "id-3", runId: "id-4", instruction: "Draft a plan" }]
    ]);
    expect(store.list()).toEqual([]);
  });

  it("drops malformed entries read back from storage", async () => {
    const valid = buildSendMessage(idSequence(), { runtimeId: "rt", conversationId: "conv-1", instruction: "Hi" });
    const storage = memoryStorage({ [PENDING_COMMANDS_STORAGE_KEY]: JSON.stringify([{ kind: "send-message", key: "x" }, valid]) });
    const store = createPendingCommandStore(storage);
    await store.load();
    expect(store.list()).toEqual([valid]);
  });
});
