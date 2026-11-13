import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { activeMention, insertMention, matchMentions } from "@/components/app/logic/composerMentions";
import { ComposerMentionList } from "./ComposerMentionList";
import type { ComposerMentionOption } from "@/components/app/types/composerInput.types";
import { Textarea } from "@/components/ui/textarea";
import { composerKeyAction, visiblePromptSuggestion } from "@/components/app/logic/promptSuggestion";
import type { NativeComposerInputProps } from "@/components/app/types/composerInput.types";

export function NativeComposerInput({ inputRef, value, disabled, placeholder, suggestion, onChange, onSubmit, onFiles, trailingAction, mentions }: NativeComposerInputProps) {
  const id = useId();
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);
  const acceptedText = useRef<string | null>(null);
  const ghost = visiblePromptSuggestion(suggestion, value, disabled, dismissedRunId);
  const [caret, setCaret] = useState(value.length);
  const [dismissedMention, setDismissedMention] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pendingCaret = useRef<number | null>(null);
  const mention = mentions?.length && !disabled ? activeMention(value, caret) : null;
  const matches = mention && mentions && dismissedMention !== mention.start ? matchMentions(mentions, mention.query) : [];
  const listId = `${id}-mentions`;
  useEffect(() => { setActiveIndex(0); }, [mention?.start, mention?.query]);
  useLayoutEffect(() => {
    if (acceptedText.current === value) inputRef.current?.setSelectionRange(value.length, value.length);
    acceptedText.current = null;
    if (pendingCaret.current !== null) { inputRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current); pendingCaret.current = null; }
  }, [inputRef, value]);
  const pick = (option: ComposerMentionOption): void => {
    if (!mention) return;
    const next = insertMention(value, mention, caret, option.name);
    pendingCaret.current = next.caret; setCaret(next.caret); onChange(next.text);
  };
  const trackCaret = (element: HTMLTextAreaElement): void => setCaret(element.selectionStart);
  const dismiss = (): void => { if (suggestion) setDismissedRunId(suggestion.runId); };
  return <div className="relative">
    <label htmlFor={id} className="sr-only">Message Nora</label>
    {trailingAction}
    <Textarea ref={inputRef} id={id} variant="embedded" className={`min-h-24 max-h-72 resize-y px-2 ${trailingAction ? "pr-10" : ""}`} value={value} disabled={disabled}
      aria-describedby={ghost ? `${id}-suggestion` : undefined} placeholder={ghost ? "" : placeholder}
      aria-autocomplete={mentions?.length ? "list" : undefined} aria-expanded={mentions?.length ? matches.length > 0 : undefined}
      aria-controls={matches.length ? listId : undefined} aria-activedescendant={matches.length ? `${listId}-${activeIndex}` : undefined}
      onSelect={(event) => trackCaret(event.currentTarget)}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.files);
        if (!disabled && onFiles && files.length) { event.preventDefault(); dismiss(); onFiles(files); }
      }}
      onChange={(event) => { acceptedText.current = null; dismiss(); trackCaret(event.target); setDismissedMention(null); onChange(event.target.value); }}
      onKeyDown={(event) => {
        // While suggestions are open, navigation and choosing keys belong to them rather than sending.
        if (matches.length && !event.nativeEvent.isComposing) {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
            return;
          }
          if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) { event.preventDefault(); pick(matches[Math.min(activeIndex, matches.length - 1)]); return; }
          if (event.key === "Escape") { event.preventDefault(); if (mention) setDismissedMention(mention.start); return; }
        }
        const action = composerKeyAction({ key: event.key, shiftKey: event.shiftKey, altKey: event.altKey, ctrlKey: event.ctrlKey,
          metaKey: event.metaKey, composing: event.nativeEvent.isComposing || event.keyCode === 229, hasSuggestion: !!ghost });
        if (!action) return;
        event.preventDefault();
        if (action === "accept-suggestion" && ghost) { acceptedText.current = ghost.text; dismiss(); onChange(ghost.text); }
        else if (action === "dismiss-suggestion") dismiss();
        else if (action === "submit") onSubmit();
      }} />
    {matches.length > 0 && <ComposerMentionList id={listId} options={matches} activeIndex={Math.min(activeIndex, matches.length - 1)} onPick={pick} onHover={setActiveIndex} />}
    {ghost && <>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-2 py-2 text-sm text-muted-foreground/60 ${trailingAction ? "pr-10" : ""}`}>
        {ghost.text}<kbd className="ml-2 inline-flex rounded border border-border/70 px-1 py-0.5 align-middle font-sans text-[10px] leading-none text-muted-foreground">Tab</kbd>
      </div>
      <span id={`${id}-suggestion`} role="status" className="sr-only">Suggested follow-up: {ghost.text} Press Tab to use this draft, or Escape to dismiss.</span>
    </>}
  </div>;
}
