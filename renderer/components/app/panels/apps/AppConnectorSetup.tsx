import { KeyRound, Loader2 } from "lucide-react";
import { connectorsAwaitingSignIn, signInNames } from "@/components/app/logic/apps/connectorSignIn";
import type { AppConnectorSetupProps } from "@/components/app/types/appsView.types";
import { Button } from "@/components/ui/button";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";

/** Imported apps stay usable while each required account is authenticated in place: one clear call to action above the app. */
export function AppConnectorSetup({ spec, connections }: AppConnectorSetupProps) {
  const waiting = connectorsAwaitingSignIn(spec, connections.connectors ?? [], connections.pending);
  if (!waiting.length) return null;
  const failures = waiting.flatMap((connector) => { const failure = connections.failure(connector.id); return failure ? [{ id: connector.id, text: `${connector.name}: ${failure}` }] : []; });
  return <section aria-labelledby="app-sign-in-title" className="mx-4 mt-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3 shadow-sm">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><KeyRound className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <h2 id="app-sign-in-title" className="text-sm font-semibold text-foreground">Sign in to load this app</h2>
          <p className="text-xs text-muted-foreground">{signInNames(waiting.map((connector) => connector.name))} {waiting.length === 1 ? "needs" : "need"} your account.</p>
        </div>
      </div>
      <ul aria-label="Accounts to connect" className="flex flex-wrap gap-2">
        {waiting.map((connector) => {
          const signingIn = connections.pending(connector.id) === "sign-in";
          return <li key={connector.id}>
            <Button type="button" size="sm" className="gap-2" disabled={!!connections.pending(connector.id)} onClick={() => connections.signIn(connector.id)}>
              {signingIn ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <McpServerLogo logo={connector.logo} size="small" />}
              {signingIn ? "Signing in…" : `Connect ${connector.name}`}
            </Button>
          </li>;
        })}
      </ul>
    </div>
    {failures.length ? <ul className="mt-2 space-y-0.5 pl-12">{failures.map((failure) => <li key={failure.id} role="alert" className="text-xs text-destructive">{failure.text}</li>)}</ul> : null}
  </section>;
}
