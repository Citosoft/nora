import type { AppImportDetectedSourceId } from "@shared/types/app-import/appImportSource.types";
import type { AppImportReadResult } from "@shared/types/app-import/appImportPlan.types";
import type { AppImportReadContext, AppImportSource } from "@main/types/app-import/appImportSource.types";
import { claudeSource, codexSource } from "./sources/agent-history/providers";
import { openBotSource } from "./sources/openbot/source";
import { orcaSource } from "./sources/orca/source";
import { t3CodeSource } from "./sources/t3-code/source";

const SOURCES: Readonly<Record<AppImportDetectedSourceId, AppImportSource>> = { claude: claudeSource, codex: codexSource, "t3-code": t3CodeSource, orca: orcaSource, openbot: openBotSource };

export const appImportSources: readonly AppImportSource[] = Object.values(SOURCES);

export function getAppImportSource(id: AppImportDetectedSourceId): AppImportSource {
  return SOURCES[id];
}

export async function readAppImportPlan(id: AppImportDetectedSourceId, context: AppImportReadContext): Promise<AppImportReadResult> {
  return await getAppImportSource(id).readPlan(context);
}
