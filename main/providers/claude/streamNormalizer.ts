import { usageResetTimestamp } from "@shared/conversations/usageReset";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeFrame, ClaudeRequestUsage } from "@main/types/execution/claude.types";
import { claudeCompactedReading, claudeContextReading, claudeContextWindow } from "./contextUsage";
import { ClaudeToolActivity } from "./toolActivity";
import { ClaudeSubagentActivity } from "./subagentActivity";
import { promptSuggestionSchema } from "@shared/conversations/contracts";
import { claudeTokenUsage } from "./tokenUsage";
import { claudeCacheExpiry } from "./cacheExpiry";

/** Reconcile final SDK blocks into the same message identities as streamed chunks. */
export class ClaudeStreamNormalizer {
  constructor(private readonly requestStartedAt = Date.now()) {}
  private readonly messageIds = new Map<string, string>();
  private readonly blocks = new Map<string, Map<number, { kind: "text" | "reasoning"; text: string }>>();
  private readonly indices = new Map<string, number>();
  private lastMessageId: string | null = null;
  private failure: "authentication" | "usage-limit" | "provider" = "provider";
  private resetsAt: string | undefined;
  private readonly agents = new ClaudeSubagentActivity();
  private readonly tools = new ClaudeToolActivity(this.agents);
  private lastRequest: { usage: ClaudeRequestUsage; model: string } | null = null;
  private compaction: { postTokens: number | undefined } | null = null;

  accept(message: SDKMessage, autoCompactThreshold?: number): ClaudeFrame[] {
    if (message.type === "prompt_suggestion") {
      const suggestion = promptSuggestionSchema.safeParse(message.suggestion);
      return suggestion.success ? [{ kind: "prompt-suggestion", eventId: message.uuid, suggestion: suggestion.data }] : [];
    }
    if (message.type === "rate_limit_event") {
      if (message.rate_limit_info.status === "rejected") {
        this.failure = "usage-limit";
        this.resetsAt = usageResetTimestamp(message.rate_limit_info.resetsAt);
      } else {
        this.resetsAt = undefined;
      }
      return [];
    }
    // Agents register first so the tool tracker can leave their calls, results and task events to them.
    const agentFrames = this.agents.accept(message);
    return [...agentFrames, ...this.tools.accept(message), ...this.acceptText(message, autoCompactThreshold)];
  }

  private acceptText(message: SDKMessage, autoCompactThreshold?: number): ClaudeFrame[] {
    if (message.type === "system" && message.subtype === "init") return [{ kind: "init", sessionId: message.session_id, eventId: message.uuid }];
    if (message.type === "system" && message.subtype === "compact_boundary") {
      this.compaction = { postTokens: message.compact_metadata.post_tokens };
      this.lastRequest = null;
      return [];
    }
    if (message.type === "stream_event") {
      const key = message.parent_tool_use_id ?? "root";
      const event = message.event;
      if (event.type === "message_start") {
        this.messageIds.set(key, event.message.id);
        this.blocks.set(event.message.id, new Map());
      }
      const id = this.messageIds.get(key);
      if (!id || message.parent_tool_use_id) return [];
      if (event.type === "message_stop") {
        return (["text", "reasoning"] as const).flatMap((kind): ClaudeFrame[] => {
          const text = this.text(id, kind);
          return text ? [{ kind, nativeId: id, eventId: `${message.uuid}:${kind}`, text, complete: true }] : [];
        });
      }
      if (event.type === "content_block_start") {
        this.indices.set(id, event.index);
        if (event.content_block.type === "text" || event.content_block.type === "thinking") {
          this.blocks.get(id)?.set(event.index, { kind: event.content_block.type === "text" ? "text" : "reasoning",
            text: event.content_block.type === "text" ? event.content_block.text : event.content_block.thinking });
        }
      }
      if (event.type === "content_block_delta") {
        const block = this.blocks.get(id)?.get(event.index);
        if (block && (event.delta.type === "text_delta" || event.delta.type === "thinking_delta")) {
          block.text += event.delta.type === "text_delta" ? event.delta.text : event.delta.thinking;
          if (block.kind === "text") this.lastMessageId = id;
          return [{ kind: block.kind, nativeId: id, eventId: message.uuid, text: this.text(id, block.kind), complete: false }];
        }
      }
      return [];
    }
    if (message.type === "assistant" && !message.parent_tool_use_id) {
      if (message.error === "authentication_failed" || message.error === "cloud_credential_error") this.failure = "authentication";
      else if (message.error === "rate_limit" || message.error === "billing_error") this.failure = "usage-limit";
      const id = message.message.id;
      this.lastRequest = { usage: message.message.usage, model: message.message.model };
      const frames: ClaudeFrame[] = [];
      for (const [blockIndex, block] of message.message.content.entries()) {
        if (block.type === "text" || block.type === "thinking") {
          const kind = block.type === "text" ? "text" : "reasoning";
          const blocks = this.blocks.get(id) ?? new Map();
          const index = message.message.content.length > 1 ? blockIndex : this.indices.get(id) ?? blocks.size;
          blocks.set(index, { kind, text: block.type === "text" ? block.text : block.thinking }); this.blocks.set(id, blocks);
          if (kind === "text") this.lastMessageId = id;
          frames.push({ kind, nativeId: id, eventId: `${message.uuid}:${kind}:${index}`, text: this.text(id, kind),
            complete: message.message.stop_reason !== null && !message.aborted });
        }
      }
      return frames;
    }
    if (message.type === "result") {
      const interrupted = message.terminal_reason === "aborted_streaming" || message.terminal_reason === "aborted_tools";
      const success = message.subtype === "success" && !message.is_error;
      const frames: ClaudeFrame[] = [];
      const settled = interrupted ? "interrupted" : success ? "unconfirmed" : "failed";
      frames.push(...this.agents.finish(settled, message.uuid), ...this.tools.finish(settled, message.uuid));
      if (message.subtype === "success" && !message.is_error && message.result) {
        frames.push({ kind: "text", nativeId: this.lastMessageId ?? message.uuid, eventId: `${message.uuid}:final`, text: message.result, complete: true });
      }
      const context = this.context(message.modelUsage);
      // The SDK timestamp is the turn's send time, before its model requests, so the estimate never
      // gains the time spent generating a long reply. Startup time is a conservative fallback.
      const requestSentAt = message.subtype === "success" ? message.request_sent_wall_ms : undefined;
      const sentAt = requestSentAt !== undefined && Number.isFinite(requestSentAt)
        && requestSentAt >= this.requestStartedAt && requestSentAt <= Date.now() ? requestSentAt : this.requestStartedAt;
      const expiry = this.lastRequest ? claudeCacheExpiry(this.lastRequest.usage, sentAt) : undefined;
      if (context && expiry) context.promptCacheExpiresAt = expiry;
      if (context && autoCompactThreshold && Number.isSafeInteger(autoCompactThreshold) && autoCompactThreshold > 0) context.autoCompactThreshold = autoCompactThreshold;
      if (context !== undefined) frames.push({ kind: "context", eventId: `${message.uuid}:context`, context });
      frames.push({ kind: "finished", eventId: message.uuid, status: interrupted ? "interrupted" : success ? "completed" : "failed",
        failure: success || interrupted ? null : { code: this.failure, message: this.failure === "authentication" ? "Sign in to the configured Claude account"
          : this.failure === "usage-limit" ? "Claude usage limit reached" : "Claude could not complete this turn", retryable: true, ...(this.failure === "usage-limit" && this.resetsAt ? { resetsAt: this.resetsAt } : {}) },
        usage: claudeTokenUsage(message.usage) });
      return frames;
    }
    return [];
  }
  /** The latest request's occupancy, the compacted total, or undefined when this turn measured nothing. */
  private context(modelUsage: Parameters<typeof claudeContextWindow>[0]) {
    const windowTokens = claudeContextWindow(modelUsage, this.lastRequest?.model ?? null);
    if (this.lastRequest && windowTokens) return claudeContextReading(this.lastRequest.usage, windowTokens);
    if (this.compaction) return claudeCompactedReading(this.compaction.postTokens, windowTokens);
    return undefined;
  }
  private text(id: string, kind: "text" | "reasoning"): string {
    return [...(this.blocks.get(id)?.entries() ?? [])].sort(([a], [b]) => a - b).flatMap(([, block]) => block.kind === kind ? [block.text] : []).join("");
  }
}
