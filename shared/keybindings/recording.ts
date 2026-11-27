import { chordFromInput, formatAccelerator } from "@shared/keybindings/chord";
import type { KeyboardChordInput, KeybindingPlatform, KeyChordRecording } from "@shared/types/keybindings/keybindings.types";

const FUNCTION_KEY = /^F\d{1,2}$/;

/**
 * Interprets a keystroke while the user records a shortcut. Bare Escape cancels; other keys need a
 * modifier (except function keys) so a binding never swallows ordinary typing.
 */
export function recordKeyChord(input: KeyboardChordInput, platform: KeybindingPlatform): KeyChordRecording {
  const chord = chordFromInput(input, platform);
  if (!chord) return { kind: "pending" };
  const hasModifier = chord.cmdOrCtrl || chord.meta || chord.ctrl || chord.alt;
  if (chord.key === "Escape" && !hasModifier && !chord.shift) return { kind: "cancel" };
  if (!hasModifier && !FUNCTION_KEY.test(chord.key)) {
    return { kind: "invalid", reason: "Include Cmd, Ctrl or Alt, or use a function key." };
  }
  return { kind: "chord", accelerator: formatAccelerator(chord) };
}
