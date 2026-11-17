import type { ConversationCommand } from "@shared/types/conversation/contracts.types";
import type { HostDependencies } from "@main/types/execution/host.types";
import type { PreparedProviderTransition } from "@main/types/execution/providerTransition.types";
import type { HandoffEntry } from "@main/types/contextHandoff.types";
import { sameProviderBinding, providerBindingProblem } from "@shared/conversations/providerBinding";
import { buildContextHandoff } from "@main/helpers/contextHandoff";
import { referenceEntry } from "../thread-references/entries";
import { ExecutionCommandError } from "../errors";
import { assertTransitionIdle } from "./admission";

export async function prepareProviderTransition(command: Extract<ConversationCommand, { kind: "submit" }>, deps: HostDependencies): Promise<PreparedProviderTransition | undefined> {
  const change = command.providerChange;
  if (!change) return undefined;
  if (command.action || command.compactionDeadline) throw new ExecutionCommandError("invalid", "Compaction cannot change providers");
  assertTransitionIdle(deps.store, command.conversationId);
  const snapshot = deps.store.snapshot(command.conversationId);
  if (!snapshot || !sameProviderBinding(snapshot.conversation.provider, change.expected)) throw new ExecutionCommandError("conflict", "The chat's provider changed. Reload before choosing another provider.");
  if (sameProviderBinding(change.expected, change.next)) throw new ExecutionCommandError("invalid", "Choose a different provider or model setting");
  const provider = deps.providers.resolve(change.next.kind, change.next.instanceId);
  const result = await provider.catalog(snapshot.conversation.workspace);
  if (result.status !== "available") throw new ExecutionCommandError("unavailable", result.failure.message);
  const problem = providerBindingProblem(change.next, result.catalog);
  if (problem) throw new ExecutionCommandError("invalid", problem);
  if (!deps.writeThreadReference) throw new ExecutionCommandError("unavailable", "Provider handoffs are unavailable on this execution host");
  const reference = await deps.writeThreadReference(snapshot, deps.now());
  const entries = snapshot.items.flatMap((item): HandoffEntry[] => {
    if (!["message", "plan", "changes", "milestone"].includes(item.kind)) return [];
    const entry = referenceEntry(item);
    return entry ? [{ title: entry.title, content: entry.text, kind: item.kind === "message" && item.role === "user" ? "user-prompt" : "agent-output" }] : [];
  });
  return { cursor: snapshot.cursor, handoff: { previousProvider: snapshot.conversation.provider,
    previousNativeConversationId: snapshot.conversation.nativeConversationId, reference, context: buildContextHandoff(entries, reference.indexPath) } };
}
