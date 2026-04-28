import type { WorkspaceTaskDragPayload } from "@/components/app/types/workspaceTaskDrag.types";

export const NORA_WORKSPACE_TASK_MIME = "application/x-nora-workspace-task";

function parseWorkspaceTaskDragPayload(value: string): WorkspaceTaskDragPayload | null {
  if (!value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<WorkspaceTaskDragPayload>;
    if (
      typeof parsed.projectRootPath !== "string" ||
      typeof parsed.taskPath !== "string" ||
      typeof parsed.taskTitle !== "string"
    ) {
      return null;
    }

    const projectRootPath = parsed.projectRootPath.trim();
    const taskPath = parsed.taskPath.trim();
    const taskTitle = parsed.taskTitle.trim();
    if (!projectRootPath || !taskPath || !taskTitle) {
      return null;
    }

    return {
      projectRootPath,
      taskPath,
      taskTitle
    };
  } catch {
    return null;
  }
}

export function setWorkspaceTaskDragData(dataTransfer: DataTransfer, payload: WorkspaceTaskDragPayload): void {
  const data = JSON.stringify(payload);
  dataTransfer.setData("text/plain", payload.taskTitle);
  dataTransfer.setData(NORA_WORKSPACE_TASK_MIME, data);
  dataTransfer.effectAllowed = "copy";
}

export function readWorkspaceTaskFromDataTransfer(dataTransfer: DataTransfer): WorkspaceTaskDragPayload | null {
  const fromMime = parseWorkspaceTaskDragPayload(dataTransfer.getData(NORA_WORKSPACE_TASK_MIME));
  if (fromMime) {
    return fromMime;
  }
  return null;
}

/**
 * Use during `dragover` / `dragenter` only. `getData()` is unavailable until `drop`
 * in Chromium/Electron, so we must rely on `types` to allow the drop (copy cursor).
 */
export function dataTransferDeclaresTaskDrop(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(NORA_WORKSPACE_TASK_MIME);
}
