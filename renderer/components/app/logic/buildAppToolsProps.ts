import type { AppToolsProps } from "@/components/app/types/workspaceUtilities.types";

export function buildAppToolsProps(input: AppToolsProps): AppToolsProps {
  return {
    resolvedTheme: input.resolvedTheme,
    onToggleTheme: input.onToggleTheme,
    onOpenSettings: input.onOpenSettings,
    settingsActive: input.settingsActive,
    onOpenKeyboardShortcuts: input.onOpenKeyboardShortcuts,
    onOpenAbout: input.onOpenAbout,
    onSubmitIssue: input.onSubmitIssue,
    onOpenStartupDependencies: input.onOpenStartupDependencies,
    onOpenResourceMonitor: input.onOpenResourceMonitor,
    onOpenOnboarding: input.onOpenOnboarding
  };
}
