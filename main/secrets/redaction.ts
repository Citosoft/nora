/** Lines of a multi-line secret (a private key, say) shorter than this are too common to redact on their own. */
const MIN_LINE_CHARS = 12;

/** The forms a value commonly takes when a tool echoes it: raw, its lines, and the usual encodings of the whole value. */
function formsOf(value: string): string[] {
  const bytes = Buffer.from(value, "utf8");
  const base64 = bytes.toString("base64");
  const lines = value.split(/\r?\n/).map((line) => line.trim());
  return [value, value.trim(), base64, base64.replace(/=+$/, ""), bytes.toString("base64url"), bytes.toString("hex"), bytes.toString("hex").toUpperCase(),
    encodeURIComponent(value), JSON.stringify(value).slice(1, -1),
    ...(lines.length > 1 ? lines.filter((line) => line.length >= MIN_LINE_CHARS) : [])];
}

/**
 * Replaces every occurrence of the given secrets in command output with a marker naming the secret, so a command that prints
 * one does not put it in the transcript. Best effort by design: it catches the value and its common encodings, not a
 * transformation a command applies on purpose, which is why running a command with secrets needs the user's approval.
 */
export function redactSecrets(text: string, secrets: ReadonlyMap<string, string>): string {
  const forms = [...secrets].flatMap(([name, value]) => [...new Set(formsOf(value))].filter(Boolean).map((form) => ({ form, marker: `[${name} redacted]` })))
    // Longest first, so a form that contains another is replaced whole.
    .sort((left, right) => right.form.length - left.form.length);
  return forms.reduce((redacted, { form, marker }) => redacted.split(form).join(marker), text);
}
