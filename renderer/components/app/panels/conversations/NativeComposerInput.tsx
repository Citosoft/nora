import { useId, useLayoutEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { composerKeyAction, visiblePromptSuggestion } from "@/components/app/logic/promptSuggestion";
import type { NativeComposerInputProps } from "@/components/app/types/composerInput.types";

export function NativeComposerInput({ inputRef, value, disabled, placeholder, suggestion, onChange, onSubmit }: NativeComposerInputProps) {
  const id = useId();
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);
  const acceptedText = useRef<string | null>(null);
  const ghost = visiblePromptSuggestion(suggestion, value, disabled, dismissedRunId);
  useLayoutEffect(() => {
    if (acceptedText.current === value) inputRef.current?.setSelectionRange(value.length, value.length);
    acceptedText.current = null;
  }, [inputRef, value]);
  const dismiss = (): void => { if (suggestion) setDismissedRunId(suggestion.runId); };
  return <div className="relative">
    <label htmlFor={id} className="sr-only">Message Nora</label>
    <Textarea ref={inputRef} id={id} variant="embedded" className="min-h-24 max-h-72 resize-y px-2" value={value} disabled={disabled}
      aria-describedby={ghost ? `${id}-suggestion` : undefined} placeholder={ghost ? "" : placeholder}
      onChange={(event) => { acceptedText.current = null; dismiss(); onChange(event.target.value); }}
      onKeyDown={(event) => {
        const action = composerKeyAction({ key: event.key, shiftKey: event.shiftKey, altKey: event.altKey, ctrlKey: event.ctrlKey,
          metaKey: event.metaKey, composing: event.nativeEvent.isComposing || event.keyCode === 229, hasSuggestion: !!ghost });
        if (!action) return;
        event.preventDefault();
        if (action === "accept-suggestion" && ghost) { acceptedText.current = ghost.text; dismiss(); onChange(ghost.text); }
        else if (action === "dismiss-suggestion") dismiss();
        else if (action === "submit") onSubmit();
      }} />
    {ghost && <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-2 py-2 text-sm text-muted-foreground/60">
        {ghost.text}<kbd className="ml-2 inline-flex rounded border border-border/70 px-1 py-0.5 align-middle font-sans text-[10px] leading-none text-muted-foreground">Tab</kbd>
      </div>
      <span id={`${id}-suggestion`} role="status" className="sr-only">Suggested follow-up: {ghost.text} Press Tab to use this draft, or Escape to dismiss.</span>
    </>}
  </div>;
}
