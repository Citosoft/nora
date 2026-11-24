import { useVoiceInput } from "@/components/app/hooks/useVoiceInput";
import { appendVoiceTranscript } from "@/components/app/logic/voiceInputDraft";
import type { ComposerVoiceInputOptions, VoiceInputControl } from "@/components/app/types/voiceInput.types";
import { useLayoutEffect, useRef } from "react";

/** Voice input that appends each transcript to a composer draft and returns focus to the editor. */
export function useComposerVoiceInput({ value, disabled, inputRef, onChange }: ComposerVoiceInputOptions): VoiceInputControl {
  const draft = useRef(value);
  useLayoutEffect(() => { draft.current = value; }, [value]);
  return useVoiceInput({
    disabled,
    onTranscript: (transcript) => {
      onChange(appendVoiceTranscript(draft.current, transcript));
      inputRef.current?.focus();
    }
  });
}
