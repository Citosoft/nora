import type {
  Accelerator,
  KeyboardChordInput,
  KeyChord,
  KeyChordParseResult,
  KeybindingPlatform,
  PlatformKeyChord
} from "@shared/types/keybindings/keybindings.types";

type ModifierName = "cmdOrCtrl" | "meta" | "ctrl" | "alt" | "shift";

const MODIFIER_ALIASES: Readonly<Record<string, ModifierName>> = {
  cmdorctrl: "cmdOrCtrl",
  commandorcontrol: "cmdOrCtrl",
  mod: "cmdOrCtrl",
  cmd: "meta",
  command: "meta",
  meta: "meta",
  super: "meta",
  ctrl: "ctrl",
  control: "ctrl",
  alt: "alt",
  option: "alt",
  shift: "shift"
};

/** Canonical key token -> `KeyboardEvent.code` of the physical key that produces it on a US layout. */
const KEY_CODES: Readonly<Record<string, string>> = {
  ...Object.fromEntries("ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => [letter, `Key${letter}`])),
  ...Object.fromEntries("0123456789".split("").map((digit) => [digit, `Digit${digit}`])),
  ...Object.fromEntries(Array.from({ length: 24 }, (_, index) => [`F${index + 1}`, `F${index + 1}`])),
  ",": "Comma",
  ".": "Period",
  "/": "Slash",
  ";": "Semicolon",
  "'": "Quote",
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  "-": "Minus",
  "=": "Equal",
  "`": "Backquote",
  Enter: "Enter",
  Escape: "Escape",
  Tab: "Tab",
  Space: "Space",
  Backspace: "Backspace",
  Delete: "Delete",
  Up: "ArrowUp",
  Down: "ArrowDown",
  Left: "ArrowLeft",
  Right: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown"
};

const KEY_BY_CODE: ReadonlyMap<string, string> = new Map(Object.entries(KEY_CODES).map(([key, code]) => [code, key]));

const KEY_BY_LOWERCASE: ReadonlyMap<string, string> = new Map(Object.keys(KEY_CODES).map((key) => [key.toLowerCase(), key]));

/** Accelerator spellings (Electron's and DOM `key` names) that differ from the canonical token. */
const KEY_ALIASES: Readonly<Record<string, string>> = {
  return: "Enter",
  esc: "Escape",
  del: "Delete",
  arrowup: "Up",
  arrowdown: "Down",
  arrowleft: "Left",
  arrowright: "Right",
  " ": "Space",
  comma: ",",
  period: ".",
  slash: "/"
};

const MODIFIER_KEYS: ReadonlySet<string> = new Set(["Meta", "Control", "Alt", "Shift", "OS", "AltGraph", "CapsLock", "Fn"]);

function canonicalKey(token: string): string | null {
  const lower = token.toLowerCase();
  return KEY_ALIASES[lower] ?? KEY_BY_LOWERCASE.get(lower) ?? null;
}

/** Parses an Electron-style accelerator (`CmdOrCtrl+Shift+K`). Modifier and key names are case-insensitive. */
export function parseKeyChord(accelerator: string): KeyChordParseResult {
  const parts = accelerator.split("+").map((part) => part.trim());
  if (parts.length === 0 || parts.some((part) => part.length === 0)) {
    return { ok: false, reason: "Use modifiers and one key joined by +, for example CmdOrCtrl+Shift+K." };
  }
  const chord: KeyChord = { cmdOrCtrl: false, meta: false, ctrl: false, alt: false, shift: false, key: "" };
  for (const part of parts.slice(0, -1)) {
    const modifier = MODIFIER_ALIASES[part.toLowerCase()];
    if (!modifier) return { ok: false, reason: `"${part}" is not a modifier.` };
    if (chord[modifier]) return { ok: false, reason: `"${part}" appears twice.` };
    chord[modifier] = true;
  }
  const lastPart = parts[parts.length - 1] ?? "";
  if (MODIFIER_ALIASES[lastPart.toLowerCase()]) return { ok: false, reason: "A shortcut needs a key after its modifiers." };
  const key = canonicalKey(lastPart);
  if (!key) return { ok: false, reason: `"${lastPart}" is not a supported key.` };
  return { ok: true, chord: { ...chord, key } };
}

/** Formats a chord as a canonical accelerator: modifiers in a fixed order, then the key. */
export function formatAccelerator(chord: KeyChord): Accelerator {
  const parts: string[] = [];
  if (chord.cmdOrCtrl) parts.push("CmdOrCtrl");
  if (chord.ctrl) parts.push("Ctrl");
  if (chord.meta) parts.push("Meta");
  if (chord.alt) parts.push("Alt");
  if (chord.shift) parts.push("Shift");
  parts.push(chord.key);
  return parts.join("+");
}

/** Canonical form of an accelerator, or `null` when it does not parse. */
export function normalizeAccelerator(accelerator: string): Accelerator | null {
  const parsed = parseKeyChord(accelerator);
  return parsed.ok ? formatAccelerator(parsed.chord) : null;
}

export function toPlatformChord(chord: KeyChord, platform: KeybindingPlatform): PlatformKeyChord {
  const isMac = platform === "darwin";
  return {
    meta: chord.meta || (chord.cmdOrCtrl && isMac),
    ctrl: chord.ctrl || (chord.cmdOrCtrl && !isMac),
    alt: chord.alt,
    shift: chord.shift,
    key: chord.key
  };
}

/** Identity of a concrete chord, for equality checks across differently spelled accelerators. */
export function platformChordSignature(chord: PlatformKeyChord): string {
  return [chord.meta ? "meta" : "", chord.ctrl ? "ctrl" : "", chord.alt ? "alt" : "", chord.shift ? "shift" : "", chord.key].join("|");
}

/**
 * The key token a keystroke produced. The physical `code` wins so Alt/Shift-altered characters
 * (macOS Option+, gives "≤") and non-US layouts still match the key the chord names.
 */
export function keyTokenFromInput(input: Pick<KeyboardChordInput, "key" | "code">): string | null {
  const fromCode = KEY_BY_CODE.get(input.code);
  if (fromCode) return fromCode;
  if (MODIFIER_KEYS.has(input.key)) return null;
  return canonicalKey(input.key);
}

export function chordMatchesInput(chord: PlatformKeyChord, input: KeyboardChordInput): boolean {
  return (
    input.metaKey === chord.meta &&
    input.ctrlKey === chord.ctrl &&
    input.altKey === chord.alt &&
    input.shiftKey === chord.shift &&
    keyTokenFromInput(input) === chord.key
  );
}

/**
 * Builds a portable chord from a recorded keystroke: the platform's primary modifier (Cmd on macOS,
 * Ctrl elsewhere) is stored as `CmdOrCtrl`. Returns `null` while only modifiers are held.
 */
export function chordFromInput(input: KeyboardChordInput, platform: KeybindingPlatform): KeyChord | null {
  const key = keyTokenFromInput(input);
  if (!key) return null;
  const isMac = platform === "darwin";
  return {
    cmdOrCtrl: isMac ? input.metaKey : input.ctrlKey,
    meta: isMac ? false : input.metaKey,
    ctrl: isMac ? input.ctrlKey : false,
    alt: input.altKey,
    shift: input.shiftKey,
    key
  };
}

/** A synthetic keystroke that `chordMatchesInput` accepts, for re-dispatching chords the native menu swallows. */
export function keyboardInputForChord(chord: PlatformKeyChord): KeyboardChordInput {
  return {
    key: chord.key.length === 1 ? chord.key.toLowerCase() : chord.key,
    code: KEY_CODES[chord.key] ?? "",
    metaKey: chord.meta,
    ctrlKey: chord.ctrl,
    altKey: chord.alt,
    shiftKey: chord.shift
  };
}

const MAC_KEY_LABELS: Readonly<Record<string, string>> = {
  Enter: "↵",
  Escape: "⎋",
  Tab: "⇥",
  Space: "Space",
  Backspace: "⌫",
  Delete: "⌦",
  Up: "↑",
  Down: "↓",
  Left: "←",
  Right: "→"
};

/** Display parts for a chord, for example `["⌘", "⇧", "K"]` on macOS or `["Ctrl", "Shift", "K"]` elsewhere. */
export function formatChordParts(chord: PlatformKeyChord, platform: KeybindingPlatform): string[] {
  if (platform === "darwin") {
    return [
      ...(chord.ctrl ? ["⌃"] : []),
      ...(chord.alt ? ["⌥"] : []),
      ...(chord.shift ? ["⇧"] : []),
      ...(chord.meta ? ["⌘"] : []),
      MAC_KEY_LABELS[chord.key] ?? chord.key
    ];
  }
  return [
    ...(chord.ctrl ? ["Ctrl"] : []),
    ...(chord.meta ? [platform === "win32" ? "Win" : "Super"] : []),
    ...(chord.alt ? ["Alt"] : []),
    ...(chord.shift ? ["Shift"] : []),
    chord.key
  ];
}

export function formatChordLabel(chord: PlatformKeyChord, platform: KeybindingPlatform): string {
  return formatChordParts(chord, platform).join(platform === "darwin" ? "" : " + ");
}

export function keybindingPlatformFrom(platform: string): KeybindingPlatform {
  return platform === "darwin" || platform === "win32" ? platform : "linux";
}
