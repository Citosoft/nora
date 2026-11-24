import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { providerThreadSettingsTabs, threadSettingsTabFor } from "@/components/app/logic/providerThreadSettings";
import { SettingsSectionHeader } from "./settingsUi";
import { ThreadSettingsTabs } from "./threads/ThreadSettingsTabs";
import type { ThreadSettingsTab, ThreadsSettingsSectionProps } from "@/components/app/types/threadSettings.types";

/** Tabs keep the section short: settings every provider honours, then each provider's own. */
export function ThreadsSettingsSection({ revealTarget }: ThreadsSettingsSectionProps) {
  const { boot } = useNativeRuntimePorts();
  const kinds = providerThreadSettingsTabs(boot.providers.map((provider) => provider.kind));
  const [chosen, setChosen] = useState<ThreadSettingsTab>("all");
  const [revealed, setRevealed] = useState<number | null>(null);
  // Switched during render, not in an effect, so the row is mounted by the time the settings page scrolls to it.
  if (revealTarget?.group === "threads" && revealTarget.requestId !== revealed) {
    setRevealed(revealTarget.requestId);
    setChosen(threadSettingsTabFor(revealTarget.title));
  }
  const active = chosen === "all" || kinds.includes(chosen) ? chosen : "all";
  return <div className="max-w-4xl">
    <SettingsSectionHeader title="Threads" icon={MessagesSquare} description="Manage conversation context and how threads continue over time." />
    <ThreadSettingsTabs kinds={kinds} active={active} onActiveChange={setChosen} />
  </div>;
}
