import type { BotMemoryScope } from "@/components/app/types/botMemory.types";
import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

/** Shell project IDs and native memory workspace IDs are different identities. */
export function resolveMemoryWorkspace(workspaces: readonly NativeWorkspace[], projectId: string | null, focusedWorkspaceId: string | null): NativeWorkspace | null {
  return workspaces.find((workspace) => projectId ? workspace.shellProjectId === projectId : workspace.id === focusedWorkspaceId) ?? null;
}

export function notesForMemoryScope(notes: readonly BotMemoryEntry[], scope: BotMemoryScope): readonly BotMemoryEntry[] {
  return scope.kind === "all" ? notes : notes.filter((note) => note.workspaceId === null || note.workspaceId === scope.workspace.id);
}
