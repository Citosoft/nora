import type { WorkspacePathAttachmentDraft } from "@/components/app/types/agentInput.types";
import { toStoredPathForWorkspaceAttachment } from "@shared/workspaceAbsolutePath";

export function getNativeAbsolutePathFromDragFile(file: File): string | null {
  const extended = file as File & { path?: string };
  const raw = extended.path;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}

export function getFilesystemKindFromDragItem(item: DataTransferItem | undefined): "file" | "directory" {
  const entry = item?.webkitGetAsEntry?.() ?? null;
  if (entry && "isDirectory" in entry && entry.isDirectory) {
    return "directory";
  }
  return "file";
}

export function workspacePathDraftsFromNativeFileDrop(
  dataTransfer: DataTransfer,
  workspaceRoot: string | null
): WorkspacePathAttachmentDraft[] {
  const files = Array.from(dataTransfer.files);
  const items = Array.from(dataTransfer.items);
  const drafts: WorkspacePathAttachmentDraft[] = [];
  const stamp = Date.now();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const absolute = getNativeAbsolutePathFromDragFile(file);
    if (!absolute) {
      continue;
    }
    const kind = getFilesystemKindFromDragItem(items[index]);
    const path = toStoredPathForWorkspaceAttachment(absolute, kind, workspaceRoot);
    if (!path.trim()) {
      continue;
    }
    drafts.push({
      id: `${stamp}-${index}-${drafts.length}`,
      path,
      kind
    });
  }

  return drafts;
}
