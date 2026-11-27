import type {
  KEYBINDING_COMMAND_IDS,
  NAVIGATION_KEYBINDING_COMMAND_IDS,
  SURFACE_KEYBINDING_COMMAND_IDS,
  WORKBENCH_KEYBINDING_COMMAND_IDS
} from "@shared/keybindings/commandIds";

export type KeybindingPlatform = "darwin" | "win32" | "linux";

export type KeybindingCommandId = (typeof KEYBINDING_COMMAND_IDS)[number];
export type WorkbenchKeybindingCommandId = (typeof WORKBENCH_KEYBINDING_COMMAND_IDS)[number];
export type NavigationKeybindingCommandId = (typeof NAVIGATION_KEYBINDING_COMMAND_IDS)[number];
export type SurfaceKeybindingCommandId = (typeof SURFACE_KEYBINDING_COMMAND_IDS)[number];

/**
 * Where a command listens. Workbench commands fire anywhere in the window, so they clash with every other
 * binding on the same chord; surface scopes only clash with commands in the same scope.
 */
export type KeybindingScope = "workbench" | "editor" | "composer" | "form" | "terminal";

export type KeybindingCategory = "Workbench" | "Navigation" | "Workspaces" | "Editing" | "Terminal" | "Help";

/**
 * A key chord in Electron accelerator syntax, for example `CmdOrCtrl+Shift+K`.
 * Stored and exchanged as text; parse with `parseKeyChord`.
 */
export type Accelerator = string;

/** A parsed, platform-portable chord. `cmdOrCtrl` becomes Cmd on macOS and Ctrl elsewhere. */
export type KeyChord = {
  cmdOrCtrl: boolean;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  /** Canonical key token, for example `K`, `1`, `[`, `Enter` or `F5`. */
  key: string;
};

/** A chord with `cmdOrCtrl` folded into the concrete modifier for one platform. */
export type PlatformKeyChord = {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
};

export type KeyChordParseResult = { ok: true; chord: KeyChord } | { ok: false; reason: string };

/** The subset of a DOM `KeyboardEvent` (or Electron `Input`) needed to match chords. */
export type KeyboardChordInput = {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

export type KeybindingCommandDefinition = {
  id: KeybindingCommandId;
  title: string;
  description: string;
  category: KeybindingCategory;
  scope: KeybindingScope;
  /** Default on every platform; `null` ships the command unbound. */
  defaultAccelerator: Accelerator | null;
  /** Per-platform default that replaces `defaultAccelerator` on that platform. */
  platformDefaults?: Partial<Record<KeybindingPlatform, Accelerator | null>>;
  /** Fire even when focus is in a text field. */
  allowInEditable?: boolean;
};

/** A user override for one command: a chord, or `null` to unbind it. */
export type KeybindingOverride = Accelerator | null;

export type KeybindingOverrideMap = Partial<Record<KeybindingCommandId, KeybindingOverride>>;

/** Persisted user keybindings (`config/keybindings.json`). Only differences from the defaults are stored. */
export type KeybindingsFile = {
  version: 1;
  /** Overrides for every platform. */
  overrides: KeybindingOverrideMap;
  /** Overrides for one platform; they win over `overrides`. */
  platformOverrides: Partial<Record<KeybindingPlatform, KeybindingOverrideMap>>;
};

export type KeybindingSource = "default" | "user" | "user-platform";

export type ResolvedKeybinding = {
  commandId: KeybindingCommandId;
  scope: KeybindingScope;
  allowInEditable: boolean;
  /** Effective accelerator, or `null` when unbound. */
  accelerator: Accelerator | null;
  chord: PlatformKeyChord | null;
  defaultAccelerator: Accelerator | null;
  source: KeybindingSource;
};

export type KeybindingConflict = {
  platform: KeybindingPlatform;
  /** Accelerator of the clashing chord, as bound by the first command. */
  accelerator: Accelerator;
  commandIds: KeybindingCommandId[];
};

export type KeybindingUpdateRequest =
  | { kind: "set"; commandId: KeybindingCommandId; accelerator: KeybindingOverride }
  | { kind: "reset"; commandId: KeybindingCommandId }
  | { kind: "reset-all" };

/** Overrides keyed by command id. Ids are untrusted (importers map foreign files) and unknown ones are reported. */
export type KeybindingOverridesInput = Readonly<Record<string, KeybindingOverride>>;

export type KeybindingOverridesApplyOptions = {
  /** Write to one platform's overrides instead of the shared ones. */
  platform?: KeybindingPlatform;
  /** `skip` leaves clashing overrides out; `replace` applies them and unbinds the commands they displace. */
  onConflict?: "skip" | "replace";
};

export type KeybindingOverrideClash = {
  commandId: KeybindingCommandId;
  accelerator: Accelerator;
  conflictsWith: KeybindingCommandId[];
  platforms: KeybindingPlatform[];
};

export type KeybindingOverridesApplyResult = {
  applied: { commandId: KeybindingCommandId; accelerator: KeybindingOverride }[];
  /** Clashing overrides: skipped under `skip`, applied under `replace` (their rivals are listed in `displaced`). */
  conflicts: KeybindingOverrideClash[];
  /** Commands unbound to make room for replacing overrides. */
  displaced: KeybindingCommandId[];
  unknown: string[];
  invalid: { commandId: KeybindingCommandId; accelerator: string; reason: string }[];
};

export type KeyChordRecording =
  | { kind: "pending" }
  | { kind: "cancel" }
  | { kind: "invalid"; reason: string }
  | { kind: "chord"; accelerator: Accelerator };
