export const NORA_WORKSPACE_RELATIVE_PATH_MIME = "application/x-nora-workspace-relative-path";

export function formatWorkspacePathReference(relativePath: string, kind: "file" | "directory"): string {
  const trimmed = relativePath.trim();
  if (kind === "directory" && trimmed.length > 0 && !trimmed.endsWith("/")) {
    return `${trimmed}/`;
  }
  return trimmed;
}

export function setWorkspaceRelativePathDragData(
  dataTransfer: DataTransfer,
  relativePath: string,
  kind: "file" | "directory"
): void {
  const reference = formatWorkspacePathReference(relativePath, kind);
  dataTransfer.setData("text/plain", reference);
  dataTransfer.setData(NORA_WORKSPACE_RELATIVE_PATH_MIME, reference);
  dataTransfer.effectAllowed = "copy";
}

export function readWorkspaceRelativePathFromDataTransfer(dataTransfer: DataTransfer): string | null {
  const fromMime = dataTransfer.getData(NORA_WORKSPACE_RELATIVE_PATH_MIME).trim();
  if (fromMime.length > 0) {
    return fromMime;
  }
  return null;
}

/**
 * Use during `dragover` / `dragenter` only. `getData()` is unavailable until `drop`
 * in Chromium/Electron, so we must rely on `types` to allow the drop (copy cursor).
 */
export function dataTransferDeclaresPathOrFileDrop(dataTransfer: DataTransfer): boolean {
  const types = Array.from(dataTransfer.types);
  if (types.some((type) => type.toLowerCase() === "files")) {
    return true;
  }
  if (types.includes(NORA_WORKSPACE_RELATIVE_PATH_MIME)) {
    return true;
  }
  return false;
}
