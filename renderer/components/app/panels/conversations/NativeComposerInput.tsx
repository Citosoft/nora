import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { insertComposerToken } from "@/components/app/logic/composerTokens";
import { ComposerSuggestionList } from "./ComposerSuggestionList";
import { useComposerSuggestions } from "@/components/app/hooks/useComposerSuggestions";
import type { ComposerSuggestionOption } from "@/components/app/types/composerInput.types";
import { ComposerEditor } from "./ComposerEditor";
import { composerKeyAction, visiblePromptSuggestion } from "@/components/app/logic/promptSuggestion";
import type { NativeComposerInputProps } from "@/components/app/types/composerInput.types";

export function NativeComposerInput({ inputRef, value, disabled, placeholder, suggestion, onChange, onSubmit, onFiles, trailingAction, mentions, issueSource }: NativeComposerInputProps) {
  const id = useId();
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);
  const acceptedText = useRef<string | null>(null);
  const ghost = visiblePromptSuggestion(suggestion, value, disabled, dismissedRunId);
  const [caret, setCaret] = useState(value.length);
  const [dismissedMention, setDismissedMention] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const pendingCaret = useRef<number | null>(null);
  const suggestions = useComposerSuggestions({ value, caret, disabled, mentions, issueSource });
  const mention = suggestions.token;
  const open = !!mention && dismissedMention !== `${mention.trigger}:${mention.start}`;
  const matches = open ? suggestions.options : [];
  const listId = `${id}-mentions`;
  useEffect(() => { setActiveIndex(0); }, [mention?.trigger, mention?.start, mention?.query]);
  useLayoutEffect(() => {
    if (acceptedText.current === value) inputRef.current?.setSelectionRange(value.length, value.length);
    acceptedText.current = null;
    if (pendingCaret.current !== null) { inputRef.current?.setSelectionRange(pendingCaret.current, pendingCaret.current); pendingCaret.current = null; }
  }, [inputRef, value]);
  const pick = (option: ComposerSuggestionOption): void => {
    if (!mention) return;
    const next = insertComposerToken(value, mention, caret, option.insertText ?? `@${option.name}`);
    dismiss(); setDismissedMention(`${mention.trigger}:${mention.start}`);
    pendingCaret.current = next.caret; setCaret(next.caret); onChange(next.text); inputRef.current?.focus();
  };
  const dismiss = (): void => { if (suggestion) setDismissedRunId(suggestion.runId); };
  return <div className="relative">
    <span id={`${id}-label`} className="sr-only">Message Nora</span>
    {trailingAction}
    <ComposerEditor mentions={mentions} inputRef={inputRef} id={id} className={`min-h-24 max-h-72 resize-y px-2 ${trailingAction ? "pr-10" : ""}`} value={value} disabled={disabled}
      aria-labelledby={`${id}-label`}
      aria-describedby={ghost ? `${id}-suggestion` : undefined} placeholder={ghost ? "" : placeholder}
      aria-autocomplete={mentions?.length || issueSource ? "list" : undefined} aria-expanded={mentions?.length || issueSource ? open : undefined}
      aria-controls={open ? listId : undefined} aria-activedescendant={matches.length ? `${listId}-${Math.min(activeIndex, matches.length - 1)}` : undefined}
      onCaretChange={setCaret}
      onFiles={onFiles ? (files) => { dismiss(); onFiles(files); } : undefined}
      onValueChange={(text, position) => { acceptedText.current = null; dismiss(); setCaret(position); setDismissedMention(null); onChange(text); }}
      onKeyDown={(event) => {
        // While suggestions are open, navigation and choosing keys belong to them rather than sending.
        if (open && !event.nativeEvent.isComposing) {
          if (suggestions.loading && event.key === "Enter" && !event.shiftKey) { event.preventDefault(); return; }
          if (matches.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setActiveIndex((index) => (index + (event.key === "ArrowDown" ? 1 : matches.length - 1)) % matches.length);
            return;
          }
          if (matches.length && (event.key === "Enter" || event.key === "Tab") && !event.shiftKey) { event.preventDefault(); pick(matches[Math.min(activeIndex, matches.length - 1)]); return; }
          if (event.key === "Escape") { event.preventDefault(); if (mention) setDismissedMention(`${mention.trigger}:${mention.start}`); return; }
        }
        const action = composerKeyAction({ key: event.key, shiftKey: event.shiftKey, altKey: event.altKey, ctrlKey: event.ctrlKey,
          metaKey: event.metaKey, composing: event.nativeEvent.isComposing || event.keyCode === 229, hasSuggestion: !!ghost });
        if (!action) return;
        event.preventDefault();
        if (action === "accept-suggestion" && ghost) { acceptedText.current = ghost.text; dismiss(); onChange(ghost.text); }
        else if (action === "dismiss-suggestion") dismiss();
        else if (action === "submit") onSubmit();
      }} />
    {open && <ComposerSuggestionList label={suggestions.label} message={suggestions.message} loading={suggestions.loading} onRetry={suggestions.retry} id={listId} options={matches} activeIndex={Math.min(activeIndex, matches.length - 1)} onPick={pick} onHover={setActiveIndex} />}
    {ghost && <>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-2 py-2 text-sm text-muted-foreground/60 ${trailingAction ? "pr-10" : ""}`}>
        {ghost.text}<kbd className="ml-2 inline-flex rounded border border-border/70 px-1 py-0.5 align-middle font-sans text-[10px] leading-none text-muted-foreground">Tab</kbd>
      </div>
      <span id={`${id}-suggestion`} role="status" className="sr-only">Suggested follow-up: {ghost.text} Press Tab to use this draft, or Escape to dismiss.</span>
    </>}
  </div>;
}
