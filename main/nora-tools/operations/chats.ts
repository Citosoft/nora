import type { NoraChatMessage, NoraChatOperations } from "@main/types/nora-tools/noraTools.types";
import type { NoraToolOperationOptions } from "@main/types/nora-tools/operations.types";

const MESSAGE_MAX_CHARS = 6000;
const HISTORY_PAGE = 200;
/** Bounds the walk back through a long chat; older messages than this are out of reach of one call. */
const PAGES_MAX = 10;

export function createChatOperations(options: NoraToolOperationOptions): NoraChatOperations {
  return {
    history(skip, limit, { chat }) {
      if (!chat) throw new Error("Only a bot answering in a group or direct chat can read it.");
      const newestFirst: NoraChatMessage[] = [];
      let before: number | undefined;
      let exhausted = false;
      for (let page = 0; page < PAGES_MAX && newestFirst.length < skip + limit + 1; page += 1) {
        const result = options.host.conversationHistory({ conversationId: chat.id, scope: "timeline", limit: HISTORY_PAGE, ...(before ? { before } : {}) });
        if (result.scope !== "timeline") throw new Error("The chat's history could not be read.");
        for (const item of [...result.items].reverse()) {
          if (item.kind !== "message" || !item.complete || !item.text.trim()) continue;
          newestFirst.push({ author: item.role === "user" ? "User" : item.author?.name ?? "Nora", createdAt: item.createdAt,
            text: item.text.length > MESSAGE_MAX_CHARS ? `${item.text.slice(0, MESSAGE_MAX_CHARS)}\n[…message shortened]` : item.text });
        }
        if (result.nextBefore === null) { exhausted = true; break; }
        before = result.nextBefore;
      }
      const messages = newestFirst.slice(skip, skip + limit).reverse();
      return { title: chat.title, messages, more: newestFirst.length > skip + limit || !exhausted };
    }
  };
}
