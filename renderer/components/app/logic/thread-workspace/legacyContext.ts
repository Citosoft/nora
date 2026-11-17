import { legacyHistoryClient } from "@/components/app/clients/legacyHistoryClient";
import type { AgentContextSelection } from "@shared/appTypes";

export async function materializeLegacyContext(selections: readonly AgentContextSelection[]): Promise<string> {
  return legacyHistoryClient.prepareAgentContextHandoff([...selections]);
}
