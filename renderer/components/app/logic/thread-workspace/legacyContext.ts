import { legacyHistoryClient } from "@/components/app/clients/legacyHistoryClient";
import type { AgentContextSelection } from "@shared/appTypes";

export async function materializeLegacyContext(selections: readonly AgentContextSelection[]): Promise<string> {
  const sources = await Promise.all(selections.map(async (selection) => {
    const source = await legacyHistoryClient.getAgentContextState(selection.sourceAgentId);
    const selected = new Set(selection.entryIds);
    const entries = source.entries.filter((entry) => selected.has(entry.id));
    if (entries.length !== selected.size) throw new Error("Some selected history is unavailable. Review the selection before starting a thread.");
    return entries.map((entry) => `Archived context: ${entry.title}\n${entry.content}`).join("\n\n");
  }));
  return sources.filter(Boolean).join("\n\n");
}
