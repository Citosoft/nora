import { recordKeyChord } from "@shared/keybindings/recording";
import type { Accelerator, KeybindingPlatform } from "@shared/types/keybindings/keybindings.types";
import { useEffect, useState } from "react";

/**
 * Captures the next chord while `recording`. Listens on the window in the capture phase so the keystroke
 * never reaches app shortcuts (including the ⌘W the main process re-dispatches to the window).
 */
export function useKeyChordRecorder(args: {
  recording: boolean;
  platform: KeybindingPlatform;
  onRecorded: (accelerator: Accelerator) => void;
  onCancel: () => void;
}): string | null {
  const { recording, platform, onRecorded, onCancel } = args;
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) {
      setHint(null);
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const result = recordKeyChord(event, platform);
      if (result.kind === "cancel") onCancel();
      else if (result.kind === "chord") onRecorded(result.accelerator);
      else if (result.kind === "invalid") setHint(result.reason);
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onCancel, onRecorded, platform, recording]);

  return hint;
}
