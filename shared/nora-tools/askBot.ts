import { NORA_MCP_SERVER } from "./catalog";

/** How runtimes name the call: Claude qualifies it with the server, Codex reports the bare tool name and the server separately. */
const QUALIFIED_NAME = `mcp__${NORA_MCP_SERVER}__ask_bot`;
const THREAD_MARK = /\(thread ([^\s)]+)\)/;

export function isAskBotCall(label: string, server: string | undefined): boolean {
  return label === QUALIFIED_NAME || (label === "ask_bot" && server === NORA_MCP_SERVER);
}

/** The asked bot's thread, written into every reply and error so the window can link to it. */
export function askBotThreadMark(conversationId: string): string { return `(thread ${conversationId})`; }

export function askBotThreadId(output: string): string | null { return THREAD_MARK.exec(output)?.[1] ?? null; }

export function formatAskBotReply(botName: string, conversationId: string, reply: string): string {
  return `${botName} replied ${askBotThreadMark(conversationId)}:\n\n${reply}`;
}

/** The reply text from a successful call's output, or null when it failed or has not finished. */
export function askBotReplyText(output: string): string | null {
  const match = /^[^\n]* replied \(thread [^\s)]+\):\n\n([\s\S]*)$/.exec(output);
  return match ? match[1] : null;
}
