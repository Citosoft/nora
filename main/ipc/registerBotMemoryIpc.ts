import { botMemoryChannel, botMemoryReplySchema, botMemoryRequestSchema } from "@shared/bots/memoryGateway";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { BotMemoryRequest } from "@shared/ipc/types/botMemoryGateway.types";
import type { BotMemoryIpcDeps } from "@main/types/bots/memoryIpc.types";

function apply(deps: BotMemoryIpcDeps, request: BotMemoryRequest): BotMemoryEntry[] {
  const owned = (id: string): void => {
    if (!deps.memory.list(request.botId, null).some((note) => note.id === id)) throw new Error("That note no longer exists.");
  };
  switch (request.kind) {
    case "list": break;
    case "add": deps.memory.add({ botId: request.botId, workspaceId: request.workspaceId, text: request.text, source: { kind: "user" } }); break;
    case "update": owned(request.id); deps.memory.update(request.id, request.text); break;
    case "remove": owned(request.id); deps.memory.remove(request.id); break;
  }
  return deps.memory.list(request.botId, null);
}

/** The window reads and edits bots' notes here; bots themselves write through Nora's tools. */
export function registerBotMemoryIpc(deps: BotMemoryIpcDeps): () => void {
  deps.ipc.handle(botMemoryChannel, async (event, input) => {
    if (!deps.isAllowedSender(event)) return { ok: false, message: "This window cannot access bot notes" };
    const parsed = botMemoryRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Notes must be between 1 and 1,000 characters" };
    try { return botMemoryReplySchema.parse({ ok: true, notes: apply(deps, parsed.data) }); }
    catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Bot notes could not be updated" }; }
  });
  return () => deps.ipc.removeHandler(botMemoryChannel);
}
