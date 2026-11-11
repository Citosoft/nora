import { useMemo, useState, useSyncExternalStore } from "react";
import { Server } from "lucide-react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useRuntimeMcpCatalog } from "@/components/app/hooks/useRuntimeMcpCatalog";
import { listMcpServerRows } from "@/components/app/logic/mcpServerTable";
import { settingAnchorAttributes } from "@/components/app/logic/settingsSearch";
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
  const workspace = boot.workspaces.find((entry) => entry.id === workspaceId)
    ?? boot.workspaces.find((entry) => entry.id === snapshot.layout.focusedWorkspaceId) ?? boot.workspaces[0];
  // One request per provider: with a workspace it returns global and workspace servers together; without one, global only.
  const sources = useMemo<McpProviderSource[]>(() => boot.providers.map((provider) => ({
    key: `${provider.kind}:${provider.instanceId}`, label: provider.label, kind: provider.kind,
    selection: { environmentId: boot.environmentId, providerKind: provider.kind, instanceId: provider.instanceId,
      ...(workspace ? { workspace: workspace.workspace } : {}) }
  })), [boot.environmentId, boot.providers, workspace]);
  const { entries, refresh, login } = useRuntimeMcpCatalog(sources);
  const rows = useMemo(() => listMcpServerRows(entries), [entries]);
  const isLoading = entries.some((entry) => entry.state.status === "loading");

  return <div className="max-w-5xl">
    <SettingsSectionHeader title="MCP Servers" icon={Server}
      description="MCP servers discovered from your provider runtimes: global servers available everywhere, plus servers configured for the selected workspace. Manage server configuration and credentials in each runtime." />
    {!sources.length ? <p className="mt-6 text-sm text-muted-foreground">Connect a supported provider to discover MCP servers.</p> : <>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        {workspace ? <label className="w-full max-w-xs space-y-1 text-xs text-muted-foreground">Workspace
          <Select aria-label="MCP workspace" value={workspace.id} onChange={(event) => setWorkspaceId(event.target.value)}>
            {boot.workspaces.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </Select>
        </label> : <p className="text-sm text-muted-foreground">Open a workspace to also see servers configured in its project settings.</p>}
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>Refresh servers</Button>
      </div>
      <div {...settingAnchorAttributes("MCP Servers")} className="mt-4 space-y-3" aria-live="polite">
        <div className="space-y-2 empty:hidden">{entries.map((entry) => <McpProviderNotice key={entry.source.key} entry={entry} />)}</div>
        {rows.length ? <McpServerTable rows={rows} onLogin={login} />
          : !isLoading ? <p className="text-sm text-muted-foreground">No MCP servers were discovered.</p> : null}
      </div>
      {sources.some((source) => source.kind === "claude") ? <p className="mt-4 text-xs text-muted-foreground">For Claude servers that need authentication, open Claude Code and use /mcp to sign in on the same machine, then refresh here.</p> : null}
    </>}
  </div>;
}
