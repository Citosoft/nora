import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { McpServerLogo } from "@/components/app/panels/settings/McpServerLogo";
import { useConnectorAuthAnswer } from "@/components/app/hooks/useConnectorAuthAnswer";
import type { ConnectorAuthCardProps } from "@/components/app/types/connectorAuthPrompts.types";

/** Asks to authorize a connector a thread's tool call is waiting on; Authorize opens the browser sign-in and holds the turn. */
export function ConnectorAuthCard({ prompt, logo, onAnswer }: ConnectorAuthCardProps) {
  const { sending, error, send } = useConnectorAuthAnswer(onAnswer);
  const busy = sending !== null;
  const authorizing = sending === "authorize";
  return <section className="flex items-start gap-3 rounded-lg border bg-card/60 p-3 text-sm shadow-sm" aria-label={`${prompt.connectorName} connector authorize`} aria-busy={busy}>
    <McpServerLogo logo={logo ?? prompt.logo} />
    <div className="min-w-0 flex-1 space-y-0.5">
      <p className="font-medium">Authorize {prompt.connectorName}</p>
      <p className="text-muted-foreground">{prompt.message ?? `${prompt.connectorName} needs you to authorize before this thread can use it.`}</p>
      {authorizing && <p className="text-xs text-muted-foreground" aria-live="polite">Waiting for sign-in to finish…</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
    <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row">
      <Button type="button" variant="ghost" size="sm" disabled={busy}
        onClick={() => void send({ kind: "decline", promptId: prompt.id })}>Not now</Button>
      <Button type="button" size="sm" disabled={busy} aria-label={`Authorize ${prompt.connectorName}`}
        onClick={() => void send({ kind: "authorize", promptId: prompt.id })}>
        {authorizing ? <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden="true" /> : null}
        Authorize
      </Button>
    </div>
  </section>;
}
