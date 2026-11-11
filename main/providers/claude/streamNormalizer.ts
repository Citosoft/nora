import { usageResetTimestamp } from "@shared/conversations/usageReset";
import type { SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { ClaudeFrame } from "@main/types/execution/claude.types";
import { ClaudeToolActivity } from "./toolActivity";

/** Reconcile final SDK blocks into the same message identities as streamed chunks. */
export class ClaudeStreamNormalizer {
  private readonly messageIds = new Map<string, string>();
  private readonly blocks = new Map<string, Map<number, { kind: "text" | "reasoning"; text: string }>>();
  private readonly indices = new Map<string, number>();
  private lastMessageId: string | null = null;
  private failure: "authentication" | "usage-limit" | "provider" = "provider";
  private resetsAt: string | undefined;
  private readonly tools = new ClaudeToolActivity();

  accept(message: SDKMessage): ClaudeFrame[] {
    if (message.type === "rate_limit_event") {
      if (message.rate_limit_info.status === "rejected") {
        this.failure = "usage-limit";
        this.resetsAt = usageResetTimestamp(message.rate_limit_info.resetsAt);
      } else {
        this.resetsAt = undefined;
      }
      return [];
    }
    const toolFrames = this.tools.accept(message);
    return [...toolFrames, ...this.acceptText(message)];
  }

  private acceptText(message: SDKMessage): ClaudeFrame[] {
    if (message.type === "system" && message.subtype === "init") return [{ kind: "init", sessionId: message.session_id, eventId: message.uuid }];
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
      frames.push(...this.tools.finish(interrupted ? "interrupted" : success ? "unconfirmed" : "failed", message.uuid));
      if (message.subtype === "success" && !message.is_error && message.result) {
        frames.push({ kind: "text", nativeId: this.lastMessageId ?? message.uuid, eventId: `${message.uuid}:final`, text: message.result, complete: true });
      }
      frames.push({ kind: "finished", eventId: message.uuid, status: interrupted ? "interrupted" : success ? "completed" : "failed",
        failure: success || interrupted ? null : { code: this.failure, message: this.failure === "authentication" ? "Sign in to the configured Claude account"
          : this.failure === "usage-limit" ? "Claude usage limit reached" : "Claude could not complete this turn", retryable: true, ...(this.failure === "usage-limit" && this.resetsAt ? { resetsAt: this.resetsAt } : {}) },
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens } });
      return frames;
    }
    return [];
  }
  private text(id: string, kind: "text" | "reasoning"): string {
    return [...(this.blocks.get(id)?.entries() ?? [])].sort(([a], [b]) => a - b).flatMap(([, block]) => block.kind === kind ? [block.text] : []).join("");
  }
}
