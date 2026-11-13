const { createInterface } = require("node:readline");
const fs = require("node:fs");
const mode = process.env.NORA_CODEX_FIXTURE_MODE || "approval";
const send = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const notify = (method, params) => send({ method, params });
const route = { threadId: "thread", turnId: "turn" };
const finish = () => notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "completed", error: null } });
let resumeCount = 0;
createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ id: message.id, result: { userAgent: "codex/0.167.0-fixture" } });
  else if (message.method === "turn/steer") {
    if (mode === "no-steering") send({ id: message.id, error: { code: -32601, message: "Method not found" } });
    else if (!message.params.threadId) send({ id: message.id, error: { code: -32600, message: 'missing field `threadId`' } });
    else if (message.params.expectedTurnId !== "turn") send({ id: message.id, error: { code: -32600, message: "Turn mismatch" } });
    else send({ id: message.id, result: { turnId: "turn" } });
  }
  else if (message.method === "account/read" && mode === "readiness-error") send({ id: message.id, error: { code: -32603, message: "secret configuration details" } });
  else if (message.method === "account/read") send({ id: message.id, result: { requiresOpenaiAuth: true,
    account: mode === "signed-out" ? null : { type: "chatgpt" } } });
  else if (message.method === "config/read") send({ id: message.id, result: { config: { tool_output_token_limit: Number(process.env.NORA_CODEX_OUTPUT_LIMIT || 10000) } } });
  else if (message.method === "model/list") send({ id: message.id, result: {
    data: [{ model: message.params.cursor ? "second-model" : "first-model", displayName: "Catalog model", description: "No entitlement claim",
      hidden: false, defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "medium" }, { reasoningEffort: "ultra" }] }],
    nextCursor: message.params.cursor ? null : "page-two"
  } });
  else if (message.method === "thread/start" || message.method === "thread/resume") {
    if (process.env.NORA_CODEX_EXPECT_OUTPUT_LIMIT && message.params.config?.tool_output_token_limit !== Number(process.env.NORA_CODEX_EXPECT_OUTPUT_LIMIT)) {
      send({ id: message.id, error: { code: -32602, message: "Output budget mismatch" } }); return;
    }
    if (message.params.config?.["features.default_mode_request_user_input"] !== true || !message.params.developerInstructions?.includes("request_user_input")) {
      send({ id: message.id, error: { code: -32602, message: "Interactive questions must be enabled and explained on start and resume" } }); return;
    }
    if (process.env.NORA_CODEX_EXPECT_GUIDANCE && message.params.developerInstructions !== process.env.NORA_CODEX_EXPECT_GUIDANCE) {
      send({ id: message.id, error: { code: -32602, message: "Conversation guidance mismatch" } }); return;
    }
    if (message.method === "thread/resume") resumeCount++;
    send({ id: message.id, result: { thread: { id: "thread", path: process.env.NORA_CODEX_FIXTURE_ROLLOUT_PATH ?? null } } });
  } else if (message.method === "turn/start") {
    if (message.params.effort && message.params.effort !== "ultra" && message.params.effort !== "medium") {
      send({ id: message.id, error: { code: -32602, message: "Invalid fixture effort" } }); return;
    }
    send({ id: message.id, result: { turn: { id: "turn" } } });
    notify("turn/started", { threadId: "thread", turn: { id: "turn", status: "inProgress" } });
    if (mode === "crash") { process.exit(1); return; }
    if (mode === "hold") return;
    if (mode === "turn-usage") {
      const path = process.env.NORA_CODEX_FIXTURE_ROLLOUT_PATH;
      const lines = fs.readFileSync(path, "utf8").trim().split("\n").filter(Boolean);
      const before = lines.length ? JSON.parse(lines.at(-1)).payload.info.total_token_usage : { input_tokens: 0, output_tokens: 0, cached_input_tokens: 0, cache_write_input_tokens: 0 };
      notify("thread/tokenUsage/updated", { threadId: "thread", turnId: "stale-turn", tokenUsage: {
        total: { inputTokens: 999999, outputTokens: 999999 }, modelContextWindow: 200000 } });
      for (const [input, output, cached, written] of [[100, 10, 60, 20], [300, 30, 160, 70]]) {
        const total = { input_tokens: before.input_tokens + input, output_tokens: before.output_tokens + output,
          cached_input_tokens: before.cached_input_tokens + cached, cache_write_input_tokens: before.cache_write_input_tokens + written };
        const usage = { inputTokens: total.input_tokens, outputTokens: total.output_tokens, cachedInputTokens: total.cached_input_tokens, cacheWriteInputTokens: total.cache_write_input_tokens };
        const last = { inputTokens: input === 100 ? 100 : 200, outputTokens: input === 100 ? 10 : 20, cachedInputTokens: input === 100 ? 60 : 100, cacheWriteInputTokens: input === 100 ? 20 : 50 };
        fs.appendFileSync(path, JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: { total_token_usage: total,
          last_token_usage: { input_tokens: last.inputTokens, output_tokens: last.outputTokens, cached_input_tokens: last.cachedInputTokens, cache_write_input_tokens: last.cacheWriteInputTokens }, model_context_window: 200000 } } }) + "\n");
        notify("thread/tokenUsage/updated", { threadId: "thread", turnId: "turn", tokenUsage: { total: usage, last, modelContextWindow: 200000 } });
      }
      finish(); return;
    }
    if (mode === "context-cache") {
      for (const cachedInputTokens of [500, 800]) {
        const usage = { inputTokens: 1000, outputTokens: 50, cachedInputTokens, cacheWriteInputTokens: 1000 - cachedInputTokens };
        notify("thread/tokenUsage/updated", { threadId: "thread", tokenUsage: { total: usage, last: usage, modelContextWindow: 200000 } });
      }
      finish(); return;
    }
    if (mode === "tools") {
      const item = (method, value) => notify(method, { ...route, item: value });
      item("item/started", { id: "mcp", type: "mcpToolCall", server: "docs", tool: "search", arguments: { query: "test", token: "private" }, status: "inProgress" });
      notify("item/mcpToolCall/progress", { ...route, itemId: "mcp", message: "Searching documents" });
      item("item/completed", { id: "mcp", type: "mcpToolCall", server: "docs", tool: "search", status: "completed", result: { content: [{ type: "text", text: "Found documentation" }] } });
      // Late progress must not revive a finished tool.
      notify("item/mcpToolCall/progress", { ...route, itemId: "mcp", message: "Late progress" });
      item("item/started", { id: "command", type: "commandExecution", command: "npm test", cwd: "/workspace", status: "inProgress" });
      notify("item/commandExecution/outputDelta", { ...route, itemId: "command", delta: "Test failure" });
      item("item/completed", { id: "command", type: "commandExecution", command: "npm test", cwd: "/workspace", status: "failed", exitCode: 1 });
      item("item/started", { id: "patch", type: "fileChange", changes: [{ path: "src/index.ts" }], status: "inProgress" });
      item("item/completed", { id: "patch", type: "fileChange", changes: [{ path: "src/index.ts", diff: "@@ -1 +1,2 @@\n-old\n+new\n+added\n" }], status: "declined" });
      item("item/started", { id: "unknown", type: "futureTool", payload: "private", status: "inProgress" });
      finish(); return;
    }
    if (mode === "scoped-approval") {
      notify("item/started", { ...route, item: { id: "command", type: "commandExecution", command: "npm test", cwd: "/workspace", status: "inProgress" } });
      send({ id: 99, method: "item/commandExecution/requestApproval", params: { ...route, itemId: "command", reason: "Run the test suite", availableDecisions: ["accept", { acceptWithExecpolicyAmendment: { execpolicy_amendment: ["npm", "test"] } }, "decline"] } });
      return;
    }
    if (mode === "usage") notify("account/rateLimits/updated", { rateLimits: { primary: { usedPercent: 100, resetsAt: 1792587600 }, secondary: { usedPercent: 20, resetsAt: null } } });
    if (mode === "auth" || mode === "usage") {
      notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "failed", error: { codexErrorInfo: mode === "auth" ? "unauthorized" : "usageLimitExceeded" } } });
      return;
    }
    notify("item/agentMessage/delta", { ...route, itemId: "message", delta: "Hello " });
    notify("item/agentMessage/delta", { ...route, itemId: "message", delta: "world" });
    notify("item/completed", { ...route, item: { id: "message", type: "agentMessage", text: "Hello world" } });
    if (mode === "question" && !resumeCount) send({ id: 99, method: "item/tool/requestUserInput", params: { ...route, itemId: "q", questions: [{ id: "pick", question: "Pick one", isOther: true, options: [{ label: "A" }, { label: "B" }] }] } });
    else if (["approval", "crash-known"].includes(mode) && !resumeCount) send({ id: 99, method: "item/commandExecution/requestApproval", params: { ...route, itemId: "command", command: "npm test", availableDecisions: ["accept", "decline"] } });
    else finish();
  } else if (message.method === "turn/interrupt") {
    send({ id: message.id, result: {} });
    notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "interrupted", error: null } });
  } else if (message.method === "thread/read") {
    send({ id: message.id, result: { thread: { id: "thread", turns: [{ id: "turn", status: mode === "crash-known" ? "inProgress" : "completed", items: [{ id: "message", type: "agentMessage", text: "Recovered" }], error: null }] } } });
  } else if (message.id === 99) {
    if (mode === "scoped-approval" && JSON.stringify(message.result?.decision) !== JSON.stringify({ acceptWithExecpolicyAmendment: { execpolicy_amendment: ["npm", "test"] } })) {
      notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "failed", error: null } }); return;
    }
    notify("serverRequest/resolved", { threadId: "thread", requestId: 99 });
    finish();
  } else if (message.method === "unicode") {
    const bytes = Buffer.from(`${JSON.stringify({ id: message.id, result: "👋 café" })}\n`);
    const split = bytes.indexOf(Buffer.from("👋")) + 2;
    process.stdout.write(bytes.subarray(0, split));
    setImmediate(() => process.stdout.write(bytes.subarray(split)));
  } else if (message.method === "malformed") process.stdout.write("{broken\n");
  else if (message.method === "rpcError") send({ id: message.id, error: { code: -32000, message: "secret-provider-details" } });
  else if (message.method === "echo") send({ id: message.id, result: message.params });
});
