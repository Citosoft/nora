import { z } from "zod";
import { readJsonFile } from "@main/app-import/fileSystem";
import { appImportKey } from "@main/app-import/importKey";
import type { AppImportEnvironment, AppImportSourceKeybinding } from "@main/types/app-import/appImportSource.types";
import type { OrcaKeybindings } from "@main/types/app-import/orca.types";
import { orcaKeybindingsFile } from "./paths";

/** `{ actionId: chord | chord[] | null | false }`; null/false unbinds (orca keybinding-file-parser.ts). */
const sectionSchema = z.record(z.string(), z.union([z.string(), z.array(z.string()), z.null(), z.literal(false)]).optional().catch(undefined));
const fileSchema = z.object({ keybindings: sectionSchema.optional().catch(undefined), platforms: z.record(z.string(), sectionSchema.catch({})).optional().catch(undefined) });

function sectionBindings(section: z.infer<typeof sectionSchema>, scope: string): AppImportSourceKeybinding[] {
  return Object.entries(section).flatMap(([command, value]): AppImportSourceKeybinding[] => {
    if (value === undefined) return [];
    if (value === null || value === false) return [{ importKey: appImportKey("orca", "keybinding", scope, command, ""), sourceCommand: command, chord: null }];
    const chords = (Array.isArray(value) ? value : [value]).map((chord) => chord.trim()).filter(Boolean);
    return chords.map((chord) => ({ importKey: appImportKey("orca", "keybinding", scope, command, chord), sourceCommand: command, chord }));
  });
}

/** Common overrides plus this platform's section, which Orca layers on top. */
export async function readOrcaKeybindings(env: AppImportEnvironment): Promise<OrcaKeybindings> {
  const file = await readJsonFile(orcaKeybindingsFile(env));
  if (file.status === "missing") return { keybindings: [], warnings: [] };
  const parsed = file.status === "ok" ? fileSchema.safeParse(file.value) : null;
  if (!parsed?.success) return { keybindings: [], warnings: ["Orca keybindings.json could not be read; keybindings were not imported."] };
  const platform = parsed.data.platforms?.[env.platform];
  return { keybindings: [...sectionBindings(parsed.data.keybindings ?? {}, "common"), ...sectionBindings(platform ?? {}, env.platform)], warnings: [] };
}
