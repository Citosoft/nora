import type { Conversation } from "@shared/types/conversation/contracts.types";

/** A bot retains its workers across task threads; Nora's workers belong to the specific thread that started them. */
export function ownsWorker(worker: Conversation, caller: Conversation, owner: Conversation | null): boolean {
  if (worker.source?.kind !== "worker" || worker.workspace.environmentId !== caller.workspace.environmentId) return false;
  return worker.parentId === caller.id || (!!caller.bot && owner?.bot?.botId === caller.bot.botId);
}
