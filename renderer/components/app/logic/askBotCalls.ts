import { z } from "zod";
import { askBotReplyText, askBotThreadId, isAskBotCall } from "@shared/nora-tools/askBot";
import type { ToolActivity } from "@shared/types/conversation/contracts.types";
import type { AskBotCall } from "@/components/app/types/nativeActivity.types";

const argumentsSchema = z.object({ bot: z.string().min(1), message: z.string() });

/** The bot and message from the call's arguments; long inputs are truncated by runtimes, so the bot name falls back to a pattern. */
function readArguments(input: string | undefined): { bot: string; message: string | null } | null {
  if (!input) return null;
  try {
    const parsed = argumentsSchema.safeParse(JSON.parse(input));
    if (parsed.success) return parsed.data;
  } catch { /* truncated or not JSON */ }
  const bot = /"bot"\s*:\s*"([^"]+)"/.exec(input)?.[1];
  return bot ? { bot, message: null } : null;
}

/** An `ask_bot` call shaped for its card, or null for any other tool. */
export function askBotCall(tool: ToolActivity): AskBotCall | null {
  if (!isAskBotCall(tool.label, tool.details?.detail)) return null;
  const args = readArguments(tool.details?.input);
  if (!args) return null;
  const reply = tool.state === "completed" ? askBotReplyText(tool.output) : null;
  return { tool, bot: args.bot, message: args.message, threadId: askBotThreadId(tool.output), reply,
    error: tool.state === "failed" || (tool.state === "completed" && reply === null && !!tool.output) ? tool.output || null : null };
}
