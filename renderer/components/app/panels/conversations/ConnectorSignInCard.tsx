import { connectorSignInDetail, connectorSignInStatus } from "@/components/app/logic/connectorSignIn";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import type { ConnectorSignInCardProps } from "@/components/app/types/connectorSignIn.types";
import { ConnectorSignInAction } from "./ConnectorSignInAction";

/** Shown where the model asked for a connector sign-in; tracks the connector live so it flips to connected once signed in. */
export function ConnectorSignInCard({ item, connectors }: ConnectorSignInCardProps) {
  const login = connectors?.logins.state(connectors.source, item.server);
  const status = connectorSignInStatus({ serverName: item.server, summary: connectors?.summary, login });
  const server = "server" in status ? status.server : null;
  const name = server?.name ?? item.server;
  const connected = status.kind === "connected";
  return <section aria-label={`${name} connector sign-in`} data-state={status.kind}
    className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${connected ? "border-border/60 bg-card/30" : "bg-card/60"}`}>
    <McpServerLogo logo={server?.logo} />
    <div className="min-w-0 flex-1 space-y-0.5">
      <p className="font-medium">{connected ? `Connected to ${name}` : `Sign in to ${name}`}</p>
      {item.reason && <p className="text-muted-foreground">{item.reason}</p>}
      <p className={`text-xs ${status.kind === "sign-in" && status.failure ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
        {connectorSignInDetail(status, name, connectors?.source.label ?? "This runtime")}
      </p>
    </div>
    <ConnectorSignInAction status={status} connectors={connectors} />
  </section>;
}
