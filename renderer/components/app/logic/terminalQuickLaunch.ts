import type { CreateTerminalDialogDefaults } from "@/components/app/types";
import type { AppSettings, CreateTerminalPayload } from "@shared/appTypes";

const DEFAULT_TERMINAL_NAME = "Terminal";

export function normalizeTerminalQuickLaunchName(value: string): string {
  const name = value.trim();
  return name.length > 0 ? name : DEFAULT_TERMINAL_NAME;
}

export function createQuickTerminalPayload(
  preferredShellId: string | null | undefined,
  defaults: AppSettings["terminalQuickLaunchDefaults"]
): CreateTerminalPayload {
  return {
    name: normalizeTerminalQuickLaunchName(defaults.name),
    ...(preferredShellId ? { shellId: preferredShellId } : {}),
    target: { kind: defaults.target },
    launchConfig: {
      kind: "blank",
      label: "Shell",
      command: ""
    }
  };
}

export function createQuickTerminalDialogDefaults(
  preferredShellId: string | null,
  defaults: AppSettings["terminalQuickLaunchDefaults"]
): CreateTerminalDialogDefaults {
  return {
    name: normalizeTerminalQuickLaunchName(defaults.name),
    shellId: preferredShellId || undefined,
    target: { kind: defaults.target },
    launchConfig: {
      kind: "blank",
      label: "Shell",
      command: ""
    }
  };
}
