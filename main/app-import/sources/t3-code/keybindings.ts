import path from "node:path";
import { z } from "zod";
import { readJsonFile } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import type { AppImportSourceKeybinding } from "@main/types/app-import/appImportSource.types";
import type { T3CodeKeybindings } from "@main/types/app-import/t3Code.types";

const keybindingSchema = z.object({ key: z.string().trim().min(1), command: z.string().trim().min(1), when: z.string().trim().min(1).optional().catch(undefined) });

/** `keybindings.json` is an array of `{ key, command, when? }`; malformed entries are skipped individually. */
export async function readT3CodeKeybindings(stateDir: string): Promise<T3CodeKeybindings> {
  const file = await readJsonFile(path.join(stateDir, "keybindings.json"));
  if (file.status === "missing") return { keybindings: [], warnings: [] };
  if (file.status !== "ok" || !Array.isArray(file.value)) return { keybindings: [], warnings: ["T3 Code keybindings.json could not be read; keybindings were not imported."] };
  const keybindings: AppImportSourceKeybinding[] = [];
  for (const entry of file.value) {
    const parsed = keybindingSchema.safeParse(entry);
    if (!parsed.success) continue;
    const { key, command, when } = parsed.data;
    keybindings.push({ importKey: appImportKey("t3-code", "keybinding", command, key, when ?? ""), sourceCommand: command, chord: key, ...(when ? { when } : {}) });
  }
  return { keybindings, warnings: [] };
}
