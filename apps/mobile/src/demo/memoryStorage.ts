import type { KeyValueStorage } from "@/types/storage.types";

/** Demo preferences and commands never share device storage with a real account. */
export function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); }
  };
}
