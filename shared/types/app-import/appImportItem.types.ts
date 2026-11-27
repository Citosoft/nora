import type { AppImportItemKind, AppImportItemSupport } from "./appImportApply.types";
import type { AppImportBot, AppImportEnvVar, AppImportKey, AppImportKeybinding, AppImportSetupScript, AppImportTerminalPreset, AppImportThread, AppImportWorkspace } from "./appImportPlan.types";
import type { AppImportSetting } from "./appImportSetting.types";

type ItemOf<K extends AppImportItemKind, T> = { kind: K; item: T };

export type AppImportPlanEntry =
  | ItemOf<"workspace", AppImportWorkspace>
  | ItemOf<"thread", AppImportThread>
  | ItemOf<"setupScript", AppImportSetupScript>
  | ItemOf<"terminalPreset", AppImportTerminalPreset>
  | ItemOf<"setting", AppImportSetting>
  | ItemOf<"keybinding", AppImportKeybinding>
  | ItemOf<"envVar", AppImportEnvVar>
  | ItemOf<"bot", AppImportBot>;

/** One tickable row of the preview, shaped the same for the window and for apply. */
export type AppImportPlanItem = AppImportPlanEntry & {
  importKey: AppImportKey;
  label: string;
  support: AppImportItemSupport;
  /** Ticked when the preview opens: supported, not yet imported, and not sensitive. */
  selectedByDefault: boolean;
};
