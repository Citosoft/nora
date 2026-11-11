import { useMemo, useState } from "react";
import { Bot } from "lucide-react";
import { useProviderAccounts } from "@/components/app/hooks/useProviderAccounts";
import { useRuntimeProviderSync } from "@/components/app/hooks/useRuntimeProviderSync";
import { useSettingsRuntime } from "@/components/app/hooks/useSettingsRuntime";
import { settingAnchorAttributes } from "@/components/app/logic/settingsSearch";
import { ProviderInstallRow } from "@/components/app/panels/settings/ProviderInstallRow";
import { ProviderListRow } from "@/components/app/panels/settings/ProviderListRow";
import { SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import type { ProvidersTab } from "@/components/app/types/providerList.types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAgentToolAvailable } from "@shared/agentToolState";

/** Installed providers with sign-in status and enablement, plus supported providers that can be installed. */
export function CliSettingsSection() {
  const { agentCatalog, appSettings, updatePreferredAgentToolId, toggleToolEnabled, refreshAgentCatalog, installTool } = useSettingsRuntime();
  const providerAccounts = useProviderAccounts();
  const [tab, setTab] = useState<ProvidersTab>("installed");
  const installed = agentCatalog.filter((tool) => tool.detected);
  const installedIds = useMemo(() => installed.map((tool) => tool.id), [installed]);
  const runtimes = useRuntimeProviderSync(installedIds);
  const installable = agentCatalog.filter((tool) => !tool.detected && tool.installTemplate.trim().length > 0);
  const available = installed.filter((tool) => isAgentToolAvailable(tool));
  const preferred = available.some((tool) => tool.id === appSettings.preferredAgentToolId) ? appSettings.preferredAgentToolId ?? "" : "";

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <SettingsSectionHeader title="Providers" icon={Bot} description="Coding agents Nora can run: their sign-in status, whether they're enabled, and others you can install." />
        <Button variant="outline" size="sm" className="shrink-0" disabled={runtimes.refreshing} onClick={() => { refreshAgentCatalog(); void runtimes.refresh(); }}>
          Refresh
        </Button>
      </div>
      <Tabs value={tab} onValueChange={(value) => setTab(value === "available" ? "available" : "installed")} className="mt-6">
        <TabsList aria-label="Provider lists">
          <TabsTrigger value="installed">Installed ({installed.length})</TabsTrigger>
          <TabsTrigger value="available">Available to install ({installable.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="installed">
          {available.length ? (
            <label {...settingAnchorAttributes("Default Provider")} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4 text-sm">
              <span><span className="font-medium text-foreground">Default provider</span>
                <span className="block text-muted-foreground">Selected first for new agents and workspaces.</span></span>
              <Select aria-label="Default provider" className="w-56" value={preferred} onChange={(event) => updatePreferredAgentToolId(event.target.value || null)}>
                <option value="">Automatic (first enabled)</option>
                {available.map((tool) => <option key={tool.id} value={tool.id}>{tool.label}</option>)}
              </Select>
            </label>
          ) : null}
          {installed.length ? (
            <ul {...settingAnchorAttributes("Providers")} aria-label="Installed providers" className="mt-2">
              {installed.map((tool) => (
                <ProviderListRow key={tool.id} tool={tool} accountView={providerAccounts.views.get(tool.id)} connecting={runtimes.refreshing}
                  onToggle={(enabled) => toggleToolEnabled(tool.id, enabled)} onSignIn={() => void providerAccounts.signIn(tool.id)} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No supported providers are installed yet. Install one from Available to install, then refresh.</p>
          )}
        </TabsContent>
        <TabsContent value="available">
          {installable.length ? (
            <ul aria-label="Providers available to install" className="mt-2">
              {installable.map((tool) => <ProviderInstallRow key={tool.id} tool={tool} onInstall={() => installTool(tool.id)} />)}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Every supported provider is already installed.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
