import type { KeyValueStorage } from "@/types/storage.types";

export function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string>; writes: string[] } {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    data,
    writes,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      writes.push(key);
      data.set(key, value);
    },
    removeItem: async (key) => {
      writes.push(key);
      data.delete(key);
    }
  };
}
