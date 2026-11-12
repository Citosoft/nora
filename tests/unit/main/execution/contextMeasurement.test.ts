import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ExecutionHost } from "@main/execution/host";
import { nativeCapabilities } from "@main/execution/providerCapabilities";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { findLastLine } from "@main/helpers/findLastLine";
import { createClaudeContextReader } from "@main/providers/claude/contextReader";
import { parseRolloutContext, readRolloutContext } from "@main/providers/codex/rolloutContext";
import type { Conversation, ContextReading } from "@shared/types/conversation/contracts.types";
import { fixture, workspaceAuthority } from "./fixture";
import { ProviderDouble } from "./providerDouble";

const reading: ContextReading = { usedTokens: 90_000, windowTokens: 272_000, inputTokens: 88_000, cachedInputTokens: 80_000, outputTokens: 2_000 };

class MeasuringProvider extends ProviderDouble {
  override readonly capabilities = { ...nativeCapabilities, contextUsage: true };
  reads = 0;
  release = (): void => {};
  async readContext(): Promise<ContextReading | null> {
    this.reads++;
    await new Promise<void>((resolve) => { this.release = resolve; });
    return reading;
  }
}

test("the host measures an unmeasured thread once, persists it without reordering, and keeps live readings", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  f.update({ kind: "started", eventId: "started", nativeConversationId: "native", nativeTurnId: "turn" });
  f.update({ kind: "finished", eventId: "done", status: "completed", failure: null, usage: null });
  const provider = new MeasuringProvider();
  const providers = new ProviderRegistry(); providers.register(provider);
  const host = new ExecutionHost({ store: f.store, providers, workspaces: workspaceAuthority, owner: { id: randomUUID(), processId: process.pid },
    isProcessAlive: () => true, now: () => "2026-10-21T11:00:00.000Z", nextId: randomUUID, effectConcurrency: 1, onFailure: () => {} });
  host.start();
  try {
    const updatedAt = f.snapshot().conversation.updatedAt;
    const first = host.context("conversation"), second = host.context("conversation");
    await new Promise((resolve) => setImmediate(resolve));
    provider.release();
    assert.deepEqual(await first, { ...reading, updatedAt: "2026-10-21T11:00:00.000Z" });
    assert.deepEqual(await second, await first);
    assert.equal(provider.reads, 1);
    assert.equal(f.snapshot().conversation.updatedAt, updatedAt);
    assert.deepEqual(await host.context("conversation"), await first);
    assert.equal(provider.reads, 1);
  } finally { await host.shutdown(); }
});

test("history readings never replace a context a turn already reported", (t) => {
  const f = fixture(t); f.create(); f.submit();
  const attemptId = f.snapshot().runs[0].attemptId;
  const live = { ...reading, usedTokens: 1_000, updatedAt: "2026-10-21T10:00:00.000Z" };
  f.engine.accept({ kind: "context", eventId: "live", conversationId: "conversation", runId: "run", attemptId, context: live });
  assert.deepEqual(f.engine.recordContext("conversation", reading), live);
  assert.deepEqual(f.snapshot().conversation.context, live);
});

test("Claude reads the last main-loop request from the transcript, skipping subagents and unrelated entries", async () => {
  const conversation = { nativeConversationId: "session", workspace: { path: "/repo" } } as Conversation;
  const assistant = (model: string, input: number, subagent = false) => ({ type: "assistant", parent_tool_use_id: subagent ? "tool" : null, parent_agent_id: null,
    message: { model, usage: { input_tokens: input, output_tokens: 10, cache_read_input_tokens: 100, cache_creation_input_tokens: null } } });
  const windows: string[] = [];
  const read = createClaudeContextReader(async (model) => { windows.push(model); return 200_000; }, { async getSessionMessages(id, options) {
    assert.deepEqual([id, options.dir], ["session", "/repo"]);
    return [assistant("old", 5), assistant("opus", 20), assistant("haiku", 999, true), { type: "user", message: {}, parent_tool_use_id: null, parent_agent_id: null }];
  } });
  assert.deepEqual(await read(conversation), { usedTokens: 130, windowTokens: 200_000, inputTokens: 120, cachedInputTokens: 100, outputTokens: 10 });
  assert.deepEqual(windows, ["opus"]);
  const empty = createClaudeContextReader(async () => 200_000, { async getSessionMessages() { return []; } });
  assert.equal(await empty(conversation), null);
});

test("Codex reads the latest token_count from the end of a rollout file", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "nora-rollout-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const event = (input: number, window: number | null) => JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: {
    total_token_usage: { input_tokens: 1, output_tokens: 1 }, last_token_usage: { input_tokens: input, cached_input_tokens: 50, output_tokens: 5 }, model_context_window: window } } });
  const filler = JSON.stringify({ type: "response_item", payload: { text: "x".repeat(100_000) } });
  const path = join(directory, "rollout.jsonl");
  writeFileSync(path, [event(10, 1_000), filler, event(400, 272_000), filler, filler, ""].join("\n"));
  assert.deepEqual(await readRolloutContext(path), { usedTokens: 405, windowTokens: 272_000, inputTokens: 400, cachedInputTokens: 50, outputTokens: 5 });
  assert.equal(parseRolloutContext(event(10, null)), null);
  assert.equal(parseRolloutContext("{not json token_count"), null);
  assert.equal(await findLastLine(path, () => null), null);
});
