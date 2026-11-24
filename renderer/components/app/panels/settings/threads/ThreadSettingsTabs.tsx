import type { ComponentType } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderOptionLabel } from "../ProviderOptionLabel";
import { ThreadModelDefaultSetting } from "../ThreadModelDefaultSetting";
import { ThreadBehaviorSettings } from "../ThreadBehaviorSettings";
import { ClaudeThreadSettings } from "./ClaudeThreadSettings";
import type { ProviderThreadSettingsKind, ThreadSettingsTab, ThreadSettingsTabsProps } from "@/components/app/types/threadSettings.types";

const PROVIDER_PANELS = { claude: ClaudeThreadSettings } satisfies Record<ProviderThreadSettingsKind, ComponentType>;

/** "All providers" first, then a tab per installed provider with settings of its own; the caller owns the active tab so search can open the right one. */
export function ThreadSettingsTabs({ kinds, active, onActiveChange }: ThreadSettingsTabsProps) {
  const { boot } = useNativeRuntimePorts();
  const tabs: readonly ThreadSettingsTab[] = ["all", ...kinds];
  return <Tabs className="mt-6" value={active} onValueChange={(value) => { const tab = tabs.find((entry) => entry === value); if (tab) onActiveChange(tab); }}>
    <TabsList aria-label="Thread settings for">
      <TabsTrigger value="all">All providers</TabsTrigger>
      {kinds.map((kind) => <TabsTrigger key={kind} value={kind}>
        <ProviderOptionLabel kind={kind} label={boot.providers.find((entry) => entry.kind === kind)?.label ?? kind} />
      </TabsTrigger>)}
    </TabsList>
    <TabsContent value="all" className="mt-2"><ThreadModelDefaultSetting /><ThreadBehaviorSettings /></TabsContent>
    {kinds.map((kind) => { const Panel = PROVIDER_PANELS[kind]; return <TabsContent key={kind} value={kind} className="mt-2"><Panel /></TabsContent>; })}
  </Tabs>;
}
