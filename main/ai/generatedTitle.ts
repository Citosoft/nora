/** The first line of a model's answer as a bare title: no "Title:" label, quotes or markdown, at most `max` characters. */
export function parseGeneratedTitle(text: string, max: number, what: string): string {
  const title = text.split(/\r?\n/).map((line) => line.trim()).find(Boolean)
    ?.replace(/^(?:title|thread name|branch name|name)\s*:\s*/i, "").replace(/^[#*\s"'`]+|[*\s"'`]+$/g, "").trim();
  if (!title) throw new Error(`The AI response did not include a ${what}.`);
  return title.slice(0, max).trim();
}
