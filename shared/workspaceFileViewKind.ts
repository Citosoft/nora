import type { WorkspaceFileViewKind } from "./types/workspaceFile.types";

const IMAGE_EXTENSIONS: ReadonlySet<string> = new Set(["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"]);

/**
 * Binary document formats Nora cannot render; these open in the OS default app instead.
 * Kept to document formats only: main refuses to hand anything else (e.g. scripts or executables) to the OS.
 */
const EXTERNAL_DOCUMENT_EXTENSIONS: ReadonlySet<string> = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "pages",
  "numbers",
  "key"
]);

function getFileExtension(pathName: string): string {
  const leafName = pathName.replace(/\\/g, "/").split("/").pop() ?? "";
  const dotIndex = leafName.lastIndexOf(".");
  return dotIndex > 0 ? leafName.slice(dotIndex + 1).toLowerCase() : "";
}

export function resolveWorkspaceFileViewKind(pathName: string): WorkspaceFileViewKind {
  const extension = getFileExtension(pathName);
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (EXTERNAL_DOCUMENT_EXTENSIONS.has(extension)) {
    return "external";
  }
  return "text";
}
