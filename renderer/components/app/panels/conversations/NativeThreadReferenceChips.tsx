import { MessagesSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NativeThreadReferenceChipsProps } from "@/components/app/types/threadReferences.types";

export function NativeThreadReferenceChips({ references, disabled, onRemove }: NativeThreadReferenceChipsProps) {
  if (!references.length) return null;
  return <ul aria-label="Referenced chats" className="flex flex-wrap gap-2">
      {references.map((reference) => <li key={reference.id} className="flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-muted/40 py-1 pl-2 pr-1 text-xs"
        title={`${reference.title} · Snapshot captured ${new Date(reference.capturedAt).toLocaleString()}`}>
        <MessagesSquare className="size-3.5 shrink-0" aria-hidden="true" /><span className="max-w-48 truncate">{reference.title}</span>
        <Button type="button" variant="ghost" size="icon" className="size-5 shrink-0" disabled={disabled}
          aria-label={`Remove referenced chat ${reference.title}`} onClick={() => onRemove(reference.id)}><X className="size-3" aria-hidden="true" /></Button>
      </li>)}
  </ul>;
}
