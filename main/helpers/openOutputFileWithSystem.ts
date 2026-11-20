import { shell } from "electron";
import { resolveWorkspaceFileViewKind } from "@shared/workspaceFileViewKind";
import { openPathWithDefaultApp } from "./openPathWithDefaultApp";

/**
 * Images and documents open in their default app; anything else (data, media, archives) is only revealed in the
 * file manager, so an output can never launch a script or executable.
 */
export async function openOutputFileWithSystem(filePath: string): Promise<void> {
  if (resolveWorkspaceFileViewKind(filePath) === "text") { shell.showItemInFolder(filePath); return; }
  await openPathWithDefaultApp(filePath);
}
