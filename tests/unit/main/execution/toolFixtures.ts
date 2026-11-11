import { randomUUID } from "node:crypto";
import type { SDKAssistantMessage, SDKResultSuccess, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

export function claudeMessage(content: SDKAssistantMessage["message"]["content"]): SDKAssistantMessage["message"] {
  return { id: "native-message", type: "message", role: "assistant", model: "fixture", content,
    stop_reason: null, stop_sequence: null, stop_details: null, container: null, context_management: null, diagnostics: null,
    usage: { input_tokens: 1, output_tokens: 1, cache_creation: null, cache_creation_input_tokens: null,
      cache_read_input_tokens: null, fallback_credit: null, inference_geo: null, iterations: null,
      output_tokens_details: null, server_tool_use: null, service_tier: null, speed: null } };
}

export function claudeAssistantMessage(content: SDKAssistantMessage["message"]["content"], parent: string | null = null): SDKAssistantMessage {
  return { type: "assistant", message: claudeMessage(content), uuid: randomUUID(), parent_tool_use_id: parent, session_id: "session" };
}

export function claudeUserMessage(content: SDKUserMessage["message"]["content"], parent: string | null = null): SDKUserMessage {
  return { type: "user", message: { role: "user", content }, uuid: randomUUID(), parent_tool_use_id: parent, session_id: "session" };
}

export function claudeUsage(): SDKResultSuccess["usage"] {
  return { input_tokens: 0, output_tokens: 0, cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 }, cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0, fallback_credit: null, inference_geo: "", iterations: [], output_tokens_details: { thinking_tokens: 0 },
    server_tool_use: { web_fetch_requests: 0, web_search_requests: 0 }, service_tier: "standard", speed: "standard" };
}

export function claudeResult(result = ""): SDKResultSuccess {
  return { type: "result", subtype: "success", uuid: randomUUID(), session_id: "session", duration_ms: 0, duration_api_ms: 0,
    is_error: false, num_turns: 1, stop_reason: null, total_cost_usd: 0, modelUsage: {}, permission_denials: [], result, usage: claudeUsage() };
}
