import type { OutputThread } from "@shared/types/conversation/queries.types";
import type { ThreadOutputKind } from "@/components/app/types/threadOutputs.types";
import type { LibraryEntry, LibraryFilter, LibraryGrouping, LibrarySection, LibraryThreadOption } from "@/components/app/types/library.types";
import { OUTPUT_KINDS } from "@/components/app/constants/outputKinds";
import { collectThreadOutputs } from "@/components/app/logic/thread-workspace/outputs";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The workspace's outputs, newest first, one entry per file. Each thread's outputs are derived exactly as its own
 * Outputs list derives them; a file several threads produced is listed once, under the thread that touched it last.
 */
export function buildLibraryEntries(threads: readonly OutputThread[]): LibraryEntry[] {
  const entries = new Map<string, LibraryEntry>();
  for (const thread of threads) {
    for (const output of collectThreadOutputs(thread.items, thread.workspacePath)) {
      const existing = entries.get(output.key);
      if (existing && existing.createdAt >= output.createdAt) continue;
      entries.set(output.key, { ...output, conversationId: thread.conversationId, threadTitle: thread.title, rootPath: thread.workspacePath, archived: thread.archived });
    }
  }
  return [...entries.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** A stable key for an entry across reloads: its thread and file. */
export function libraryEntryKey(entry: LibraryEntry): string {
  return `${entry.conversationId}:${entry.key}`;
}

/** The entries in the order the grid shows them, for stepping through them in the viewer. */
export function flattenLibrarySections(sections: readonly LibrarySection[]): LibraryEntry[] {
  return sections.flatMap((section) => section.entries);
}

export function filterLibraryEntries(entries: readonly LibraryEntry[], { query, kind, conversationId }: LibraryFilter): LibraryEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter((entry) => (kind === "all" || entry.kind === kind) && (!conversationId || entry.conversationId === conversationId)
    && (!needle || [entry.name, entry.path, entry.threadTitle, entry.source === "tool" ? entry.description ?? "" : ""]
      .some((text) => text.toLocaleLowerCase().includes(needle))));
}

/** Calendar buckets in local time: today, yesterday, the last week and month, then one per month. */
function dateSection(createdAt: string, now: Date): { key: string; label: string } {
  const date = new Date(createdAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const age = startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  if (age <= 0) return { key: "today", label: "Today" };
  if (age <= DAY_MS) return { key: "yesterday", label: "Yesterday" };
  if (age < 7 * DAY_MS) return { key: "week", label: "Previous 7 days" };
  if (age < 30 * DAY_MS) return { key: "month", label: "Previous 30 days" };
  return { key: `${date.getFullYear()}-${date.getMonth()}`, label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
}

/** Sections in display order; entries keep their newest-first order inside each. */
export function groupLibraryEntries(entries: readonly LibraryEntry[], grouping: LibraryGrouping, now: Date): LibrarySection[] {
  const sections = new Map<string, LibrarySection>();
  const add = (key: string, label: string, entry: LibraryEntry) => {
    const section = sections.get(key) ?? { key, label, entries: [] };
    section.entries.push(entry);
    sections.set(key, section);
  };
  for (const entry of entries) {
    if (grouping === "thread") add(entry.conversationId, entry.threadTitle, entry);
    else if (grouping === "type") add(entry.kind, OUTPUT_KINDS.find((kind) => kind.kind === entry.kind)?.plural ?? entry.kind, entry);
    else { const { key, label } = dateSection(entry.createdAt, now); add(key, label, entry); }
  }
  const ordered = [...sections.values()];
  return grouping === "type"
    ? ordered.sort((a, b) => OUTPUT_KINDS.findIndex((kind) => kind.kind === a.key) - OUTPUT_KINDS.findIndex((kind) => kind.kind === b.key))
    : ordered;
}

/** Threads that have outputs, newest first, for the thread filter. */
export function libraryThreadOptions(entries: readonly LibraryEntry[]): LibraryThreadOption[] {
  const threads = new Map<string, LibraryThreadOption>();
  for (const entry of entries) {
    const thread = threads.get(entry.conversationId);
    if (thread) thread.count++;
    else threads.set(entry.conversationId, { conversationId: entry.conversationId, title: entry.threadTitle, count: 1 });
  }
  return [...threads.values()];
}

export function libraryKindCounts(entries: readonly LibraryEntry[]): Partial<Record<ThreadOutputKind, number>> {
  const counts: Partial<Record<ThreadOutputKind, number>> = {};
  for (const entry of entries) counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
  return counts;
}
