import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { CodexAdapter } from "@main/providers/codex/adapter";
import { EffectWorker } from "@main/execution/effectWorker";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { fixture, provider } from "./fixture";

const server = join(process.cwd(), "tests/unit/main/execution/fixtures/codexServer.cjs");

for (const effort of ["ultra", "not-advertised"]) {
  test(`Codex validates ${effort} against the selected model's native catalog`, async (t) => {
    const f = fixture(t); f.create("conversation", "checkout", { ...provider, model: "first-model", reasoning: effort }); f.submit();
    const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
      environment: { NORA_CODEX_FIXTURE_MODE: "hold" }, policies: { "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } },
      now: () => "2026-11-09T10:00:00.000Z" });
    const providers = new ProviderRegistry(); providers.register(adapter); const worker = new EffectWorker(f.engine, providers);
    try {
      await worker.runNext(["start"]);
      if (effort === "ultra") { assert.equal(f.snapshot().runs[0].state, "running"); assert.equal(f.snapshot().conversation.nativeConversationId, "thread"); }
      else { assert.equal(f.snapshot().runs[0].failure?.code, "unsupported"); assert.equal(f.snapshot().conversation.nativeConversationId, null); }
    } finally { await adapter.close(); }
  });
}

test("signed-out Codex fails with actionable authentication state before creating a native thread", async (t) => {
  const f = fixture(t); f.create(); f.submit(); f.submit("queued");
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "signed-out" }, policies: { "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } },
    now: () => "2026-11-09T10:00:00.000Z" });
  const providers = new ProviderRegistry(); providers.register(adapter);
  try {
    await new EffectWorker(f.engine, providers).runNext(["start"]);
    assert.equal(f.snapshot().runs[0].state, "failed"); assert.equal(f.snapshot().runs[0].failure?.code, "authentication");
    assert.equal(f.snapshot().conversation.nativeConversationId, null); assert.equal(f.snapshot().conversation.queuePaused, true);
    assert.equal(f.snapshot().runs[1].state, "queued");
  } finally { await adapter.close(); }
});

test("Codex readiness errors remain known pre-submission failures rather than uncertain native turns", async (t) => {
  const f = fixture(t); f.create(); f.submit();
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath, arguments: [server],
    environment: { NORA_CODEX_FIXTURE_MODE: "readiness-error" }, policies: { "native-default": { approvalPolicy: "on-request", sandbox: "read-only" } },
    now: () => "2026-11-09T10:00:00.000Z" });
  const providers = new ProviderRegistry(); providers.register(adapter);
  try {
    await new EffectWorker(f.engine, providers).runNext(["start"]);
    const run = f.snapshot().runs[0];
    assert.equal(run.state, "failed"); assert.equal(run.failure?.code, "provider"); assert.equal(run.failure?.retryable, true);
    assert.equal(f.snapshot().conversation.nativeConversationId, null); assert.equal(JSON.stringify(f.snapshot()).includes("secret"), false);
  } finally { await adapter.close(); }
});
