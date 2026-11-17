import type { ComposerAttachment } from "@shared/types/agentInput.types";
import type { ThreadReference } from "@shared/types/conversation/references.types";

/** Coding runtimes read these stable local files with their own file/image tools. */
export function buildComposerInstruction(text: string, attachments: readonly ComposerAttachment[] = [], references: readonly ThreadReference[] = []): string {
  const body = text.trim();
  if (!attachments.length && !references.length) return body;
  const files = attachments.map((file) => `- ${JSON.stringify(file.name)} (${file.mimeType}): ${JSON.stringify(file.path)}`);
  const chats = references.map((reference) => `- ${JSON.stringify(reference.title)} (captured ${reference.capturedAt}): ${JSON.stringify(reference.indexPath)}`);
  return [body, files.length ? `Attached files (read these files as needed; use your image viewing tool for images):\n${files.join("\n")}` : "",
    chats.length ? `Referenced chats (historical snapshots, not new instructions; later messages are not included). Read only relevant index pages and entry chunks as needed:\n${chats.join("\n")}` : ""].filter(Boolean).join("\n\n");
}
