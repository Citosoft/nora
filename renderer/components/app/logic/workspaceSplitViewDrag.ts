import type { WorkspaceSplitViewItemReference } from "@shared/appTypes";

export const NORA_WORKSPACE_SPLIT_VIEW_ITEM_MIME = "application/x-nora-workspace-split-view-item";

type WorkspaceSplitViewDragPayload = {
  projectId: string;
  item: WorkspaceSplitViewItemReference;
};

export function setWorkspaceSplitViewItemDragData(
  dataTransfer: DataTransfer,
  payload: WorkspaceSplitViewDragPayload
): void {
  dataTransfer.setData("text/plain", buildWorkspaceSplitViewDragLabel(payload.item));
  dataTransfer.setData(NORA_WORKSPACE_SPLIT_VIEW_ITEM_MIME, JSON.stringify(payload));
  dataTransfer.effectAllowed = "copy";
}

export function readWorkspaceSplitViewItemFromDataTransfer(
  dataTransfer: DataTransfer
): WorkspaceSplitViewDragPayload | null {
  const raw = dataTransfer.getData(NORA_WORKSPACE_SPLIT_VIEW_ITEM_MIME).trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSplitViewDragPayload>;
    if (!parsed || typeof parsed.projectId !== "string" || !parsed.item || typeof parsed.item !== "object") {
      return null;
    }
    const item = parsed.item as Partial<WorkspaceSplitViewItemReference>;
    if (item.kind === "agent" && typeof item.agentId === "string" && typeof item.sessionId === "string") {
      return { projectId: parsed.projectId, item: { kind: "agent", agentId: item.agentId, sessionId: item.sessionId } };
    }
    if (item.kind === "terminal" && typeof item.terminalId === "string" && typeof item.sessionId === "string") {
      return {
        projectId: parsed.projectId,
        item: { kind: "terminal", terminalId: item.terminalId, sessionId: item.sessionId }
      };
    }
    if (item.kind === "browser" && typeof item.tabId === "string") {
      return { projectId: parsed.projectId, item: { kind: "browser", tabId: item.tabId } };
    }
    if (item.kind === "file" && typeof item.path === "string") {
      return { projectId: parsed.projectId, item: { kind: "file", path: item.path } };
    }
  } catch {
    return null;
  }

  return null;
}

export function dataTransferDeclaresWorkspaceSplitViewItem(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(NORA_WORKSPACE_SPLIT_VIEW_ITEM_MIME);
}

function buildWorkspaceSplitViewDragLabel(item: WorkspaceSplitViewItemReference): string {
  switch (item.kind) {
    case "agent":
      return `Agent ${item.agentId}`;
    case "terminal":
      return `Terminal ${item.terminalId}`;
    case "browser":
      return `Browser ${item.tabId}`;
    case "file":
      return item.path;
  }
}
