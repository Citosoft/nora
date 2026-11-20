import { useId, useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSecretAnswer } from "@/components/app/hooks/useSecretAnswer";
import type { SecretInputCardProps } from "@/components/app/types/secretPrompts.types";

/**
 * Where the user types a secret an agent asked for. The value goes straight to main over the secrets channel and is dropped
 * from this component once saved; it is never part of the thread, so no provider or transcript sees it.
 */
export function SecretInputCard({ prompt, onAnswer }: SecretInputCardProps) {
  const [value, setValue] = useState("");
  const { sending, error, send } = useSecretAnswer(onAnswer);
  const fieldId = useId();
  const noteId = useId();
  const busy = sending !== null;
  const field = { id: fieldId, value, disabled: busy, required: true, autoComplete: "off", spellCheck: false, "aria-describedby": noteId,
    placeholder: `Enter ${prompt.name}`, className: "font-mono" };
  return <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm" aria-label="Secret request">
    <div className="flex items-start gap-3">
      <KeyRound className="mt-1 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <h2 className="break-words text-base font-medium">{prompt.requester} is asking for <code className="font-mono text-[0.9em]">{prompt.name}</code></h2>
        <p className="break-words text-sm text-muted-foreground">{prompt.purpose}</p>
      </div>
    </div>
    <form className="space-y-3" aria-busy={busy} onSubmit={(event) => {
      event.preventDefault();
      if (value) void send({ kind: "save", promptId: prompt.id, value });
    }}>
      <label htmlFor={fieldId} className="sr-only">Value for {prompt.name}</label>
      {/* Chromium masks a textarea with -webkit-text-security, which keeps multi-line values hidden like a password field. */}
      {prompt.multiline ? <Textarea {...field} rows={4} className="resize-y font-mono [-webkit-text-security:disc]" onChange={(event) => setValue(event.target.value)} />
        : <Input {...field} type="password" onChange={(event) => setValue(event.target.value)} />}
      <p id={noteId} className="text-xs text-muted-foreground">
        Encrypted with your system keychain and saved for {prompt.scope === "workspace" ? prompt.workspaceName : "every workspace"}.
        {" "}The agent can use it in commands you approve, but never sees it, and it is not saved in this chat.
        {prompt.replaces && " Saving replaces the value stored now."}
      </p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={busy}
          onClick={() => void send({ kind: "decline", promptId: prompt.id })}>Don’t provide</Button>
        <Button type="submit" size="sm" disabled={busy || !value}>{sending === "save" ? "Saving…" : "Save secret"}</Button>
      </div>
    </form>
  </section>;
}
