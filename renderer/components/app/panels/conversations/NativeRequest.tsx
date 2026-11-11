import type { NativeRequestProps } from "@/components/app/types/nativePanels.types";
import { NativeQuestions } from "./NativeQuestions";
import { NativeApproval } from "./NativeApproval";
import { Title } from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function NativeRequest({ request, busy, presentation = "panel", onRespond }: NativeRequestProps) {
  const unavailable = request.status !== "pending" || Date.parse(request.expiresAt) <= Date.now();
  const disabled = busy || unavailable;
  const title = <h2 className={cn("break-words font-medium", presentation === "dialog" ? "text-sm" : "text-base")}>{request.title}</h2>;
  return <section className={cn("space-y-3 p-4", presentation === "panel" && "rounded-lg border bg-card shadow-sm")} aria-label="Agent request">
    {presentation === "dialog" ? <Title asChild>{title}</Title> : title}
    {request.kind === "approval" ? <NativeApproval key={request.id} request={request} disabled={disabled} onRespond={onRespond} />
      : <NativeQuestions key={request.id} request={request} disabled={disabled} onRespond={onRespond} />}
    {unavailable && <p role="status" className="text-xs text-muted-foreground">{request.status === "responding" ? "Delivering response…" : "Request is no longer answerable."}</p>}
  </section>;
}
