import { getSessionMessages } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { Conversation, ContextReading } from "@shared/types/conversation/contracts.types";
import type { ClaudeContextWindowReader, ClaudeRuntimeOptions, ClaudeTranscriptApi } from "@main/types/execution/claude.types";
import { claudeContextReading } from "./contextUsage";
import { withClaudeControlSession } from "./controlSession";

const tokens = z.number().int().nonnegative();
const requestSchema = z.object({ model: z.string().min(1), usage: z.object({ input_tokens: tokens, output_tokens: tokens,
  cache_creation_input_tokens: tokens.nullable().optional(), cache_read_input_tokens: tokens.nullable().optional() }) });

/** The window is per model, so one control session answers for every thread that used it. */
export function createClaudeContextWindowReader(runtime: ClaudeRuntimeOptions): ClaudeContextWindowReader {
  const windows = new Map<string, Promise<number | null>>();
  return (model, cwd) => {
    let window = windows.get(model);
    if (!window) {
      window = withClaudeControlSession(runtime, cwd, async (session) => {
        const usage = await session.getContextUsage({ detail: "summary" });
        return usage.rawMaxTokens > 0 ? usage.rawMaxTokens : null;
      }, model);
      window.catch(() => { windows.delete(model); });
      windows.set(model, window);
    }
    return window;
  };
}

/**
 * Reads the latest main-loop request from the saved transcript. A resumed control session cannot report this
 * itself: it only loads history when a prompt is sent.
 */
export function createClaudeContextReader(readWindow: ClaudeContextWindowReader, api: ClaudeTranscriptApi = { getSessionMessages }) {
  return async (conversation: Conversation): Promise<ContextReading | null> => {
    if (!conversation.nativeConversationId) return null;
    const cwd = conversation.workspace.path;
    const messages = await api.getSessionMessages(conversation.nativeConversationId, { dir: cwd });
    for (let index = messages.length - 1; index >= 0; index--) {
      const entry = messages[index];
      if (entry?.type !== "assistant" || entry.parent_tool_use_id !== null || entry.parent_agent_id !== null) continue;
      const request = requestSchema.safeParse(entry.message);
      if (!request.success) continue;
      const window = await readWindow(request.data.model, cwd);
      return window ? claudeContextReading(request.data.usage, window) : null;
    }
    return null;
  };
}
