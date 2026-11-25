import assert from "node:assert/strict";
import test from "node:test";
import { createConnectorAuthPrompts } from "@main/connectors/authPrompts";
import type { ConnectorAuthPrompt } from "@shared/types/connectors/authPrompt.types";

test("ask opens a prompt, joins concurrent waiters for the same connector, and settles them together", async () => {
  const changes: ConnectorAuthPrompt[][] = [];
  let sequence = 0;
  const prompts = createConnectorAuthPrompts({
    nextId: () => `p${++sequence}`,
    now: () => "2026-11-25T12:00:00.000Z",
    timeoutMs: 60_000,
    onChanged: (pending) => { changes.push([...pending]); }
  });
  const draft = {
    conversationIds: ["worker", "chat"] as const,
    connectorId: "00000000-0000-4000-8000-000000000001",
    connectorName: "Linear",
    serverName: "linear",
    message: "Authorize Linear"
  };
  const first = prompts.ask({ ...draft }, new AbortController().signal);
  const second = prompts.ask({ ...draft }, new AbortController().signal);
  assert.equal(prompts.pending().length, 1);
  assert.deepEqual(prompts.pending()[0]?.conversationIds, ["worker", "chat"]);
  prompts.signedIn(draft.connectorId);
  assert.deepEqual(await first, { kind: "signed-in" });
  assert.deepEqual(await second, { kind: "signed-in" });
  assert.deepEqual(prompts.pending(), []);
  assert.ok(changes.some((pending) => pending.length === 1));
  assert.deepEqual(changes.at(-1), []);
});

test("decline and unanswered settle the waiting call without signing in", async () => {
  const prompts = createConnectorAuthPrompts({
    nextId: () => "p1",
    now: () => "2026-11-25T12:00:00.000Z",
    timeoutMs: 20,
    onChanged: () => {}
  });
  const draft = {
    conversationIds: ["c1"] as const,
    connectorId: "00000000-0000-4000-8000-000000000002",
    connectorName: "GitHub",
    serverName: "github"
  };
  const waiting = prompts.ask({ ...draft }, new AbortController().signal);
  const prompt = prompts.pending()[0];
  assert.ok(prompt);
  prompts.settle(prompt.id, { kind: "declined" });
  assert.deepEqual(await waiting, { kind: "declined" });

  const timedOut = await prompts.ask({ ...draft }, new AbortController().signal);
  assert.deepEqual(timedOut, { kind: "unanswered" });
});
