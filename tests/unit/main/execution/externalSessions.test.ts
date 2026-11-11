import { createConversationClient } from "@/components/app/clients/createConversationClient";
import { FixtureSubscriber, GatewayFixture } from "./gatewayFixture";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { CodexAdapter } from "@main/providers/codex/adapter";
import { ClaudeAdapter } from "@main/providers/claude/adapter";
import { createClaudeExternalSessions, normalizeClaudeHistory } from "@main/providers/claude/externalSessions";
import { isExternalWorkspace } from "@main/providers/externalWorkspace";
import { ExecutionHost } from "@main/execution/host";
import { ProviderRegistry } from "@main/execution/providerRegistry";
import { fixture, provider, workspaceAuthority } from "./fixture";
import type { ExternalSession } from "@shared/types/conversation/externalSessions.types";
import type { ClaudeOpenInput } from "@main/types/execution/claude.types";
import type { ConversationCommand, WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { SessionMessage } from "@anthropic-ai/claude-agent-sdk";

const session: ExternalSession = { origin: "cli", id: "native-cli", providerKind: "claude", instanceId: "account-a", cwd: "/project", title: "Continue terminal work",
  createdAt: "2026-11-10T10:00:00.000Z", updatedAt: "2026-11-10T10:01:00.000Z" };
const workspace: WorkspaceRef = { projectId: "project", environmentId: "local", checkoutId: "checkout", path: "/project", branch: "main", access: "write" };
const message = (type: SessionMessage["type"], uuid: string, content: SessionMessage["message"]): SessionMessage => ({
  type, uuid, session_id: session.id, parent_tool_use_id: null, parent_agent_id: null, message: content
});
const messages: SessionMessage[] = [
  message("user", "u", { content: "Original instruction" }),
  message("assistant", "a", { content: [{ type: "thinking", thinking: "Check the project" }, { type: "tool_use", id: "tool", name: "Read", input: { path: "README.md", token: "private" } }] }),
  message("user", "result", { content: [{ type: "tool_result", tool_use_id: "tool", content: "Readme contents" }] }),
  message("assistant", "answer", { content: [{ type: "text", text: "Original answer" }] }),
  { ...message("assistant", "subagent", { content: "Nested output" }), parent_tool_use_id: "tool" }
];

test("workspace matching follows symlinks and excludes siblings, missing paths and other checkouts", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nora-cli-workspaces-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "project", "src"), { recursive: true }); await mkdir(join(root, "project-other"));
  await symlink(join(root, "project"), join(root, "alias"));
  assert.equal(await isExternalWorkspace(join(root, "project", "src"), join(root, "alias")), true);
  assert.equal(await isExternalWorkspace(join(root, "project-other"), join(root, "project")), false);
  assert.equal(await isExternalWorkspace(join(root, "missing"), join(root, "project")), false);
  assert.equal(await isExternalWorkspace("relative", join(root, "project")), false);
});

test("Claude history narrows SDK payloads, preserves messages and tools, and does not turn tool results into user instructions", () => {
  const transcript = normalizeClaudeHistory(session, [...messages, message("assistant", "invalid", { unexpected: true })]);
  assert.equal(transcript.turns.length, 1);
  assert.equal(transcript.turns[0].instruction, "Original instruction");
  assert.equal(transcript.turns[0].state, "completed");
  const tool = transcript.turns[0].items.find((item) => item.kind === "tool"); assert.ok(tool?.kind === "tool");
  assert.equal(tool.output, "Readme contents"); assert.equal(tool.state, "completed");
  assert.ok(tool.details?.input?.includes("[redacted]")); assert.ok(!tool.details?.input?.includes("private"));
  assert.equal(JSON.stringify(transcript).includes("Nested output"), false);
  assert.equal(normalizeClaudeHistory(session, [message("user", "u", { content: "Interrupted prompt" })]).turns[0].state, "interrupted");
});

test("Claude SDK discovery filters by workspace, excludes programmatic sessions and reads the selected native transcript", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nora-claude-cli-")); t.after(() => rm(root, { recursive: true, force: true }));
  const selected = { ...workspace, path: root };
  const reader = createClaudeExternalSessions("account-a", {
    async listSessions(options) { assert.equal(options?.includeProgrammatic, false); return [
      { sessionId: session.id, summary: session.title, cwd: root, lastModified: Date.parse(session.updatedAt) },
      { sessionId: "other", summary: "Other", cwd: `${root}-other`, lastModified: Date.parse(session.updatedAt) }
    ]; },
    async getSessionInfo(id) { return id === session.id
      ? { sessionId: id, summary: session.title, cwd: root, lastModified: Date.parse(session.updatedAt) } : undefined; },
    async getSessionMessages(id, options) { assert.equal(id, session.id); assert.equal(options, undefined); return messages; }
  }, join(root, "desktop-missing"));
  assert.deepEqual((await reader.list(selected)).map((entry) => entry.id), [session.id]);
  assert.equal((await reader.read(selected, session.id)).turns[0].instruction, "Original instruction");
  await assert.rejects(reader.read(selected, "missing"), /unavailable in this workspace/);
});

for (const kind of ["codex", "claude"] as const) for (const origin of ["cli", "desktop"] as const) test(`${kind} imports a ${origin} conversation once and resumes its native session only after a new instruction`, async (t) => {
  const f = fixture(t); const root = await mkdtemp(join(tmpdir(), "nora-cli-import-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const log = join(root, "requests.jsonl"); const selected = { ...workspace, path: root };
  const binding = { ...provider, kind };
  const opens: ClaudeOpenInput[] = [];
  const adapter = kind === "codex" ? new CodexAdapter({ instanceId: binding.instanceId, executable: process.execPath,
    arguments: [join(process.cwd(), "tests/unit/main/execution/fixtures/externalServer.cjs")],
    environment: { NORA_EXTERNAL_WORKSPACE: root, NORA_EXTERNAL_REQUEST_LOG: log, NORA_EXTERNAL_SOURCE: origin === "desktop" ? "appServer" : "cli" }, now: () => session.updatedAt,
    policies: { "native-default": { approvalPolicy: "on-request", sandbox: "workspace-write" } } })
    : new ClaudeAdapter({ instanceId: binding.instanceId, policies: { "native-default": "default" },
      externalSessions: { async list() { return [{ ...session, origin, cwd: root }]; }, async read() { return normalizeClaudeHistory({ ...session, origin, cwd: root }, messages); } },
      discover: async () => ({ models: [], authentication: "present" }), now: () => session.updatedAt, nextId: randomUUID,
      open(input) { opens.push(input); return { async interrupt() {}, close() {}, async *[Symbol.asyncIterator]() {
        yield { kind: "finished", eventId: "done", status: "completed", failure: null, usage: { inputTokens: 1, outputTokens: 1 } };
      } }; }
    });
  const registry = new ProviderRegistry(); registry.register(adapter);
  const host = new ExecutionHost({ store: f.store, providers: registry, workspaces: workspaceAuthority,
    owner: { id: randomUUID(), processId: process.pid }, isProcessAlive: () => true, now: () => session.updatedAt, nextId: randomUUID, onFailure() {} });
  host.start();
  const ipc = new GatewayFixture({ resolveHost: (environmentId) => environmentId === "local" ? host : null });
  const client = createConversationClient(ipc.bridge(new FixtureSubscriber(1)), "local");
  try {
    const found = await client.externalSessions(kind, binding.instanceId, selected);
    assert.equal(found.status, "available"); if (found.status !== "available") return;
    assert.equal(found.sessions.length, 1);
    const command: ConversationCommand = { kind: "create", commandId: "import", conversationId: "imported", externalSessionId: session.id,
      title: "Untrusted title", workspace: selected, provider: binding, parentId: null };
    const receipt = await client.execute(command);
    assert.deepEqual(await client.execute(command), receipt);
    const duplicate = await client.execute({ ...command, commandId: "another-window", conversationId: "another-id" });
    assert.equal(duplicate.conversationId, "imported"); assert.equal(host.summaries().length, 1);
    const snapshot = f.snapshot("imported");
    assert.equal(snapshot.conversation.nativeConversationId, session.id); assert.equal(snapshot.conversation.origin, origin);
    assert.equal(snapshot.conversation.title, session.title); assert.equal(snapshot.runs.length, 1);
    assert.ok(snapshot.items.some((item) => item.kind === "message" && item.role === "assistant" && item.text.includes("Original")));
    const history = await client.history({ conversationId: receipt.conversationId, scope: "timeline", limit: 100 });
    assert.ok(history.scope === "timeline" && history.items.some((item) => item.kind === "message" && item.role === "assistant"));
    assert.equal(f.store.effects().length, 0); assert.equal(opens.length, 0);
    if (kind === "codex") assert.equal((await readFile(log, "utf8")).includes('"turn/start"'), false);
    assert.deepEqual(await host.externalSessions(kind, binding.instanceId, selected), { status: "available", sessions: [] });
    await client.execute({ kind: "archive", commandId: "settle-external", conversationId: "imported" });
    assert.ok((await client.header("imported"))?.conversation.archivedAt);
    assert.deepEqual(await host.externalSessions(kind, binding.instanceId, selected), { status: "available", sessions: [] });
    await client.execute({ kind: "unarchive", commandId: "restore-external", conversationId: "imported" });
    assert.equal((await client.header("imported"))?.conversation.archivedAt, null);
    assert.equal(f.store.effects().length, 0);

    await host.execute({ kind: "submit", commandId: "continue", conversationId: "imported", runId: "new", instruction: "Continue here" });
    for (let attempt = 0; attempt < 100 && f.snapshot("imported").runs.find((run) => run.id === "new")?.state !== "completed"; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(f.snapshot("imported").runs.find((run) => run.id === "new")?.state, "completed");
    if (kind === "claude") {
      assert.equal(opens.length, 1); assert.equal(opens[0].resume, true); assert.equal(opens[0].sessionId, session.id); assert.equal(opens[0].instruction, "Continue here");
    } else {
      const requests = await readFile(log, "utf8"); assert.ok(requests.includes('"thread/resume"')); assert.ok(!requests.includes('"thread/start"'));
      assert.equal(requests.split('\n').filter((line) => line.includes('"turn/start"')).length, 1);
    }
  } finally { ipc.dispose(); await host.shutdown(); }
});

test("Codex refuses to adopt an active CLI turn", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nora-cli-active-")); t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new CodexAdapter({ instanceId: "account-a", executable: process.execPath,
    arguments: [join(process.cwd(), "tests/unit/main/execution/fixtures/externalServer.cjs")], environment: { NORA_EXTERNAL_WORKSPACE: root, NORA_EXTERNAL_ACTIVE: "1" }, policies: {}, now: () => session.updatedAt });
  try { await assert.rejects(adapter.externalSessions.read({ ...workspace, path: root }, session.id), /Stop the active Codex turn/); }
  finally { await adapter.close(); }
});


test("the installed Claude SDK discovers and imports a real transcript from a workspace subdirectory with an aliased project path", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "nora-claude-transcript-")); t.after(() => rm(root, { recursive: true, force: true }));
  const project = join(root, "project"); const cwd = join(project, "src"); await mkdir(cwd, { recursive: true });
  const alias = join(root, "alias"); await symlink(cwd, alias);
  const config = join(root, "config"); const logs = join(config, "projects", alias.replace(/[^a-zA-Z0-9]/g, "-"));
  await mkdir(logs, { recursive: true });
  const nativeId = randomUUID(); const userId = randomUUID();
  const base = { sessionId: nativeId, cwd: alias, isSidechain: false, version: "2.1.36", userType: "external", entrypoint: "cli", timestamp: session.createdAt };
  await writeFile(join(logs, `${nativeId}.jsonl`), [
    { ...base, type: "user", uuid: userId, parentUuid: null, message: { role: "user", content: "Synthetic terminal prompt" } },
    { ...base, type: "assistant", uuid: randomUUID(), parentUuid: userId, message: { id: "msg-test", role: "assistant", model: "test",
      content: [{ type: "text", text: "Synthetic terminal answer" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } }
  ].map((entry) => JSON.stringify(entry)).join("\n") + "\n");
  const desktopDirectory = join(config, "desktop", "account", "organization"); await mkdir(desktopDirectory, { recursive: true });
  const desktopId = `local_${randomUUID()}`;
  await writeFile(join(desktopDirectory, `${desktopId}.json`), JSON.stringify({ sessionId: desktopId, cliSessionId: nativeId, cwd: alias,
    createdAt: Date.parse(session.createdAt), lastActivityAt: Date.parse(session.updatedAt), title: "Desktop coding session", isArchived: false }));
  // The SDK reads its own process environment; a child isolates the test configuration from every other test.
  const script = `const {createClaudeExternalSessions}=require(process.argv[1]);
    (async()=>{const reader=createClaudeExternalSessions('account-a',undefined,process.env.NORA_TEST_DESKTOP);const workspace={path:process.argv[2]};
      const sessions=await reader.list(workspace);const transcript=await reader.read(workspace,process.argv[3]);
      console.log(JSON.stringify({count:sessions.length,origin:transcript.session.origin,instruction:transcript.turns[0].instruction,answer:transcript.turns[0].items.at(-1).text}));
    })().catch(()=>{process.exitCode=1});`;
  const { stdout } = await promisify(execFile)(process.execPath, ["-e", script,
    join(process.cwd(), "dist-tests/main/providers/claude/externalSessions.js"), project, nativeId], { env: { ...process.env, CLAUDE_CONFIG_DIR: config, NORA_TEST_DESKTOP: join(config, "desktop") } });
  const result = z.object({ count: z.number(), origin: z.string(), instruction: z.string(), answer: z.string() }).parse(JSON.parse(stdout));
  assert.deepEqual(result, { count: 1, origin: "desktop", instruction: "Synthetic terminal prompt", answer: "Synthetic terminal answer" });
});
