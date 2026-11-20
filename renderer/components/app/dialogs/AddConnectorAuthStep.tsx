import { CONNECTOR_OAUTH_REDIRECT_URL } from "@shared/connectors/contracts";
import { Field } from "@/components/app/shared/Field";
import type { AddConnectorFormStepProps, ConnectorAuthMode } from "@/components/app/types/noraConnectors.types";
import { Input } from "@/components/ui/input";

const AUTH_MODES: readonly { mode: ConnectorAuthMode; label: string; detail: string }[] = [
  { mode: "oauth", label: "Sign in with OAuth", detail: "Nora signs in through your browser when the server asks for it. Servers without sign-in connect directly." },
  { mode: "header", label: "API key or header", detail: "Nora sends one fixed header, such as Authorization: Bearer <key>, with every request." }
];

/** The add dialog's second step: how Nora authenticates to the server. */
export function AddConnectorAuthStep({ form, update, clientRequired = false }: AddConnectorFormStepProps) {
  return <>
    <fieldset className="space-y-2">
      <legend className="sr-only">Authentication</legend>
      {AUTH_MODES.map(({ mode, label, detail }) => <label key={mode}
        className={`flex cursor-pointer gap-2.5 rounded-md border px-3 py-2 text-sm transition ${form.authMode === mode ? "border-primary/40 bg-primary/10" : "border-border/70 hover:border-primary/25"}`}>
        <input type="radio" name="connector-auth" className="mt-1" checked={form.authMode === mode} onChange={() => update({ authMode: mode })} />
        <span><span className="font-medium text-foreground">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span></span>
      </label>)}
    </fieldset>
    {form.authMode === "oauth" ? <details open={clientRequired} className="rounded-md border border-border/60 px-3 py-2 text-xs">
      <summary className="cursor-pointer text-sm font-medium text-foreground">{clientRequired ? "Your OAuth client" : "Use your own OAuth client"}</summary>
      <p className="mt-2 text-muted-foreground">{clientRequired ? "This server needs it. " : "Only needed for servers that do not support dynamic client registration. "}Register this redirect URI with the provider: <code className="select-all break-all">{CONNECTOR_OAUTH_REDIRECT_URL}</code></p>
      <div className="mt-3 space-y-3">
        <Field label="Client ID"><Input value={form.clientId} autoComplete="off" onChange={(event) => update({ clientId: event.target.value })} /></Field>
        <Field label="Client secret (optional)"><Input type="password" autoComplete="off" value={form.clientSecret} disabled={!form.clientId.trim()} onChange={(event) => update({ clientSecret: event.target.value })} /></Field>
      </div>
    </details> : <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
      <Field label="Header"><Input required value={form.headerName} autoComplete="off" onChange={(event) => update({ headerName: event.target.value })} /></Field>
      <Field label="Value"><Input required type="password" autoComplete="off" placeholder="Bearer …" value={form.headerValue} onChange={(event) => update({ headerValue: event.target.value })} /></Field>
    </div>}
  </>;
}
