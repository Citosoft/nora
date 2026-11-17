import type { KeyValueStorage } from "@/types/storage.types";

/** Web: localStorage, which can throw (private mode, quota, disabled storage); failures degrade to "nothing saved". */
export const keyValueStorage: KeyValueStorage = {
  async getItem(key) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Storage unavailable: preferences last for this visit only.
    }
  },
  async removeItem(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing to remove.
    }
  }
};
