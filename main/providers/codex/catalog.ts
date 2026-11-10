import type { StdioRpc } from "./stdioRpc";
import type { CodexModelPage } from "@main/types/execution/codex.types";
import type { ProviderModel } from "@shared/types/provider/catalog.types";
import { modelListSchema } from "./nativeSchemas";

export async function readCodexModels(rpc: StdioRpc): Promise<ProviderModel[]> {
  const models = new Map<string, ProviderModel>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page: CodexModelPage = await rpc.request("model/list", { cursor, limit: 100, includeHidden: false }, modelListSchema);
    for (const model of page.data.filter((entry) => !entry.hidden)) models.set(model.model, { id: model.model, name: model.displayName,
      description: model.description, defaultReasoningEffort: model.defaultReasoningEffort,
      reasoningEfforts: model.supportedReasoningEfforts.map((effort) => effort.reasoningEffort) });
    cursor = page.nextCursor ?? null;
    if (cursor && cursors.has(cursor)) throw new Error("Codex catalog cursor did not advance");
    if (cursor) cursors.add(cursor);
    if (cursors.size > 100) throw new Error("Codex catalog pagination exceeded the supported limit");
  } while (cursor);
  return [...models.values()];
}
