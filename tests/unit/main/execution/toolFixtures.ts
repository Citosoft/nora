import { randomUUID } from "node:crypto";
import type { SDKAssistantMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

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
