import type { AppCenterContentValueArgs } from "@/components/app/types/appCenterContentValue.types";
import type {
  AppShellSignedInAiModelSources,
  AppShellSignedInCenterTabsSources,
  AppShellSignedInSessionSurfaceSources
} from "@/components/app/types/appShellSignedInAssemblySources.types";
import type { ResolvedTheme, TerminalFontId, TerminalThemeId } from "@/components/app/types";

/** Read surface for session center (tabs, editor host, split views, terminal dock theming) — assembly-backed. */
export type SessionCenterPorts = {
  sessionSurface: AppShellSignedInSessionSurfaceSources;
  centerTabs: AppShellSignedInCenterTabsSources;
  aiModels: AppShellSignedInAiModelSources;
  resolvedTheme: ResolvedTheme;
  terminalThemeId: TerminalThemeId;
  terminalFontId: TerminalFontId;
  /** Same payload as former `CenterContentBuildProvider`; derived from assembly in one place. */
  centerContentBuild: AppCenterContentValueArgs;
};
