import type { NativeRequestProps } from "@/components/app/types/nativePanels.types";
import { NativeQuestions } from "./NativeQuestions";
import { NativeApproval } from "./NativeApproval";

export function NativeRequest({ request, busy, onRespond }: NativeRequestProps) {
  const unavailable = request.status !== "pending" || Date.parse(request.expiresAt) <= Date.now();
  const disabled = busy || unavailable;
  return <section className="space-y-3 rounded-lg border bg-card p-4 shadow-sm" aria-label="Agent request">
    <h2 className="font-medium">{request.title}</h2>
    {request.kind === "approval" ? <NativeApproval key={request.id} request={request} disabled={disabled} onRespond={onRespond} />
      : <NativeQuestions key={request.id} request={request} disabled={disabled} onRespond={onRespond} />}
    {unavailable && <p role="status" className="text-xs text-muted-foreground">{request.status === "responding" ? "Delivering response…" : "Request is no longer answerable."}</p>}
  </section>;
}
