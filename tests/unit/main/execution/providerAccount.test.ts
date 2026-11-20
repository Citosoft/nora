import assert from "node:assert/strict";
import test from "node:test";
import { normalizeClaudeAccount, normalizeClaudeConnection } from "@main/providers/claude/authentication";
import { claudeLoginFlag, claudeLoginMethods } from "@main/providers/claude/account";
import { normalizeCodexAccount } from "@main/providers/codex/account";

test("Claude SDK account reports map to sign-in state", () => {
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "claude.ai", subscriptionType: "max", email: "me@example.test" }),
    { state: "signed-in", method: "Claude Max", label: "me@example.test" });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", subscriptionType: "Claude Team", email: "me@example.test", organization: "Org" }),
    { state: "signed-in", method: "Claude Team", label: "me@example.test" }, "current runtimes omit tokenSource for a claude.ai login");
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "claude.ai", apiKeySource: "ANTHROPIC_API_KEY" }),
    { state: "signed-in", method: "API key", label: null });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", apiKeySource: "/login managed key", email: "me@example.test", organization: "Org" }),
    { state: "signed-in", method: "Anthropic Console", label: "me@example.test" }, "an Anthropic Console login provisions a managed key");
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "CLAUDE_CODE_OAUTH_TOKEN", apiKeySource: "none" }),
    { state: "signed-in", method: "Long-lived token", label: null });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty", tokenSource: "none", apiKeySource: "none" }), { state: "signed-out" });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "firstParty" }), { state: "signed-out" });
  assert.deepEqual(normalizeClaudeAccount({ apiProvider: "bedrock" }), { state: "unknown" });
});

test("Claude sign-in offers a subscription and an Anthropic Console login", () => {
  assert.deepEqual(claudeLoginMethods.map((method) => method.id), ["claudeai", "console"]);
  assert.equal(claudeLoginFlag(undefined), "--claudeai", "no method keeps the runtime's default sign-in");
  assert.equal(claudeLoginFlag("claudeai"), "--claudeai");
  assert.equal(claudeLoginFlag("console"), "--console");
  assert.equal(claudeLoginFlag("sso"), null);
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


test("Claude connection icons follow credential precedence and leave ambiguous tokens unknown", () => {
  assert.equal(normalizeClaudeConnection({ apiProvider: "firstParty", tokenSource: "claude.ai", subscriptionType: "max" }), "subscription");
  assert.equal(normalizeClaudeConnection({ apiProvider: "firstParty", subscriptionType: "Claude Team", email: "me@example.test" }), "subscription");
  assert.equal(normalizeClaudeConnection({ apiProvider: "firstParty", apiKeySource: "/login managed key" }), "api");
  assert.equal(normalizeClaudeConnection({ apiProvider: "firstParty", tokenSource: "claude.ai", subscriptionType: "max", apiKeySource: "ANTHROPIC_API_KEY" }), "api");
  assert.equal(normalizeClaudeConnection({ apiProvider: "bedrock", subscriptionType: "max" }), "api");
  assert.equal(normalizeClaudeConnection({ tokenSource: "CLAUDE_CODE_OAUTH_TOKEN" }), "unknown");
  assert.equal(normalizeClaudeConnection({ tokenSource: "CLAUDE_CODE_OAUTH_TOKEN", subscriptionType: "max" }), "subscription");
  assert.equal(normalizeClaudeConnection({ apiProvider: "firstParty" }), "unknown");
});
