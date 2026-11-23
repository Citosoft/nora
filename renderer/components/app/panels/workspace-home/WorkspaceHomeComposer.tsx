import { useState } from "react";
import { ArrowUp, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceHomeComposerProps } from "@/components/app/types/workspace-home/home.types";

/** Starts a thread from the home: what's typed here opens in a new draft, ready to send with a provider or bot picked. */
export function WorkspaceHomeComposer({ disabled, onStart }: WorkspaceHomeComposerProps) {
  const [text, setText] = useState("");
  const start = () => { onStart(text.trim() || undefined); setText(""); };
  return <form className="flex items-end gap-2 rounded-lg border bg-background p-2 shadow-sm focus-within:ring-2 focus-within:ring-ring"
    onSubmit={(event) => { event.preventDefault(); start(); }}>
    <textarea value={text} onChange={(event) => setText(event.target.value)} disabled={disabled} rows={1}
      aria-label="Describe a new thread" placeholder="What do you want to work on? Bring an idea, a bug, or a question…"
      onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); start(); } }}
      className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm [field-sizing:content] placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50" />
    <Button type="submit" disabled={disabled} className="h-9 shrink-0 gap-1.5" aria-label={text.trim() ? "Open as a new thread" : "New thread"}>
      {text.trim() ? <ArrowUp className="size-4" aria-hidden="true" /> : <MessageSquarePlus className="size-4" aria-hidden="true" />}{text.trim() ? "Start" : "New thread"}
    </Button>
  </form>;
}
