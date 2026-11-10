const { createInterface } = require("node:readline");
const mode = process.env.NORA_CODEX_FIXTURE_MODE || "approval";
const send = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const notify = (method, params) => send({ method, params });
const route = { threadId: "thread", turnId: "turn" };
const finish = () => notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "completed", error: null } });
let resumeCount = 0;
createInterface({ input: process.stdin }).on("line", (line) => {
  const message = JSON.parse(line);
  if (message.method === "initialize") send({ id: message.id, result: { userAgent: "codex/0.167.0-fixture" } });
  else if (message.method === "account/read" && mode === "readiness-error") send({ id: message.id, error: { code: -32603, message: "secret configuration details" } });
  else if (message.method === "account/read") send({ id: message.id, result: { requiresOpenaiAuth: true,
    account: mode === "signed-out" ? null : { type: "chatgpt" } } });
  else if (message.method === "model/list") send({ id: message.id, result: {
    data: [{ model: message.params.cursor ? "second-model" : "first-model", displayName: "Catalog model", description: "No entitlement claim",
      hidden: false, defaultReasoningEffort: "medium", supportedReasoningEfforts: [{ reasoningEffort: "medium" }, { reasoningEffort: "ultra" }] }],
    nextCursor: message.params.cursor ? null : "page-two"
  } });
  else if (message.method === "thread/start" || message.method === "thread/resume") {
    if (process.env.NORA_CODEX_EXPECT_GUIDANCE && message.params.developerInstructions !== process.env.NORA_CODEX_EXPECT_GUIDANCE) {
      send({ id: message.id, error: { code: -32602, message: "Conversation guidance mismatch" } }); return;
    }
    if (message.method === "thread/resume") resumeCount++;
    send({ id: message.id, result: { thread: { id: "thread" } } });
  } else if (message.method === "turn/start") {
    if (message.params.effort && message.params.effort !== "ultra" && message.params.effort !== "medium") {
      send({ id: message.id, error: { code: -32602, message: "Invalid fixture effort" } }); return;
    }
    send({ id: message.id, result: { turn: { id: "turn" } } });
    notify("turn/started", { threadId: "thread", turn: { id: "turn", status: "inProgress" } });
    if (mode === "crash") { process.exit(1); return; }
    if (mode === "hold") return;
    if (mode === "auth" || mode === "usage") {
      notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "failed", error: { codexErrorInfo: mode === "auth" ? "unauthorized" : "usageLimitExceeded" } } });
      return;
    }
    notify("item/agentMessage/delta", { ...route, itemId: "message", delta: "Hello " });
    notify("item/agentMessage/delta", { ...route, itemId: "message", delta: "world" });
    notify("item/completed", { ...route, item: { id: "message", type: "agentMessage", text: "Hello world" } });
    if (mode === "question" && !resumeCount) send({ id: 99, method: "item/tool/requestUserInput", params: { ...route, itemId: "q", questions: [{ id: "pick", question: "Pick one", options: [{ label: "A" }, { label: "B" }] }] } });
    else if (["approval", "crash-known"].includes(mode) && !resumeCount) send({ id: 99, method: "item/commandExecution/requestApproval", params: { ...route, itemId: "command", command: "npm test", availableDecisions: ["accept", "decline"] } });
    else finish();
  } else if (message.method === "turn/interrupt") {
    send({ id: message.id, result: {} });
    notify("turn/completed", { threadId: "thread", turn: { id: "turn", status: "interrupted", error: null } });
  } else if (message.method === "thread/read") {
    send({ id: message.id, result: { thread: { id: "thread", turns: [{ id: "turn", status: mode === "crash-known" ? "inProgress" : "completed", items: [{ id: "message", type: "agentMessage", text: "Recovered" }], error: null }] } } });
  } else if (message.id === 99) {
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
