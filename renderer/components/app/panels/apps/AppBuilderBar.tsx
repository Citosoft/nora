import { useEffect, useRef, useState } from "react";
import { MessageSquare, PanelRightClose, Sparkles } from "lucide-react";
import type { AppBuilderBarProps } from "@/components/app/types/appsBuilder.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** One line under the app for the next change, the builder's suggested changes as chips, and the switch that slides the full chat in and out. */
export function AppBuilderBar({ busy, threadOpen, draft, suggestions, onSend, onToggleThread }: AppBuilderBarProps) {
  const [text, setText] = useState("");
  const input = useRef<HTMLInputElement>(null);
  // A picked card replaces whatever was typed: the user chose where the change goes, and now says what it is.
  useEffect(() => { if (draft) { setText(draft.text); input.current?.focus(); } }, [draft]);
  const submit = (): void => { if (!text.trim() || busy) return; onSend(text); setText(""); };
  return <div className="shrink-0 border-t border-border/60 bg-card/80 backdrop-blur">
    {suggestions.length > 0 && !busy && <ul className="flex flex-wrap items-center gap-1.5 px-4 pt-2.5" aria-label="Suggested changes">
      {suggestions.map((suggestion) => <li key={suggestion}>
        <button type="button" onClick={() => onSend(suggestion)}
          className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {suggestion}</button></li>)}
    </ul>}
    <form className="flex items-center gap-2 px-4 py-2.5" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
      <Input ref={input} aria-label="Ask for a change" placeholder={busy ? "Nora is working on your app…" : "Ask for a change, or click a card to change that one…"} value={text}
        onChange={(event) => setText(event.target.value)} disabled={busy} className="h-9 flex-1 border-transparent bg-transparent text-sm shadow-none focus-visible:border-border" />
      <Button type="submit" size="sm" disabled={!text.trim() || busy}>Change</Button>
      <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" aria-pressed={threadOpen} aria-label={threadOpen ? "Hide chat" : "Show chat"} onClick={onToggleThread}>
        {threadOpen ? <PanelRightClose className="size-4" aria-hidden="true" /> : <MessageSquare className="size-4" aria-hidden="true" />}{threadOpen ? "Hide chat" : "Chat"}</Button>
    </form>
  </div>;
}
