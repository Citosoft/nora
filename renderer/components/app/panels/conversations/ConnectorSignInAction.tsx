import { CircleCheck, LoaderCircle, RefreshCcw } from "lucide-react";
import { McpLoginButton } from "@/components/app/panels/settings/McpLoginButton";
import type { ConnectorSignInActionProps } from "@/components/app/types/connectorSignIn.types";
import { Button } from "@/components/ui/button";

/** The card's trailing control: sign in, a connected mark, or a refresh when the connector's state may have changed elsewhere. */
export function ConnectorSignInAction({ status, connectors }: ConnectorSignInActionProps) {
  switch (status.kind) {
    case "checking": return <LoaderCircle className="mt-1 size-4 shrink-0 text-muted-foreground motion-safe:animate-spin" aria-hidden="true" />;
    case "connected": return <CircleCheck className="mt-1 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" role="img" aria-label="Connected" />;
    case "sign-in": return connectors ? <McpLoginButton server={status.server} source={connectors.source} logins={connectors.logins} /> : null;
    case "missing":
    case "blocked":
    case "unavailable": return connectors ? <Button variant="ghost" size="sm" className="shrink-0" onClick={connectors.refresh}>
      <RefreshCcw className="size-3.5" aria-hidden="true" />Refresh</Button> : null;
  }
}
