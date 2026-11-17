import { z } from "zod";
const archiveSchema = z.object({ version: z.literal(1), entries: z.array(z.object({ source: z.string(), archivedAt: z.string().datetime() }).strict()) }).strict();

/** Copy the original bytes before retiring live API-chat persistence; failed storage never deletes history. */
export function archiveLegacyChatTabs(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, now: string): boolean {
  const sourceKey = "nora-ai-chat-tabs", archiveKey = "nora-legacy-chat-archive:v1";
  try {
    const source = storage.getItem(sourceKey);
    if (source === null) return true;
    const raw = storage.getItem(archiveKey);
    const archive = raw === null ? { version: 1 as const, entries: [] } : archiveSchema.parse(JSON.parse(raw));
    if (!archive.entries.some((entry) => entry.source === source)) storage.setItem(archiveKey, JSON.stringify({ version: 1, entries: [...archive.entries, { source, archivedAt: now }] }));
    storage.removeItem(sourceKey);
    return true;
  } catch { return false; }
}
