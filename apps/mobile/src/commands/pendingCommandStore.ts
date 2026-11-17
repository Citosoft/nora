import type { PendingCommand, PendingCommandListener, PendingCommandStore } from "@/types/pendingCommand.types";
import type { KeyValueStorage } from "@/types/storage.types";
import { pendingCommandListSchema } from "./pendingCommandSchema";

export const PENDING_COMMANDS_STORAGE_KEY = "nora.pending-commands.v1";

export function createPendingCommandStore(storage: KeyValueStorage, storageKey = PENDING_COMMANDS_STORAGE_KEY): PendingCommandStore {
  let commands = new Map<string, PendingCommand>();
  const listeners = new Set<PendingCommandListener>();

  const persist = async (): Promise<void> => {
    const values = [...commands.values()];
    if (values.length) await storage.setItem(storageKey, JSON.stringify(values));
    else await storage.removeItem(storageKey);
    for (const listener of listeners) listener(values);
  };

  return {
    async load() {
      const raw = await storage.getItem(storageKey);
      if (!raw) return;
      try {
        const parsed = pendingCommandListSchema.safeParse(JSON.parse(raw));
        if (parsed.success) commands = new Map([...parsed.data.map((command): [string, PendingCommand] => [command.key, command]), ...commands]);
      } catch {
        // Corrupt storage is discarded; at worst the user retypes an unsent message.
      }
      for (const listener of listeners) listener([...commands.values()]);
    },
    list: () => [...commands.values()],
    get: (key) => commands.get(key),
    async put(command) {
      commands.set(command.key, command);
      await persist();
    },
    async remove(key) {
      if (commands.delete(key)) await persist();
    },
    async clear() {
      commands = new Map();
      await persist();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}
