import type { RemoteBot } from "@shared/types/remote-access/runtimeApi.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { affectsSummaries } from "@/state/eventRelevance";
import { useSessionResource } from "./useSessionResource";

/** The bots that can be chatted with on this computer; refreshed when conversations change so a new chat shows up at once. */
export function useBots(session: RuntimeSession | null) {
  return useSessionResource<RemoteBot[]>(session, (client) => client.bots(), { key: "bots", isAffectedBy: affectsSummaries });
}
