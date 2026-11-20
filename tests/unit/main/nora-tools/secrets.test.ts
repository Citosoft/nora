import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createNoraToolServer } from "@main/nora-tools/server";
import type { Conversation } from "@shared/types/conversation/contracts.types";
import { conversation, noraFixture, workspace } from "./fixture";

const live = new AbortController().signal;

test("a bot asked from another thread shows its secret prompts in the threads above it, named for the bot and workspace", async () => {
  const f = noraFixture();
  f.conversations.set("child", conversation("child", { parentId: "plain", bot: f.conversations.get("bot")?.bot }));
  const context = f.deps.context("child");
  assert.ok(context);
  const pending = f.deps.secrets.request({ name: "API_TOKEN", purpose: "Deploys", scope: "everywhere", multiline: false }, context, live);
  const prompt = await f.secrets.nextPrompt();
  assert.deepEqual([prompt.conversationIds, prompt.requester, prompt.workspaceName, prompt.projectId], [["child", "plain"], "Ada", "Web", "w"]);
  f.secrets.service.answer({ kind: "save", promptId: prompt.id, value: "v" });
  assert.equal(await pending, "saved");
  assert.deepEqual(f.deps.secrets.list(context).map((secret) => [secret.name, secret.scope]), [["API_TOKEN", "everywhere"]]);
  assert.equal(f.deps.secrets.remove("API_TOKEN", "workspace", context), false);
  assert.equal(f.deps.secrets.remove("API_TOKEN", "everywhere", context), true);
});

test("a thread with read-only workspace access cannot run commands with secrets", () => {
  const f = noraFixture();
  f.conversations.set("reader", conversation("reader", { workspace: { ...workspace, access: "read" } }));
  const context = f.deps.context("reader");
  assert.ok(context);
  assert.throws(() => f.deps.secrets.run({ command: "env", secrets: ["API_TOKEN"], timeoutSeconds: 5 }, context, live), /read-only access/);
});

test("over MCP a secret is requested, used and deleted by name without its value ever reaching the model", async (t) => {
  const f = noraFixture();
  const server = createNoraToolServer(f.deps);
  t.after(() => server.close());
  const endpoint = await server.resolve(f.conversations.get("plain") as Conversation);
  assert.ok(endpoint);
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint.url), { requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } } }));
  t.after(() => client.close());
  const seen: string[] = [];
  const call = async (name: string, args: Record<string, unknown>) => { const result = await client.callTool({ name, arguments: args }); seen.push(JSON.stringify(result)); return result; };
  const answerNext = async (answer: (promptId: string) => Parameters<typeof f.secrets.service.answer>[0]) => { f.secrets.service.answer(answer((await f.secrets.nextPrompt()).id)); };

  const invalid = await call("request_secret", { name: "not a name", purpose: "x" });
  assert.equal(invalid.isError, true);
  const [requested] = await Promise.all([call("request_secret", { name: "API_TOKEN", purpose: "Deploys the site" }),
    answerNext((promptId) => ({ kind: "save", promptId, value: "s3cr3t-value" }))]);
  assert.match(JSON.stringify(requested.content), /API_TOKEN is saved securely/);
  assert.match(JSON.stringify((await call("list_secrets", {})).content), /API_TOKEN \(this workspace\): Deploys the site/);

  f.secrets.state.result = { exitCode: 0, output: "using s3cr3t-value", timedOut: false };
  const [ran] = await Promise.all([call("run_with_secrets", { command: "deploy", secrets: ["API_TOKEN"] }), answerNext((promptId) => ({ kind: "allow", promptId, remember: false }))]);
  assert.match(JSON.stringify(ran.content), /Exit code 0\\nusing \[API_TOKEN redacted\]/);
  const [refused] = await Promise.all([call("run_with_secrets", { command: "deploy", secrets: ["API_TOKEN"] }), answerNext((promptId) => ({ kind: "decline", promptId }))]);
  assert.equal(refused.isError, true);
  assert.match(JSON.stringify((await call("delete_secret", { name: "API_TOKEN" })).content), /Deleted API_TOKEN/);
  assert.equal((await call("delete_secret", { name: "API_TOKEN" })).isError, true);
  assert.doesNotMatch(seen.join("\n"), /s3cr3t-value/);
});
