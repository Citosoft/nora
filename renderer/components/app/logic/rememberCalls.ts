import { z } from "zod";
import { isNoraToolCall } from "@shared/nora-tools/toolCalls";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { RememberCall } from "@/components/app/types/nativeActivity.types";

const argumentsSchema = z.object({ text: z.string(), scope: z.enum(["bot", "workspace"]).optional(), memory_id: z.string().optional() });

/** The note from the call's arguments; runtimes truncate long inputs, so the note text is optional and `memory_id` falls back to a pattern. */
function readArguments(input: string | undefined): Omit<RememberCall, "tool"> {
  if (input) {
    try {
      const parsed = argumentsSchema.safeParse(JSON.parse(input));
      if (parsed.success) return { text: parsed.data.text.trim() || null, updated: !!parsed.data.memory_id, workspace: !parsed.data.memory_id && parsed.data.scope === "workspace" };
    } catch { /* truncated or not JSON */ }
  }
  return { text: null, updated: !!input && /"memory_id"\s*:\s*"[^"]+"/.test(input), workspace: !!input && /"scope"\s*:\s*"workspace"/.test(input) };
}

/** How long after a note is saved its memory line still plays the reveal when it first appears. */
const FRESH_MS = 15_000;

/** Whether the call was made moments ago, so a line seen for the first time is a live save rather than history being reopened. */
export function rememberCallIsFresh(call: RememberCall, now: number): boolean {
  const created = Date.parse(call.tool.createdAt);
  return Number.isFinite(created) && now - created < FRESH_MS;
}

/** A `remember` call shaped for its memory line while it saves or once it saved; failed, declined or interrupted calls stay in the turn's tool activity. */
export function rememberCall(tool: ToolActivity): RememberCall | null {
  if ((tool.state !== "running" && tool.state !== "completed") || !isNoraToolCall("remember", tool.label, tool.details?.detail)) return null;
  return { tool, ...readArguments(tool.details?.input) };
}
