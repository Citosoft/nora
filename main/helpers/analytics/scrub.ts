/**
 * Error text can quote anything: file paths with client names, URLs with tokens, prompts. Detailed analytics may carry a
 * message and stack only after these passes, which replace anything that could identify a person, a machine or their work.
 */
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_FRAMES = 15;

const SCRUBBERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, "<email>"],
  [/\b(?:https?|wss?|file|ssh|git):\/\/[^\s'"`)]+/gi, "<url>"],
  [/\b[\w.-]+@[\w.-]+:[^\s'"`]+/g, "<url>"],
  [/["'`][^"'`\n]*["'`]/g, "<text>"],
  [/[A-Za-z]:\\[^\s'"`]+/g, "<path>"],
  [/~?(?:\/[^\s/'"`:)]+){2,}\/?/g, "<path>"],
  [/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<ip>"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<id>"],
  [/\b[A-Za-z0-9_-]{24,}\b/g, "<redacted>"]
];

export function scrubErrorMessage(message: string): string {
  const scrubbed = SCRUBBERS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), message)
    .replace(/\s+/g, " ")
    .trim();
  return scrubbed.length > MAX_MESSAGE_LENGTH ? `${scrubbed.slice(0, MAX_MESSAGE_LENGTH)}…` : scrubbed;
}

/** Keeps function names and Nora's own source file names, which is what makes a stack useful, and drops every directory. */
export function scrubStack(stack: string): string {
  return stack
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("at "))
    .slice(0, MAX_STACK_FRAMES)
    .map(scrubStackFrame)
    .join("\n");
}

function scrubStackFrame(frame: string): string {
  return frame.replace(/(?:file:\/\/)?(?:[A-Za-z]:)?[^\s()]*[\\/]([^\\/\s()]+?\.(?:[cm]?js|tsx?)(?::\d+){0,2})/g, (_match, file: string) => file)
    .replace(/\(([^()]*[\\/][^()]*)\)/g, "(<path>)");
}
