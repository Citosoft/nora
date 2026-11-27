import { chordMatchesInput, formatChordLabel, formatChordParts, parseKeyChord, toPlatformChord } from "@shared/keybindings/chord";
import type { Accelerator, KeybindingPlatform, KeyboardChordInput, ResolvedKeybinding } from "@shared/types/keybindings/keybindings.types";

export function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}

/** Whether a keystroke triggers `binding`: its chord matches and, unless allowed, focus is not in a text field. */
export function keybindingMatchesEvent(
  binding: ResolvedKeybinding | undefined,
  event: KeyboardChordInput & { target?: EventTarget | null }
): boolean {
  if (!binding?.chord || !chordMatchesInput(binding.chord, event)) return false;
  return binding.allowInEditable || !isEditableEventTarget(event.target ?? null);
}

export function formatKeybindingLabel(binding: ResolvedKeybinding | undefined, platform: KeybindingPlatform): string | null {
  return binding?.chord ? formatChordLabel(binding.chord, platform) : null;
}

export function formatKeybindingParts(binding: ResolvedKeybinding | undefined, platform: KeybindingPlatform): string[] {
  return binding?.chord ? formatChordParts(binding.chord, platform) : [];
}

export function formatAcceleratorLabel(accelerator: Accelerator | null, platform: KeybindingPlatform): string | null {
  const parsed = accelerator === null ? null : parseKeyChord(accelerator);
  return parsed?.ok ? formatChordLabel(toPlatformChord(parsed.chord, platform), platform) : null;
}
