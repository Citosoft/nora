import { useState } from "react";
import { ChevronDown, ShieldQuestion } from "lucide-react";
import { useAttentionToasts } from "@/components/app/hooks/useAttentionToasts";
import { Button } from "@/components/ui/button";
import { AttentionTrayRow } from "./AttentionTrayRow";

/**
 * Every request waiting in other threads and bots, in one card in the bottom-right corner, answerable without switching threads.
 * Collapses to a small "N waiting" pill; it sits just under menus (z 9999) so row menus open above it.
 */
export function AttentionTray() {
  const { toasts, respond, open, dismiss } = useAttentionToasts();
  const [collapsed, setCollapsed] = useState(false);
  if (!toasts.length) return null;
  const label = `${toasts.length} waiting for you`;
  if (collapsed) {
    return <Button type="button" variant="outline" aria-expanded={false} aria-label={`Show ${label}`} onClick={() => setCollapsed(false)}
      className="fixed bottom-4 right-4 z-[9990] h-8 gap-1.5 rounded-full bg-popover px-3 text-xs shadow-popover">
      <ShieldQuestion className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />{toasts.length} waiting</Button>;
  }
  return <section aria-label={label} aria-live="polite" className="fixed bottom-4 right-4 z-[9990] w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover shadow-popover">
    <div className="flex items-center gap-2 border-b px-3 py-1.5">
      <ShieldQuestion className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <h2 className="min-w-0 flex-1 truncate text-[13px] font-medium">{label}</h2>
      <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground" aria-expanded aria-label="Collapse waiting requests" onClick={() => setCollapsed(true)}>
        <ChevronDown className="size-4" aria-hidden="true" /></Button>
    </div>
    <ul className="max-h-[50vh] divide-y overflow-y-auto">{toasts.map((toast) => <AttentionTrayRow key={toast.request.id} toast={toast}
      onRespond={(response) => respond(toast, response)} onOpen={() => open(toast)} onDismiss={() => dismiss(toast)} />)}</ul>
  </section>;
}
