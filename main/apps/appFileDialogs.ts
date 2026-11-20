import { readFile, writeFile } from "node:fs/promises";
import { dialog, type BrowserWindow } from "electron";
import { APP_FILE_EXTENSION } from "@shared/apps/portable";
import type { AppFileDialogs } from "@main/types/apps/apps.types";

const FILTERS = [{ name: "Nora app", extensions: ["json"] }];

/** The save and open dialogs an app goes through on its way to and from a file, parented to the main window when there is one. */
export function createAppFileDialogs(getMainWindow: () => BrowserWindow | null): AppFileDialogs {
  const parent = () => getMainWindow() ?? undefined;
  return {
    async save(fileName, text) {
      const window = parent();
      const result = await (window ? dialog.showSaveDialog(window, { title: "Export app", defaultPath: fileName, filters: FILTERS }) : dialog.showSaveDialog({ title: "Export app", defaultPath: fileName, filters: FILTERS }));
      if (result.canceled || !result.filePath) return null;
      const path = result.filePath.endsWith(".json") ? result.filePath : `${result.filePath}.${APP_FILE_EXTENSION}`;
      await writeFile(path, text, "utf8");
      return path;
    },
    async open() {
      const window = parent();
      const options = { title: "Import app", filters: FILTERS, properties: ["openFile" as const] };
      const result = await (window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options));
      const path = result.filePaths[0];
      if (result.canceled || !path) return null;
      return { path, text: await readFile(path, "utf8") };
    }
  };
}
