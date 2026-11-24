import type { PROVIDER_THREAD_SETTINGS } from "@/components/app/logic/providerThreadSettings";
import type { SettingRowRevealTarget } from "./settingsSearch.types";

/** A provider with thread settings of its own, and so a tab in the Threads section. */
export type ProviderThreadSettingsKind = keyof typeof PROVIDER_THREAD_SETTINGS;
export interface ThreadsSettingsSectionProps { revealTarget: SettingRowRevealTarget | null; }
/** A Threads settings tab: settings every provider honours, or one provider's own. */
export type ThreadSettingsTab = "all" | ProviderThreadSettingsKind;
export interface ThreadSettingsTabsProps {
  kinds: readonly ProviderThreadSettingsKind[];
  active: ThreadSettingsTab;
  onActiveChange(tab: ThreadSettingsTab): void;
}
