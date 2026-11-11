// Minimal ACP agent over stdio (newline-delimited JSON-RPC 2.0) for adapter tests. Scenario: NORA_ACP_FIXTURE_MODE.
const { appendFileSync } = require("node:fs");

const mode = process.env.NORA_ACP_FIXTURE_MODE || "stream";
const log = process.env.NORA_ACP_FIXTURE_LOG;
let buffer = "";
let nextRequestId = 1000;
const pendingClientRequests = new Map();
let activePrompt = null;

function send(message) { process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`); }
function reply(id, result) { send({ id, result }); }
function fail(id, code, message) { send({ id, error: { code, message } }); }
function update(sessionId, value) { send({ method: "session/update", params: { sessionId, update: value } }); }
function requestClient(method, params) {
  const id = nextRequestId++;
  send({ id, method, params });
  return new Promise((resolve) => pendingClientRequests.set(id, resolve));
}
function record(method) { if (log) appendFileSync(log, `${method}\n`); }

const setup = {
  modes: { currentModeId: "ask", availableModes: [{ id: "ask", name: "Ask" }, { id: "code", name: "Code" }] },
  configOptions: [
    { id: "model", name: "Model", category: "model", type: "select", currentValue: "m1", options: [{ value: "m1", name: "Model One" }, { value: "m2", name: "Model Two" }] },
    { id: "effort", name: "Thinking", category: "thought_level", type: "select", currentValue: "low", options: [{ value: "low", name: "Low" }, { value: "high", name: "High" }] }
  ]
};

async function prompt(id, params) {
  const { sessionId } = params;
  activePrompt = { id, sessionId };
  if (mode === "hold") return; // Answered by session/cancel.
  if (mode === "crash") { update(sessionId, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "partial" } }); setTimeout(() => process.exit(1), 20); return; }
  update(sessionId, { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "Thinking" } });
  update(sessionId, { sessionUpdate: "tool_call", toolCallId: "t1", title: "List files", kind: "execute", status: "pending",
    rawInput: { command: "ls", apiToken: "secret-value" } });
  if (mode === "approval" || mode === "approval-hold") {
    const response = await requestClient("session/request_permission", { sessionId,
      toolCall: { toolCallId: "t1", title: "Run ls", kind: "execute", rawInput: { command: "ls" } },
      options: [{ optionId: "yes", name: "Allow", kind: "allow_once" }, { optionId: "always", name: "Always allow", kind: "allow_always" },
        { optionId: "no", name: "Deny", kind: "reject_once" }] });
    const outcome = response.outcome.outcome === "selected" ? response.outcome.optionId : "cancelled";
    if (outcome === "cancelled") { reply(id, { stopReason: "cancelled" }); activePrompt = null; return; }
    update(sessionId, { sessionUpdate: "tool_call_update", toolCallId: "t1", status: outcome === "no" ? "failed" : "completed" });
    update(sessionId, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: `decision:${outcome}` } });
    reply(id, { stopReason: "end_turn" }); activePrompt = null; return;
  }
  update(sessionId, { sessionUpdate: "tool_call_update", toolCallId: "t1", status: "completed", content: [{ type: "content", content: { type: "text", text: "a.txt" } }] });
  update(sessionId, { sessionUpdate: "plan", entries: [{ content: "Read", priority: "high", status: "completed" }, { content: "Write", priority: "low", status: "in_progress" }] });
  update(sessionId, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Hel" } });
  update(sessionId, { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "lo" } });
  reply(id, { stopReason: "end_turn" }); activePrompt = null;
}

function handle(message) {
  if (message.id !== undefined && message.method === undefined) {
    const resolve = pendingClientRequests.get(message.id);
    if (resolve) { pendingClientRequests.delete(message.id); resolve(message.result); }
    return;
  }
  record(message.method);
  const { id, method, params } = message;
  switch (method) {
    case "initialize":
      return reply(id, { protocolVersion: 1, agentCapabilities: { loadSession: false, sessionCapabilities: { close: {} } },
        authMethods: [{ id: "browser", name: "Sign in with browser" }], agentInfo: { name: "fixture", title: "Fixture Agent", version: "1.0.0" } });
    case "authenticate": return mode === "auth-rejected" ? fail(id, -32000, "This account type is not supported") : reply(id, {});
    case "session/new": return mode === "auth" || mode === "auth-rejected" ? fail(id, -32000, "Authentication required") : reply(id, { sessionId: "session-1", ...setup });
    case "session/close": return reply(id, {});
    case "session/set_mode": return reply(id, {});
    case "session/set_config_option": return reply(id, { configOptions: setup.configOptions });
    case "session/prompt": return void prompt(id, params);
    case "session/cancel":
      // Pending permission requests are answered as cancelled by the client; the prompt reply confirms cancellation.
      if (activePrompt && mode === "hold") { reply(activePrompt.id, { stopReason: "cancelled" }); activePrompt = null; }
      return;
    default: if (id !== undefined) fail(id, -32601, "Method not found");
  }
}

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) handle(JSON.parse(line));
  }
});
