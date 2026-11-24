import type { ProviderKind } from "@shared/types/provider/providerKind.types";
import type { ProviderThreadSettingsKind, ThreadSettingsTab } from "@/components/app/types/threadSettings.types";

/**
 * Thread settings only one provider's runtime supports, by the SettingRow title settings search reveals, in tab order.
 * Settings every provider honours (even if some fall back, like steering) stay in the shared part of the Threads section.
 */
export const PROVIDER_THREAD_SETTINGS = {
  claude: ["Default subagent model", "Suggested replies", "Compaction threshold", "Idle chat compaction"]
} as const satisfies Partial<Record<ProviderKind, readonly string[]>>;

const KINDS = Object.keys(PROVIDER_THREAD_SETTINGS) as ProviderThreadSettingsKind[];

/** The provider tabs to show: installed providers that have settings of their own, in registry order. */
export function providerThreadSettingsTabs(installed: readonly ProviderKind[]): ProviderThreadSettingsKind[] {
  return KINDS.filter((kind) => installed.includes(kind));
}

/** The tab holding a setting, so a search result inside an inactive tab can open it first. */
export function threadSettingsTabFor(title: string): ThreadSettingsTab {
  return KINDS.find((kind) => (PROVIDER_THREAD_SETTINGS[kind] as readonly string[]).includes(title)) ?? "all";
}
