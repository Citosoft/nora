import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationSummary, OutputThread } from "@shared/types/conversation/queries.types";
import type { StoreReader } from "@main/types/execution/store.types";
import { OUTPUT_ITEMS_MAX } from "@shared/conversations/gateway";

/** A generated image's prompt is kept as its description; longer inputs are cut, other tool input is dropped. */
const DESCRIPTION_MAX = 500;

/** Keeps only what output derivation reads, so a workspace-wide read stays small. */
export function trimOutputItem(item: TimelineItem): TimelineItem | null {
  if (item.kind === "tool" && item.details?.outputFiles) {
    const input = item.details.category === "image" ? item.details.input?.slice(0, DESCRIPTION_MAX) : undefined;
    return { id: item.id, runId: item.runId, createdAt: item.createdAt, kind: "tool", label: item.label, output: "", state: item.state,
      details: { category: item.details.category, outputFiles: item.details.outputFiles, ...(input ? { input } : {}) } };
  }
  if (item.kind === "review" && item.result.status === "ready" && item.result.scope === "turn") {
    return { ...item, result: { ...item.result, changes: item.result.changes.map((change) => ({ ...change, patch: null })) } };
  }
  return null;
}

/** Every thread in the project with at least one output-bearing item, most recently updated first. */
export function readWorkspaceOutputs(store: Pick<StoreReader, "summaries" | "outputItems">, projectId: string): OutputThread[] {
  const items = new Map<string, TimelineItem[]>();
  for (const { conversationId, item } of store.outputItems(projectId, OUTPUT_ITEMS_MAX)) {
    const trimmed = trimOutputItem(item);
    if (trimmed) items.set(conversationId, [...(items.get(conversationId) ?? []), trimmed]);
  }
  const thread = ({ conversation }: ConversationSummary): OutputThread[] => {
    const own = items.get(conversation.id);
    return own ? [{ conversationId: conversation.id, title: conversation.title, workspacePath: conversation.workspace.path,
      updatedAt: conversation.updatedAt, archived: !!conversation.archivedAt, items: own }] : [];
  };
  return store.summaries(projectId).flatMap(thread).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
