import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test, { after } from "node:test";
import type { PermissionMode, SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import { createClaudeLiveSession, describeFinishedWork } from "@main/providers/claude/liveSession";
import { createClaudeInputQueue } from "@main/providers/claude/sdkBridge";
import { readClaudeStream } from "@main/providers/claude/readStream";
import type { ClaudeFrame, ClaudeTurn } from "@main/types/execution/claude.types";
import { claudeAssistantMessage, claudeResult } from "./toolFixtures";

// The session's idle and prompt-suggestion timers are unref'd so they never keep the app alive; with only those pending,
// Node 22's test runner sees the event loop drain mid-turn and cancels the file. Hold the loop open while the tests run.
const keepAlive = setInterval(() => undefined, 60_000);
after(() => clearInterval(keepAlive));

/** A scripted Claude Code process: tests push its output and read what was sent to its input. */
function fakeCli() {
  const output: SDKMessage[] = [];
  let wake: (() => void) | null = null;
  let ended = false;
  const input = createClaudeInputQueue();
  const sent: SDKUserMessage[] = [];
  void (async () => { for await (const message of input) sent.push(message); })();
  const calls: string[] = [];
  const native = {
    async interrupt() { calls.push("interrupt"); },
    close() { calls.push("close"); ended = true; wake?.(); },
    async setModel(model?: string) { calls.push(`model:${model}`); },
    async setPermissionMode(mode: PermissionMode) { calls.push(`mode:${mode}`); },
    async *[Symbol.asyncIterator](): AsyncGenerator<SDKMessage> {
      for (;;) {
        const next = output.shift();
        if (next) { yield next; continue; }
        if (ended) return;
        await new Promise<void>((resolve) => { wake = resolve; });
      }
    }
  };
  return { input, sent, calls, native,
    emit(...messages: SDKMessage[]) { output.push(...messages); const resolve = wake; wake = null; resolve?.(); },
    exit() { ended = true; const resolve = wake; wake = null; resolve?.(); } };
}

const tasksChanged = (...tasks: { id: string; description: string }[]): SDKMessage => ({ type: "system", subtype: "background_tasks_changed",
  tasks: tasks.map((task) => ({ task_id: task.id, task_type: "local_bash", description: task.description })), uuid: randomUUID(), session_id: "session" });
const taskDone = (id: string): SDKMessage => ({ type: "system", subtype: "task_notification", task_id: id, status: "completed",
  output_file: "/tmp/out", summary: "done", uuid: randomUUID(), session_id: "session" });
const reply = (text: string): SDKMessage => claudeAssistantMessage([{ type: "text", text, citations: null }]);

function open(cli: ReturnType<typeof fakeCli>, idleCloseMs = 20) {
  const followUps: { turn: ClaudeTurn; summary: string }[] = [];
  const session = createClaudeLiveSession({ native: cli.native, input: cli.input, sessionId: "session", idleCloseMs,
    opening: { nativeTurnId: randomUUID(), instruction: "Start the build", model: "model-a", permissionMode: "default" },
    readTurn: (source) => readClaudeStream(source, 5), onFollowUp: (turn, summary) => followUps.push({ turn, summary }) });
  return { session, followUps };
}

async function frames(turn: AsyncIterable<ClaudeFrame>): Promise<ClaudeFrame["kind"][]> {
  const kinds: ClaudeFrame["kind"][] = [];
  for await (const frame of turn) kinds.push(frame.kind);
  return kinds;
}

test("a session without background work delivers its turn and closes shortly after", async () => {
  const cli = fakeCli();
  const { session } = open(cli);
  cli.emit(reply("Done"), claudeResult());
  assert.deepEqual(await frames(session.opening), ["text", "finished"]);
  assert.equal(cli.sent[0]?.message.content, "Start the build");
  await delay(60);
  assert.equal(session.isLive(), false);
  assert.ok(cli.calls.includes("close"));
});

test("background work keeps the process open, and its report arrives as a follow-up turn", async () => {
  const cli = fakeCli();
  const { session, followUps } = open(cli);
  cli.emit(tasksChanged({ id: "task-1", description: "Wait for the build" }), reply("Started it"), claudeResult());
  assert.deepEqual(await frames(session.opening), ["text", "finished"]);
  await delay(60);
  assert.equal(session.isLive(), true);
  assert.equal(session.hasBackgroundWork(), true);

  cli.emit(tasksChanged(), taskDone("task-1"), reply("The build passed"), claudeResult());
  await delay(10);
  assert.equal(followUps.length, 1);
  assert.equal(followUps[0]?.summary, "Background task finished: Wait for the build");
  const followUp = followUps[0];
  assert.ok(followUp);
  assert.deepEqual(await frames(followUp.turn), ["text", "finished"]);
  await delay(60);
  assert.equal(session.isLive(), false);
});

test("a message sent while Claude works waits for the turn to end, and switches model and mode first", async () => {
  const cli = fakeCli();
  const { session } = open(cli);
  cli.emit(tasksChanged({ id: "task-1", description: "Dev server" }), reply("Running"), claudeResult());
  await frames(session.opening);
  const turn = session.send({ nativeTurnId: randomUUID(), instruction: "Next step", model: "model-b", permissionMode: "acceptEdits" });
  await delay(5);
  assert.deepEqual(cli.calls.filter((call) => call.startsWith("model") || call.startsWith("mode")), ["model:model-b", "mode:acceptEdits"]);
  assert.equal(cli.sent.at(-1)?.message.content, "Next step");
  cli.emit(reply("On it"), claudeResult());
  assert.deepEqual(await frames(turn), ["text", "finished"]);
  assert.equal(session.isLive(), true);
  await session.close();
  assert.equal(session.isLive(), false);
});

test("a process that exits mid-turn fails that turn", async () => {
  const cli = fakeCli();
  const { session } = open(cli);
  cli.emit(reply("Half"));
  cli.exit();
  assert.deepEqual(await frames(session.opening), ["text"]);
  assert.equal(session.isLive(), false);
});

test("finished work is described for the follow-up's milestone", () => {
  assert.equal(describeFinishedWork([]), "Claude continued after background work changed");
  assert.equal(describeFinishedWork([{ name: "Build", status: "completed" }, { name: "Tests", status: "failed" }]), "Background tasks ended: Build, Tests");
  assert.ok(describeFinishedWork([{ name: "x".repeat(400), status: "completed" }]).length <= 200);
});
