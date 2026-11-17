import { useMemo, useState, useSyncExternalStore } from "react";
import { Plus, Server } from "lucide-react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { useRuntimeMcpCatalog } from "@/components/app/hooks/useRuntimeMcpCatalog";
import { buildMcpServerTable } from "@/components/app/logic/mcpServerTable";
import { settingAnchorAttributes } from "@/components/app/logic/settingsSearch";
import { AddConnectorDialog } from "@/components/app/dialogs/AddConnectorDialog";
import { ConnectorAccessDialog } from "@/components/app/dialogs/ConnectorAccessDialog";
import { buildConnectorAccessChoices } from "@/components/app/logic/connectorAccess";
import type { Connector } from "@shared/types/connectors/connectors.types";
import { McpProviderNotice } from "@/components/app/panels/settings/McpProviderNotice";
import { McpServerTable } from "@/components/app/panels/settings/McpServerTable";
import { SettingsSectionHeader } from "@/components/app/panels/settings/settingsUi";
import type { McpProviderSource } from "@/components/app/types/runtimeMcp.types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function McpServersSettingsSection() {
  const { boot, store } = useNativeRuntimePorts();
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot);
  const [workspaceId, setWorkspaceId] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingAccess, setEditingAccess] = useState<Connector | null>(null);
  const accessChoices = useMemo(() => buildConnectorAccessChoices(boot), [boot]);
  const connectors = useNoraConnectors();
  const workspace = boot.workspaces.find((entry) => entry.id === workspaceId)
    ?? boot.workspaces.find((entry) => entry.id === snapshot.layout.focusedWorkspaceId) ?? boot.workspaces[0];
  // One request per provider: with a workspace it returns global and workspace servers together; without one, global only.
  const sources = useMemo<McpProviderSource[]>(() => boot.providers.filter((provider) => provider.reportsMcp).map((provider) => ({
    key: `${provider.kind}:${provider.instanceId}`, label: provider.label, kind: provider.kind,
    selection: { environmentId: boot.environmentId, providerKind: provider.kind, instanceId: provider.instanceId,
      ...(workspace ? { workspace: workspace.workspace } : {}) }
  })), [boot.environmentId, boot.providers, workspace]);
  const { entries, refresh, logins } = useRuntimeMcpCatalog(store.client, sources);
  const { rows, availableAccountConnectors } = useMemo(() => buildMcpServerTable(entries), [entries]);
  const isLoading = entries.some((entry) => entry.state.status === "loading");
  const refreshAll = () => { refresh(); connectors.refresh(); };

  return <div className="max-w-5xl">
    <SettingsSectionHeader title="MCP Servers" icon={Server}
      description="Nora's built-in server, connectors you add here, and MCP servers discovered from your provider runtimes. Connectors added in Nora work in Claude, Codex and ACP threads (everywhere, or only the workspaces and bots you choose), and Nora handles their sign-in. Servers discovered from a runtime are managed in that runtime." />
    <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
      {workspace && sources.length ? <label className="w-full max-w-xs space-y-1 text-xs text-muted-foreground">Workspace
        <Select aria-label="MCP workspace" value={workspace.id} onChange={(event) => setWorkspaceId(event.target.value)}>
          {boot.workspaces.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </Select>
      </label> : <p className="text-sm text-muted-foreground">{sources.length ? "Open a workspace to also see servers configured in its project settings." : "Connect a supported provider to also discover its MCP servers."}</p>}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={isLoading}>Refresh servers</Button>
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-3.5" aria-hidden="true" />Add connector</Button>
      </div>
    </div>
    <div {...settingAnchorAttributes("MCP Servers")} className="mt-4 space-y-3" aria-live="polite">
      <div className="space-y-2 empty:hidden">
        {connectors.loadError ? <p className="text-sm text-destructive">{connectors.loadError}</p> : null}
        {entries.map((entry) => <McpProviderNotice key={entry.source.key} entry={entry} />)}
      </div>
      <McpServerTable rows={rows} logins={logins} builtIn={boot.noraTools} connectors={connectors} accessChoices={accessChoices} onEditConnectorAccess={setEditingAccess} />
      {sources.length && !rows.length && !isLoading ? <p className="text-sm text-muted-foreground">No MCP servers were discovered in your provider runtimes.</p> : null}
      {availableAccountConnectors ? <p className="text-xs text-muted-foreground">
        {availableAccountConnectors === 1 ? "1 more connector is" : `${availableAccountConnectors} more connectors are`} available to your account but not connected. Connect them in Claude on the web, desktop or mobile to use them here, or add the server in Nora.
      </p> : null}
    </div>
    {sources.some((source) => source.kind === "claude") ? <p className="mt-4 text-xs text-muted-foreground">Sign in opens your browser for remote servers and claude.ai connectors. For servers configured with other credentials, set them up in Claude Code, then refresh here.</p> : null}
    <AddConnectorDialog open={adding} onOpenChange={setAdding} onCreate={connectors.create} accessChoices={accessChoices} />
    <ConnectorAccessDialog connector={editingAccess} accessChoices={accessChoices} onClose={() => setEditingAccess(null)} onSave={connectors.setAccess} />
  </div>;
}
