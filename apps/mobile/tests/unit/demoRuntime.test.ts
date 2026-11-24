import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoRuntime } from "@/demo/runtime";
import { createDemoServices } from "@/demo/services";
import { createMemoryStorage } from "@/demo/memoryStorage";
import { demoRuntimeId } from "@/demo/seed";
import { createPreferencesStore } from "@/preferences/preferencesStore";
import { conversationDetailResponseSchema, tasksResponseSchema, inboxResponseSchema, conversationsResponseSchema } from "@shared/remote-access/runtimeApi";
import { flush } from "./fixtures/realtimeHarness";
import type { DemoRuntime } from "@/types/demo.types";

const runtimes: DemoRuntime[] = [];
function setup() { const runtime = createDemoRuntime(); runtimes.push(runtime); return runtime; }
afterEach(() => { for (const runtime of runtimes.splice(0)) runtime.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("offline demo", () => {
  it("seeds valid, usable chats, approvals, questions, activity and bot avatars", async () => {
    const { client } = setup();
    const conversations = await client.conversations();
    expect(conversationsResponseSchema.parse({ conversations }).conversations).toHaveLength(5);
    for (const conversation of conversations) expect(conversationDetailResponseSchema.safeParse(await client.conversation(conversation.conversation.id)).success).toBe(true);
    expect(tasksResponseSchema.safeParse({ tasks: await client.tasks() }).success).toBe(true);
    const inbox = inboxResponseSchema.parse(await client.inbox());
    expect(inbox.items.filter(item => item.kind === "request")).toHaveLength(2);
    expect(inbox.items.some(item => item.kind === "outcome")).toBe(true);
    expect((await client.bots()).every(bot => bot.avatar.seed >= 0)).toBe(true);
  });

  it("streams a simulated reply through events and deduplicates command retries", async () => {
    vi.useFakeTimers();
    const { client, subscribe } = setup();
    const received: string[] = [];
    subscribe(events => received.push(...events.map(event => event.payload.kind)));
    const request = { commandId: "send-1", runId: "run-1", instruction: "Explain the sample project" };
    const receipt = await client.sendMessage("demo-welcome", request);
    expect(await client.sendMessage("demo-welcome", request)).toEqual(receipt);
    expect((await client.conversation("demo-welcome")).header.activeRuns).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(400);
    expect((await client.conversation("demo-welcome")).timeline.items.at(-1)).toMatchObject({ complete: false });
    await vi.advanceTimersByTimeAsync(1000);
    const detail = await client.conversation("demo-welcome");
    expect(detail.header.activeRuns).toHaveLength(0);
    expect(detail.timeline.items.filter(item => item.kind === "message" && item.role === "user")).toHaveLength(1);
    expect(detail.timeline.items.at(-1)).toMatchObject({ complete: true, text: expect.stringContaining("No AI model or computer is running") });
    expect(received).toContain("run");
    expect((await client.events({ after: 0 })).events.length).toBeGreaterThan(0);
  });

  it("stops a task without a delayed completion or reply resurrecting it", async () => {
    vi.useFakeTimers();
    const { client } = setup();
    await client.sendMessage("demo-welcome", { commandId: "send", runId: "run-stop", instruction: "Do a sample task" });
    await client.cancelTask("run-stop", { commandId: "stop", conversationId: "demo-welcome" });
    await vi.runAllTimersAsync();
    const detail = await client.conversation("demo-welcome");
    expect(detail.header.activeRuns).toHaveLength(0);
    expect(detail.timeline.items.some(item => item.id === "run-stop-reply")).toBe(false);
    expect((await client.tasks()).find(task => task.run.id === "run-stop")?.run.state).toBe("interrupted");
  });

  it("answers approvals and questions, removing requests from the inbox", async () => {
    const { client } = setup();
    await client.decideAction("demo-approval-request", { commandId: "approve", conversationId: "demo-approval", response: { kind: "approval", optionId: "allow" } });
    await client.decideAction("demo-question-request", { commandId: "answer", conversationId: "demo-question", response: { kind: "question", answers: { feature: ["Offline access"] } } });
    expect((await client.inbox()).items.filter(item => item.kind === "request")).toHaveLength(0);
    expect((await client.conversation("demo-approval")).timeline.items.at(-1)).toMatchObject({ text: expect.stringContaining("No command was executed") });
    expect((await client.conversation("demo-question")).timeline.items.at(-1)).toMatchObject({ text: expect.stringContaining("Offline access") });
  });

  it("creates chats and bot chats and supports inbox marks and editable settings", async () => {
    const { client } = setup();
    await client.createConversation({ commandId: "create", conversationId: "new-chat", projectId: "demo-personal", title: "New sample" });
    expect((await client.conversations({ projectId: "demo-personal" })).map(item => item.conversation.id)).toEqual(["new-chat"]);
    await client.createBotChat("atlas", { commandId: "bot", conversationId: "bot-chat", scope: { kind: "global" } });
    expect((await client.bots()).find(bot => bot.id === "atlas")?.chatConversationId).toBe("bot-chat");
    expect((await client.conversation("bot-chat")).header.conversation.direct?.name).toBe("Atlas");
    const bot = (await client.botSettings())[0]!;
    await client.saveBot({ id: bot.id, scope: bot.scope, revision: bot.revision, name: "Updated Atlas", role: bot.role, instructions: "New sample instructions", avatar: bot.avatar });
    expect((await client.bots()).find(item => item.id === bot.id)?.name).toBe("Updated Atlas");
    expect(await client.updateSettings({ automaticMemory: false })).toMatchObject({ automaticMemory: false });
    const outcome = (await client.inbox()).items.find(item => item.kind === "outcome")!;
    await client.updateInbox({ kind: "mark-done", itemIds: [outcome.id] });
    expect((await client.inbox()).items.some(item => item.id === outcome.id)).toBe(false);
  });

  it("isolates demo sessions and preferences without accessing the network", async () => {
    const fetch = vi.fn(() => { throw new Error("Demo must not use the network"); });
    const WebSocket = vi.fn(() => { throw new Error("Demo must not open a socket"); });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("WebSocket", WebSocket);
    const storage = createMemoryStorage();
    const preferences = createPreferencesStore(storage);
    const services = createDemoServices(storage, preferences, () => "local-command-id");
    const entry = (await services.directory.list())[0]!;
    const session = services.sessions.get(entry);
    session.start();
    await flush();
    expect(session.getSnapshot()).toMatchObject({ liveUpdates: true, connection: { kind: "live" } });
    expect(await services.getToken()).toBeNull();
    await services.directory.rename(demoRuntimeId, "My demo");
    expect((await services.directory.list())[0]?.name).toBe("My demo");
    expect(await services.probe(entry.hostname)).toMatchObject({ status: "online" });
    expect(() => services.sessions.get({ installationId: "real-computer", hostname: "real.example.com" })).toThrow("simulated computer");
    await services.forgetDeviceData();
    expect(fetch).not.toHaveBeenCalled();
    expect(WebSocket).not.toHaveBeenCalled();
    const fresh = setup();
    expect((await fresh.client.settings()).automaticMemory).toBe(true);
    expect((await fresh.client.bots())[0]?.name).toBe("Atlas");
  });

  it("does not leak mutable snapshots and clears delayed replies on exit", async () => {
    vi.useFakeTimers();
    const runtime = setup();
    const snapshot = await runtime.client.conversation("demo-welcome");
    snapshot.header.conversation.title = "Mutated copy";
    expect((await runtime.client.conversation("demo-welcome")).header.conversation.title).toBe("Explore Nora");
    const listener = vi.fn();
    runtime.subscribe(listener);
    await runtime.client.sendMessage("demo-welcome", { commandId: "send", runId: "disposed", instruction: "Demo message" });
    listener.mockClear();
    runtime.dispose();
    await vi.runAllTimersAsync();
    expect(listener).not.toHaveBeenCalled();
  });
});

it("applies model picker settings to demo creates and follow-ups", async () => {
  const { client } = setup();
  const options = await client.providerOptions("demo-personal");
  const provider = { ...options.defaultBinding!, permissionPolicy: "full", reasoning: "high" };
  await client.createConversation({ commandId: "configured", conversationId: "configured", projectId: "demo-personal", title: "Configured", provider });
  expect((await client.conversation("configured")).header.conversation.provider).toEqual(provider);
  const next = { ...provider, reasoning: "low" };
  await client.sendMessage("configured", { commandId: "change", runId: "changed", instruction: "Continue", providerChange: { expected: provider, next } });
  expect((await client.conversation("configured")).header.conversation.provider).toEqual(next);
});
