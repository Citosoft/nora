import { BrowserWindow } from "electron";
import { join } from "node:path";
import { z } from "zod";
import { ACCOUNT_ORIGIN } from "./assets";
import { migrateStorage } from "./migrateStorage";

const entriesSchema = z.array(z.tuple([z.string(), z.string()]));

/** A temporary, invisible window without a preload copies existing local preferences. */
export async function restoreStorage(rendererDirectory: string): Promise<void> {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const current = `${ACCOUNT_ORIGIN}/storage-migration`;
  const read = async () => {
    const input: unknown = await window.webContents.executeJavaScript("Object.entries(localStorage)");
    return entriesSchema.parse(input);
  };
  try {
    await migrateStorage({
      async readCurrent() { await window.loadURL(current); return read(); },
      async readLegacy() {
        await window.loadFile(join(rendererDirectory, "index.html"), { query: { "nora-storage-migration": "1" } });
        return read();
      },
      async writeCurrent(entries) {
        await window.loadURL(current);
        // JSON is inserted as a JavaScript literal, never as HTML or shell text.
        await window.webContents.executeJavaScript(`for (const [key, value] of ${JSON.stringify(entries)}) localStorage.setItem(key, value);`);
      }
    });
  } finally { window.destroy(); }
}
