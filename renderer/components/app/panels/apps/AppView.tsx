import { AppConnectorSetup } from "./AppConnectorSetup";
import { useApps } from "@/components/app/hooks/useApps";
import { useAppRuntime } from "@/components/app/hooks/useAppRuntime";
import { noraSystemClient } from "@/components/app/clients/noraSystemClient";
import { useAppBuilderOpener } from "@/components/app/hooks/useAppBuilderOpener";
import { useNoraConnectors } from "@/components/app/hooks/useNoraConnectors";
import { useWorkspaceNavigation } from "@/components/app/hooks/useWorkspaceNavigation";
import type { AppViewProps } from "@/components/app/types/apps.types";
import { AppHeader } from "./AppHeader";
import { AppRenderer } from "./AppRenderer";

const NO_CONNECTORS: never[] = [];

/** One app, live: its header and its rendered UI. */
export function AppView({ appId, inBuilder = false }: AppViewProps) {
  const connections = useNoraConnectors();
  const { connectors } = connections;
  const runtime = useAppRuntime(appId, connectors ?? NO_CONNECTORS);
  const apps = useApps();
  const navigation = useWorkspaceNavigation();
  const openBuilder = useAppBuilderOpener();
  const { app } = runtime;
  if (runtime.error) return <section role="alert" className="p-6 text-sm text-destructive">{runtime.error}</section>;
  if (!app) return <section role="status" className="p-6 text-sm text-muted-foreground">Opening the app…</section>;
  return <section aria-label={app.name} className="relative flex min-h-0 flex-1 flex-col">
    <AppHeader runtime={runtime} connectors={connectors} onEdit={inBuilder ? null : () => openBuilder(app)}
      onRename={(name) => void apps.rename(app.id, name)} onTrust={(trusted) => void apps.setTrusted(app.id, trusted)}
      onExport={() => void apps.exportToFile(app.id).then((path) => { if (path) void noraSystemClient.revealFileInFolder(path); })}
      onDelete={() => { void apps.remove(app.id); navigation.setPreferences((current) => ({ ...current, activeAppId: null })); }} />
    <AppConnectorSetup spec={app.spec} connections={connections} />
    <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto"><div className="app-canvas w-full px-4 py-4"><AppRenderer runtime={runtime} /></div></div>
  </section>;
}
