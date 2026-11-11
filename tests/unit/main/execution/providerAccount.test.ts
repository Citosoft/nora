import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClaudeAccount } from "@main/providers/claude/authentication";
import { normalizeCodexAccount } from "@main/providers/codex/account";

test("Claude SDK account reports map to sign-in state", () => {
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "claude.ai", subscriptionType: "max", email: "me@example.test" }),
    { state: "signed-in", method: "Claude Max", label: "me@example.test" });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", subscriptionType: "Claude Team", email: "me@example.test", organization: "Org" }),
    { state: "signed-in", method: "Claude Team", label: "me@example.test" }, "current runtimes omit tokenSource for a claude.ai login");
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "claude.ai", apiKeySource: "ANTHROPIC_API_KEY" }),
    { state: "signed-in", method: "API key", label: null });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "CLAUDE_CODE_OAUTH_TOKEN", apiKeySource: "none" }),
    { state: "signed-in", method: "Long-lived token", label: null });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "none", apiKeySource: "none" }), { state: "signed-out" });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty" }), { state: "signed-out" });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "bedrock" }), { state: "unknown" });
});

test("Codex app-server account replies map to sign-in state", () => {
  assert.deepEqual(normalizeCodexAccount({ requiresOpenaiAuth: true, account: { type: "chatgpt", email: "me@example.test", planType: "pro" } }),
    { state: "signed-in", method: "ChatGPT Pro", label: "me@example.test" });
  assert.deepEqual(normalizeCodexAccount({ requiresOpenaiAuth: true, account: { type: "chatgpt", email: null, planType: "unknown", workspaceName: "Team" } }),
    { state: "signed-in", method: "ChatGPT", label: "Team" });
  assert.deepEqual(normalizeCodexAccount({ requiresOpenaiAuth: true, account: { type: "apiKey" } }), { state: "signed-in", method: "API key", label: null });
  assert.deepEqual(normalizeCodexAccount({ requiresOpenaiAuth: true, account: null }), { state: "signed-out" });
  assert.deepEqual(normalizeCodexAccount({ requiresOpenaiAuth: false, account: null }), { state: "unknown" });
});
