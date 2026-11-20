/** What an imported Claude user message turns out to be once the app's own markup is read. */
export type ClaudeUserInput =
  /** The user's own words, with the app's notes removed. */
  | { kind: "message"; text: string }
  /** A slash command or app action; `prompt` is what the model received, when it differs from `command`. */
  | { kind: "command"; command: string; prompt: string }
  /** Output a local slash command printed for the user. */
  | { kind: "command-output"; text: string }
  /** A shell command the user ran directly (`!` in Claude Code), with what it printed. */
  | { kind: "shell"; command: string; output: string }
  /** Nothing for the user to see: only notes the app added for the model. */
  | { kind: "none" };
