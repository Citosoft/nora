import { flushSync } from "react-dom";
import { useLayoutEffect, useRef, useState } from "react";
import { createComposerDraftBuffer } from "@/components/app/logic/composerDraftBuffer";

export function useComposerDraft(value: string, onChange: (text: string) => void) {
  const [text, setText] = useState(value);
  const publish = useRef(onChange);
  useLayoutEffect(() => { publish.current = onChange; }, [onChange]);
  const [buffer] = useState(() => createComposerDraftBuffer({ value, publish: (next) => publish.current(next), display: setText }));
  useLayoutEffect(() => { buffer.receive(value); }, [buffer, value]);
  useLayoutEffect(() => {
    // Commit before pointer activation so Send sees the latest draft, even within the debounce window.
    const activate = (): void => { flushSync(() => buffer.flush()); };
    const save = (): void => buffer.flush();
    window.addEventListener("pointerdown", activate, true);
    window.addEventListener("blur", save);
    window.addEventListener("pagehide", save);
    return () => {
      window.removeEventListener("pointerdown", activate, true);
      window.removeEventListener("blur", save);
      window.removeEventListener("pagehide", save);
      buffer.dispose();
    };
  }, [buffer]);
  return { text, change: buffer.edit, flush: buffer.flush };
}
