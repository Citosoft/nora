import { isNoraToolCall } from "./toolCalls";

const THREAD_MARK = /\(thread ([^\s)]+)\)/;

export type AskBotWait = "notify" | "reply";

export function isAskBotCall(label: string, server: string | undefined): boolean {
  return isNoraToolCall("ask_bot", label, server);
}

/** The asked bot's thread, written into every reply and error so the window can link to it. */
export function askBotThreadMark(conversationId: string): string { return `(thread ${conversationId})`; }

export function askBotThreadId(output: string): string | null { return THREAD_MARK.exec(output)?.[1] ?? null; }

/** Tool result when the ask returns before the bot finishes: notify mode by default, or a wait that hit the runtime limit. */
export function formatAskBotWorking(botName: string, conversationId: string, reason: "notify" | "timeout" = "timeout"): string {
  const where = askBotThreadMark(conversationId);
  if (reason === "notify") {
    return `${botName} is working ${where}. Continue your turn; Nora will post ${botName}'s answer into this thread when it finishes.`;
  }
  return `${botName} is still working ${where}. Continue your turn with the information you have and tell the user where to follow its progress.`;
}

export function isAskBotWorking(output: string): boolean {
  return /^[^\n]* is (still )?working \(thread [^\s)]+\)\./.test(output);
}

export function formatAskBotReply(botName: string, conversationId: string, reply: string): string {
  return `${botName} replied ${askBotThreadMark(conversationId)}:\n\n${reply}`;
}

/** Instruction posted into the asking thread when a notify-mode ask finishes. */
export function formatAskBotFinishedNotice(botName: string, conversationId: string,
  outcome: { status: "completed" | "failed" | "interrupted" | "timed-out"; text: string | null; failure: string | null }): string {
  const where = askBotThreadMark(conversationId);
  if (outcome.status === "completed" && outcome.text?.trim()) {
    return `${botName} finished what you asked ${where}. Use the result below and continue.\n\n${outcome.text.trim()}`;
  }
  if (outcome.status === "failed") {
    return `${botName} could not finish what you asked ${where}${outcome.failure ? `: ${outcome.failure}` : "."}`;
  }
  if (outcome.status === "interrupted") {
    return `${botName}'s work was stopped before it finished ${where}.`;
  }
  return `${botName} is still working ${where}; check its thread if you need an update.`;
}

/** The reply text from a successful call's output, or null when it failed or has not finished. */
export function askBotReplyText(output: string): string | null {
  const match = /^[^\n]* replied \(thread [^\s)]+\):\n\n([\s\S]*)$/.exec(output);
  return match ? match[1] : null;
}
