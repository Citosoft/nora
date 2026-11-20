import type { ClaudeUserInput } from "@main/types/execution/claudeHarness.types";

/**
 * Notes Claude Code and its desktop app add to the transcript for the model, never shown to the user: reminders,
 * background task and session updates, and the caveat sent before a local command's output.
 */
const NOTE_TAGS = ["system-reminder", "task-notification", "local-command-caveat", "side-sessions-event", "ci-monitor-event"];
const NOTES = new RegExp(`<(${NOTE_TAGS.join("|")})>[\\s\\S]*?</\\1>`, "g");
/** Terminal colour codes some local commands print. */
const ANSI = /\u001b\[[0-9;]*m/g;

function tag(text: string, name: string): string | null {
  const match = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(text);
  return match ? match[1].trim() : null;
}

/** Removes the app's notes wherever they appear, including inside user messages and tool results. */
export function stripClaudeNotes(text: string): string {
  return text.replace(NOTES, "").trim();
}

/** Reads one imported user message: the user's words, a command they ran, or nothing to show. */
export function readClaudeUserInput(raw: string): ClaudeUserInput {
  const text = stripClaudeNotes(raw);
  if (!text) return { kind: "none" };
  const name = tag(text, "command-name");
  if (name) {
    const args = tag(text, "command-args");
    const command = `${name.startsWith("/") ? name : `/${name}`}${args ? ` ${args}` : ""}`;
    return { kind: "command", command, prompt: command };
  }
  const shell = tag(text, "bash-input");
  if (shell !== null) {
    const output = [tag(text, "bash-stdout"), tag(text, "bash-stderr")].filter(Boolean).join("\n");
    return { kind: "shell", command: shell, output: output.replace(ANSI, "") };
  }
  const printed = [tag(text, "local-command-stdout"), tag(text, "local-command-stderr"), tag(text, "bash-stdout"), tag(text, "bash-stderr")]
    .filter((value): value is string => value !== null);
  if (printed.length) {
    const output = printed.filter(Boolean).join("\n").replace(ANSI, "").trim();
    return output ? { kind: "command-output", text: output } : { kind: "none" };
  }
  // App actions send their prompt wrapped in a `<name-command>` tag; show them as the command the user chose.
  const action = /^<([a-z][a-z0-9-]*)-command>([\s\S]*)<\/\1-command>$/.exec(text);
  if (action) return { kind: "command", command: `/${action[1]}`, prompt: action[2].trim() || `/${action[1]}` };
  return { kind: "message", text };
}
