import { useCallback, useEffect, useRef, useState } from "react";

const COPIED_FEEDBACK_MS = 1_500;

/** Copies text and reports `copied` briefly so the trigger can confirm it. */
export function useCopyToClipboard(): { copied: boolean; copy: (text: string) => void } {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  const copy = useCallback((text: string): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    }, () => setCopied(false));
  }, []);

  return { copied, copy };
}
