import type { AppCenterContentValueArgs } from "@/components/app/types/appCenterContentValue.types";
import type {
  AppShellSignedInAiModelSources,
  AppShellSignedInCenterTabsSources,
  AppShellSignedInSessionSurfaceSources
} from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { ResolvedTheme, TerminalFontId, TerminalThemeId } from "@/components/app/types";
import type { ForgeItemsPorts } from "./forge-items/ports.types";
import type { ThreadBackdropSettings } from "@shared/types/threadBackdrop.types";

/** Read surface for session center (tabs, editor host, split views, terminal dock theming) — assembly-backed. */
export type SessionCenterPorts = {
  forgeItems: ForgeItemsPorts;
  onOpenThreadSettings(): void;
  onOpenBotSettings(): void;
  onOpenConnectorSettings(): void;
  sessionSurface: AppShellSignedInSessionSurfaceSources;
  centerTabs: AppShellSignedInCenterTabsSources;
  aiModels: AppShellSignedInAiModelSources;
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  /** Null when the backdrop is unavailable (GPU acceleration disabled). */
  threadBackdrop: ThreadBackdropSettings | null;
  /** Same payload as former `CenterContentBuildProvider`; derived from assembly in one place. */
  centerContentBuild: AppCenterContentValueArgs;
};
