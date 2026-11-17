import type { ThreadWorkspaceSnapshot } from "@/components/app/types/thread-workspace/state.types";
import type { ThreadShellNavigation } from "@/components/app/types/thread-workspace/navigation.types";

/** Explicit Home requests must reveal the thread surface even when no thread was selected. */
export function resolveThreadShellNavigation(
  state: Pick<ThreadWorkspaceSnapshot, "layout" | "boot" | "focusRevision">,
  previousFocusRevision: number
): ThreadShellNavigation {
  const document = state.layout.documents.find((entry) => entry.id === state.layout.activeId);
  if (!document && state.focusRevision === previousFocusRevision) return { kind: "unchanged" };
  const workspace = document ? state.boot.workspaces.find((entry) => entry.id === document.workspaceId) : null;
  return { kind: "reveal", projectId: workspace?.shellProjectId ?? null };
}
