import type { StoredList, StoredListOptions } from "@/components/app/types/composerPrompts.types";

/** Keeps entries that parse, newest first, within the limit; anything malformed reads as an empty list. */
export function parseStoredList<T>(raw: string | null, parse: (entry: unknown) => T | null, limit: number): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parse).filter((entry): entry is T => entry !== null).slice(0, limit);
  } catch {
    return [];
  }
}

/** One in-memory copy per key, so every open composer (split views, chat branches) stays in step. */
export function createStoredList<T>({ key, limit, parse }: StoredListOptions<T>): StoredList<T> {
  let entries: readonly T[] | null = null;
  const listeners = new Set<() => void>();
  const load = (): readonly T[] => {
    try { return parseStoredList(window.localStorage.getItem(key), parse, limit); }
    catch { return []; }
  };
  return {
    read() {
      entries ??= load();
      return entries;
    },
    write(next) {
      entries = next.slice(0, limit);
      try { window.localStorage.setItem(key, JSON.stringify(entries)); }
      catch { /* Storage failures only cost persistence; this window keeps the list. */ }
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    }
  };
}
