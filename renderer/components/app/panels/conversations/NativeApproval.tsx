import { useRef, useState } from "react";
import { Check, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NativeApprovalProps } from "@/components/app/types/nativeActivity.types";

export function NativeApproval({ request, disabled, onRespond }: NativeApprovalProps) {
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const details = request.details;
  return <div className="space-y-4" aria-busy={sending !== null || request.status === "responding"}>
    <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400"><ShieldCheck className="size-4" aria-hidden="true" />
      {details?.kind === "network" ? "Network access" : details?.kind === "files" ? "File access" : "Permission required"}</div>
    {details?.reason && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{details.reason}</p>}
    <div className="max-h-[35vh] space-y-3 overflow-y-auto">
      {details?.command && <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap break-words">{details.command}</pre>}
      {details?.target && <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">{details.kind === "network" ? "Destination" : "Requested access"}</p>
        <p className="break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">{details.target}</p></div>}
      {details?.workingDirectory && <p className="break-all text-xs text-muted-foreground"><span className="font-medium">Working directory: </span>{details.workingDirectory}</p>}
      {!!details?.paths?.length && <ul aria-label="Affected files" className="space-y-1 rounded-md border bg-muted/40 p-3 font-mono text-xs">
        {details.paths.map((path) => <li key={path} className="break-all">{path}</li>)}</ul>}
      {details?.input && <pre className="overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap break-words">{details.input}</pre>}
    </div>
    <div className="grid gap-2 sm:grid-cols-2">{request.options.map((option) => {
      const allow = option.intent === "allow" || (!option.intent && ["allow", "accept", "acceptForSession"].includes(option.id));
      const Icon = sending === option.id ? LoaderCircle : allow ? Check : X;
      return <Button key={option.id} type="button" disabled={disabled || sending !== null} className={cn(
        "h-auto min-h-14 items-start justify-start gap-2.5 whitespace-normal px-3 py-2.5 text-left",
        allow && "border-primary/40 bg-primary/10 hover:bg-primary/15"
      )} onClick={async () => {
        if (inFlight.current || disabled || Date.parse(request.expiresAt) <= Date.now()) return;
        inFlight.current = true; setSending(option.id); setError(null);
        try { await onRespond({ kind: "approval", optionId: option.id }); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "The response could not be sent. Try again."); }
        finally { inFlight.current = false; setSending(null); }
      }}>
        <Icon className={cn("mt-0.5 size-4 shrink-0", sending === option.id && "motion-safe:animate-spin")} aria-hidden="true" />
        <span><span className="block text-sm font-medium">{option.label}</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{option.description ?? (allow ? "Allow this action." : "Decline this action.")}</span></span>
      </Button>;
    })}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
