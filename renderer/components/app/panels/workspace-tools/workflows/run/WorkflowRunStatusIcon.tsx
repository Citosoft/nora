import type { WorkflowRunStatusIconProps } from "@/components/app/types/loopRunPresentation.types";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, CircleDashed, LoaderCircle, PauseCircle, XCircle } from "lucide-react";

export function WorkflowRunStatusIcon({ status, className }: WorkflowRunStatusIconProps) {
  const sharedClassName = cn("size-4 shrink-0", className);
  switch (status) {
    case "active":
      return <LoaderCircle className={cn(sharedClassName, "animate-spin text-primary")} aria-label="In progress" />;
    case "complete":
      return <CheckCircle2 className={cn(sharedClassName, "text-emerald-500")} aria-label="Complete" />;
    case "paused":
      return <PauseCircle className={cn(sharedClassName, "text-amber-500")} aria-label="Paused" />;
    case "cancelled":
      return <XCircle className={cn(sharedClassName, "text-muted-foreground")} aria-label="Cancelled" />;
    case "error":
      return <AlertCircle className={cn(sharedClassName, "text-destructive")} aria-label="Failed" />;
    case "pending":
      return <CircleDashed className={cn(sharedClassName, "text-muted-foreground/60")} aria-label="Pending" />;
  }
}
