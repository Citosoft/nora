import { useMemo, useState, useSyncExternalStore } from "react";
import { useNativeRuntimePorts } from "@/components/app/hooks/useNativeRuntimePorts";
import { useRuntimeMcp } from "@/components/app/hooks/useRuntimeMcp";
import { McpServerRow } from "./McpServerRow";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { settingAnchorAttributes } from "@/components/app/logic/settingsSearch";
import type { McpSelection } from "@/components/app/types/runtimeMcp.types";

export function McpSettingsSection() {
  const { boot, store } = useNativeRuntimePorts();
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot);
  const [providerKey, setProviderKey] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const provider = boot.providers.find((entry) => `${entry.kind}:${entry.instanceId}` === providerKey) ?? boot.providers[0];
  const workspace = boot.workspaces.find((entry) => entry.id === workspaceId)
    ?? boot.workspaces.find((entry) => entry.id === snapshot.layout.focusedWorkspaceId) ?? boot.workspaces[0];
  const selection = useMemo<McpSelection | null>(() => provider && workspace
    ? { environmentId: boot.environmentId, providerKind: provider.kind, instanceId: provider.instanceId, workspace: workspace.workspace }
    : null, [boot.environmentId, provider, workspace]);
  const { state, refresh, login } = useRuntimeMcp(selection);
  const result = state.status === "loaded" ? state.result : null;
  return <section {...settingAnchorAttributes("MCP Connections")} className="mt-6 space-y-4 rounded-md border border-border/60 bg-card/40 p-4" aria-label="MCP connections">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-base font-medium">MCP Connections</h3>
      <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={!selection || state.status === "loading"}>Refresh connections</Button>
    </div>
    <p className="text-sm text-muted-foreground">Connections are loaded from your provider runtime and the selected workspace. Manage server configuration and credentials in that runtime.</p>
    {!selection ? <p className="text-sm text-muted-foreground">Connect a supported provider and choose a workspace to discover MCP servers.</p> : <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-muted-foreground">Provider
          <Select aria-label="MCP provider" value={`${provider.kind}:${provider.instanceId}`} onChange={(event) => setProviderKey(event.target.value)}>
            {boot.providers.map((entry) => <option key={`${entry.kind}:${entry.instanceId}`} value={`${entry.kind}:${entry.instanceId}`}>{entry.label}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">Workspace
          <Select aria-label="MCP workspace" value={workspace.id} onChange={(event) => setWorkspaceId(event.target.value)}>
            {boot.workspaces.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </Select>
        </label>
      </div>
      <div aria-live="polite">
        {state.status === "loading" ? <p role="status" className="text-sm text-muted-foreground">Discovering runtime MCP connections…</p> : null}
        {state.status === "error" ? <p role="alert" className="text-sm text-destructive">{state.message}</p> : null}
        {result?.kind === "unavailable" ? <p role="alert" className="text-sm text-muted-foreground">{result.message}</p> : null}
        {result?.kind === "login" ? <p className="text-sm text-muted-foreground">Complete sign-in in your browser, then refresh connections to check its status.</p> : null}
        {result?.kind === "servers" ? <div className="space-y-2">
          {result.servers.length ? result.servers.map((server) => <McpServerRow key={server.name} server={server} onLogin={(name) => void login(name)} />)
            : <p className="text-sm text-muted-foreground">No MCP servers are configured for this runtime and workspace.</p>}
        </div> : null}
      </div>
      {provider.kind === "claude" ? <p className="text-xs text-muted-foreground">For servers that need authentication, open Claude Code in this workspace and use /mcp to sign in on the same machine, then refresh here.</p> : null}
    </>}
  </section>;
}
