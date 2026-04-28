export function createNoteDraft(title: string): string {
  return [`# ${title}`, "", "Write free-form Markdown here — ideas, links, and reminders for this project.", ""].join("\n");
}
