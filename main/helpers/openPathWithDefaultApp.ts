import { shell } from "electron";
import path from "node:path";

/** Opens a local file in the OS default app, turning Electron's error string into a thrown, user-facing error. */
export async function openPathWithDefaultApp(filePath: string): Promise<void> {
  const failureReason = await shell.openPath(filePath);
  if (failureReason) {
    throw new Error(`Unable to open ${path.basename(filePath)} in the default app: ${failureReason}`);
  }
}
