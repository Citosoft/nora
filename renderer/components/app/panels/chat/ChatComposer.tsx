import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeComposerInput } from "@/components/app/panels/conversations/NativeComposerInput";
import type { ChatComposerProps } from "@/components/app/types/chatPanels.types";

/** A messaging-app composer: just the message, Send (or Stop) and, for a direct chat, where it works. */
export function ChatComposer({ inputRef, value, placeholder, disabled, canSend, stop, sendLabel, mentions, footer, onChange, onSubmit }: ChatComposerProps) {
  return <form className="rounded-2xl border bg-card px-3 pb-2 pt-3 shadow-sm focus-within:ring-1 focus-within:ring-ring/30"
    onSubmit={(event) => { event.preventDefault(); if (canSend) onSubmit(); }}>
    <div className="flex items-end gap-2">
      <div className="min-w-0 flex-1">
        <NativeComposerInput inputRef={inputRef} value={value} disabled={disabled} placeholder={placeholder} suggestion={null}
          onChange={onChange} onSubmit={() => { if (canSend) onSubmit(); }} mentions={mentions} />
      </div>
      {stop ? <Button type="button" size="icon" className="size-8 shrink-0 rounded-full" disabled={stop.disabled} aria-label={stop.label} onClick={stop.onStop}>
          <Square className="size-3 fill-current" aria-hidden="true" /></Button>
        : <Button type="submit" size="icon" className="size-8 shrink-0 rounded-full" disabled={!canSend} aria-label={sendLabel}>
          <ArrowUp className="size-4" aria-hidden="true" /></Button>}
    </div>
    {footer && <div className="mt-1 flex min-w-0 items-center">{footer}</div>}
  </form>;
}
