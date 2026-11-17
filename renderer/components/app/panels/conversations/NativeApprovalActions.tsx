import { useRef, useState } from "react";
import { Check, Clock3, LoaderCircle, ShieldCheck, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { groupApprovalActions } from "@/components/app/logic/approvalActions";
import type { ApprovalAction, NativeApprovalProps } from "@/components/app/types/nativeActivity.types";

export function NativeApprovalActions({ request, disabled, onRespond }: NativeApprovalProps) {
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const groups = groupApprovalActions(request.options);
  const renderAction = (action: ApprovalAction) => {
    const { option, intent } = action;
    const primary = action === groups.primary;
    const quiet = intent === "deny" || intent === "cancel";
    const Icon = sending === option.id ? LoaderCircle : intent === "cancel" ? Square : intent === "deny" ? X
      : primary ? Check : option.scope === "session" || option.id === "acceptForSession" ? Clock3 : ShieldCheck;
    return <Button key={option.id} type="button" size="sm" variant={quiet || primary ? "ghost" : "outline"}
      disabled={disabled || sending !== null} aria-label={option.label} aria-description={option.description}
      tooltip={<><span className="font-medium">{option.label}</span>{option.description && <span className="mt-1 block text-muted-foreground">{option.description}</span>}</>}
      className={cn("h-8 max-w-full gap-1.5 whitespace-nowrap px-2.5 text-xs font-medium",
        primary && "border border-primary/80 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/80",
        quiet && "text-muted-foreground hover:text-foreground",
        intent === "cancel" && "hover:bg-destructive/10 hover:text-destructive"
      )} onClick={async () => {
        if (inFlight.current || disabled || Date.parse(request.expiresAt) <= Date.now()) return;
        inFlight.current = true; setSending(option.id); setError(null);
        try { await onRespond({ kind: "approval", optionId: option.id }); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "The response could not be sent. Try again."); }
        finally { inFlight.current = false; setSending(null); }
      }}>
      <Icon className={cn("size-3.5 shrink-0", sending === option.id && "motion-safe:animate-spin")} aria-hidden="true" />
      <span className="truncate">{option.label}</span>
    </Button>;
  };

  return <div role="group" className="space-y-2 border-t border-border/60 pt-3" aria-label="Approval actions" aria-busy={sending !== null || request.status === "responding"}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {groups.negative.length > 0 && <div className="mr-auto flex min-w-0 flex-wrap items-center gap-0.5">{groups.negative.map(renderAction)}</div>}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        {groups.secondary.map(renderAction)}
        {groups.primary && renderAction(groups.primary)}
      </div>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
