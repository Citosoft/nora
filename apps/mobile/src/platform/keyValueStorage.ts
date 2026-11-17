import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStorage } from "@/types/storage.types";

/**
 * Native: AsyncStorage. Everything stored here is non-secret (preferences, runtime names/hostnames, unsent commands), and
 * the cached runtime list can exceed SecureStore's per-value size guidance, so the keychain is reserved for Clerk.
 */
export const keyValueStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key)
};
