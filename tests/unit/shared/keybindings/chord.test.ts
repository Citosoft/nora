import {
  chordFromInput,
  chordMatchesInput,
  formatAccelerator,
  formatChordLabel,
  keyboardInputForChord,
  normalizeAccelerator,
  parseKeyChord,
  toPlatformChord
} from "@shared/keybindings/chord";
import { recordKeyChord } from "@shared/keybindings/recording";
import type { KeyboardChordInput, KeyChord } from "@shared/types/keybindings/keybindings.types";
import assert from "node:assert/strict";
import test from "node:test";

const keystroke = (overrides: Partial<KeyboardChordInput>): KeyboardChordInput => ({
  key: "",
  code: "",
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides
});

function parsed(accelerator: string): KeyChord {
  const result = parseKeyChord(accelerator);
  assert.ok(result.ok, `Expected ${accelerator} to parse`);
  return result.chord;
}

test("accelerators parse case-insensitively with Electron modifier aliases", () => {
  assert.deepEqual(parsed("cmdorctrl+shift+k"), { cmdOrCtrl: true, meta: false, ctrl: false, alt: false, shift: true, key: "K" });
  assert.deepEqual(parsed("Command+Option+Return"), { cmdOrCtrl: false, meta: true, ctrl: false, alt: true, shift: false, key: "Enter" });
  assert.equal(parsed("Mod+ArrowUp").key, "Up");
  assert.equal(parsed("CmdOrCtrl+,").key, ",");
  assert.equal(parsed("F5").key, "F5");
});

test("malformed accelerators are rejected with a reason", () => {
  for (const accelerator of ["", "CmdOrCtrl+", "Shift+Shift+K", "Hyper+K", "CmdOrCtrl+Shift", "CmdOrCtrl+Banana"]) {
    const result = parseKeyChord(accelerator);
    assert.equal(result.ok, false, accelerator);
    if (!result.ok) assert.ok(result.reason.length > 0);
  }
});

test("formatting is canonical so equivalent spellings normalise to one accelerator", () => {
  assert.equal(normalizeAccelerator("shift+cmdorctrl+k"), "CmdOrCtrl+Shift+K");
  assert.equal(normalizeAccelerator("alt+ctrl+command+[ "), "Ctrl+Meta+Alt+[");
  assert.equal(normalizeAccelerator("nope+k"), null);
  assert.equal(formatAccelerator(parsed("CmdOrCtrl+Alt+Shift+Enter")), "CmdOrCtrl+Alt+Shift+Enter");
});

test("CmdOrCtrl becomes Cmd on macOS and Ctrl elsewhere", () => {
  const chord = parsed("CmdOrCtrl+K");
  assert.deepEqual(toPlatformChord(chord, "darwin"), { meta: true, ctrl: false, alt: false, shift: false, key: "K" });
  assert.deepEqual(toPlatformChord(chord, "win32"), { meta: false, ctrl: true, alt: false, shift: false, key: "K" });
  assert.deepEqual(toPlatformChord(chord, "linux"), { meta: false, ctrl: true, alt: false, shift: false, key: "K" });
});

test("matching is strict on modifiers and uses the physical key code", () => {
  const mac = toPlatformChord(parsed("CmdOrCtrl+Alt+,"), "darwin");
  // macOS Option turns "," into "≤"; the code still identifies the key.
  assert.equal(chordMatchesInput(mac, keystroke({ key: "≤", code: "Comma", metaKey: true, altKey: true })), true);
  assert.equal(chordMatchesInput(mac, keystroke({ key: "≤", code: "Comma", metaKey: true, altKey: true, shiftKey: true })), false);
  assert.equal(chordMatchesInput(mac, keystroke({ key: ",", code: "Comma", ctrlKey: true, altKey: true })), false);

  const brackets = toPlatformChord(parsed("CmdOrCtrl+Shift+["), "win32");
  assert.equal(chordMatchesInput(brackets, keystroke({ key: "{", code: "BracketLeft", ctrlKey: true, shiftKey: true })), true);

  // Without a known code (synthetic events), the key name is used.
  const letter = toPlatformChord(parsed("CmdOrCtrl+W"), "darwin");
  assert.equal(chordMatchesInput(letter, keystroke({ key: "w", metaKey: true })), true);
});

test("a chord's synthetic keystroke matches the chord", () => {
  for (const accelerator of ["CmdOrCtrl+W", "Ctrl+Shift+Enter", "Alt+F4", "CmdOrCtrl+/"]) {
    const chord = toPlatformChord(parsed(accelerator), "darwin");
    assert.equal(chordMatchesInput(chord, keyboardInputForChord(chord)), true, accelerator);
  }
});

test("labels use symbols on macOS and words elsewhere", () => {
  const chord = parsed("CmdOrCtrl+Shift+K");
  assert.equal(formatChordLabel(toPlatformChord(chord, "darwin"), "darwin"), "⇧⌘K");
  assert.equal(formatChordLabel(toPlatformChord(chord, "win32"), "win32"), "Ctrl + Shift + K");
  assert.equal(formatChordLabel(toPlatformChord(parsed("CmdOrCtrl+Enter"), "darwin"), "darwin"), "⌘↵");
});

test("recorded keystrokes store the platform's primary modifier as CmdOrCtrl", () => {
  assert.deepEqual(chordFromInput(keystroke({ key: "k", code: "KeyK", metaKey: true, shiftKey: true }), "darwin"),
    { cmdOrCtrl: true, meta: false, ctrl: false, alt: false, shift: true, key: "K" });
  assert.deepEqual(chordFromInput(keystroke({ key: "k", code: "KeyK", ctrlKey: true }), "linux"),
    { cmdOrCtrl: true, meta: false, ctrl: false, alt: false, shift: false, key: "K" });
  assert.equal(chordFromInput(keystroke({ key: "Shift", code: "ShiftLeft", shiftKey: true }), "darwin"), null);
});

test("recording cancels on Escape, waits on modifiers, and requires a modifier or function key", () => {
  assert.deepEqual(recordKeyChord(keystroke({ key: "Escape", code: "Escape" }), "darwin"), { kind: "cancel" });
  assert.deepEqual(recordKeyChord(keystroke({ key: "Meta", code: "MetaLeft", metaKey: true }), "darwin"), { kind: "pending" });
  assert.equal(recordKeyChord(keystroke({ key: "k", code: "KeyK" }), "darwin").kind, "invalid");
  assert.equal(recordKeyChord(keystroke({ key: "K", code: "KeyK", shiftKey: true }), "darwin").kind, "invalid");
  assert.deepEqual(recordKeyChord(keystroke({ key: "F6", code: "F6" }), "win32"), { kind: "chord", accelerator: "F6" });
  assert.deepEqual(recordKeyChord(keystroke({ key: "p", code: "KeyP", ctrlKey: true, altKey: true }), "win32"),
    { kind: "chord", accelerator: "CmdOrCtrl+Alt+P" });
});
