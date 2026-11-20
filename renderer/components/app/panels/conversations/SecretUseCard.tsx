import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSecretAnswer } from "@/components/app/hooks/useSecretAnswer";
import type { SecretUseCardProps } from "@/components/app/types/secretPrompts.types";

/** Asks before a command is handed saved secrets, showing exactly what will run: redaction cannot stop a command that sends one elsewhere. */
export function SecretUseCard({ prompt, onAnswer }: SecretUseCardProps) {
  const { sending, error, send } = useSecretAnswer(onAnswer);
  const busy = sending !== null;
  const allow = (remember: boolean): void => { void send({ kind: "allow", promptId: prompt.id, remember }); };
  return <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm" aria-label="Secret use request" aria-busy={busy}>
    <div className="flex items-start gap-3">
      <ShieldCheck className="mt-1 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <h2 className="break-words text-base font-medium">{prompt.requester} wants to run a command with your secrets</h2>
        <ul className="flex flex-wrap gap-1.5" aria-label="Secrets the command receives">
          {prompt.secrets.map((name) => <li key={name} className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{name}</li>)}
        </ul>
      </div>
    </div>
    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/50 p-3 font-mono text-xs" aria-label="Command">{prompt.command}</pre>
    <p className="text-xs text-muted-foreground">
      Runs in {prompt.workspaceName} with these secrets as environment variables. They are redacted from the output the agent sees,
      but a command can still send them somewhere else, so check it before allowing.
    </p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
      <Button type="button" variant="ghost" size="sm" className="mr-auto text-muted-foreground" disabled={busy}
        onClick={() => void send({ kind: "decline", promptId: prompt.id })}>Don’t allow</Button>
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => allow(true)}
        tooltip="Lets this thread use these secrets in later commands without asking, until Nora restarts">Allow for this thread</Button>
      <Button type="button" size="sm" disabled={busy} onClick={() => allow(false)}>Allow once</Button>
    </div>
  </section>;
}
