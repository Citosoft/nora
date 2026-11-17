import { accountClient } from "@/components/app/clients/accountClient";
import type { AccountState } from "@shared/types/account/account.types";

const LOAD_ERROR: AccountState = { status: "error", message: "Your account could not be loaded. Try opening it again." };

/**
 * One app-wide account subscription so every avatar shares the same state instead of each mount
 * re-reading over IPC (which flashed a loading fallback whenever a popover list remounted).
 */
function createAccountStore() {
  let snapshot: AccountState = { status: "loading" };
  let started = false;
  const listeners = new Set<() => void>();
  const publish = (next: AccountState) => { snapshot = next; listeners.forEach((listener) => listener()); };
  const start = () => {
    if (started) return;
    started = true;
    let pushed = false;
    accountClient.onChanged((next) => { pushed = true; publish(next); });
    void accountClient.read().then((next) => { if (!pushed) publish(next); }).catch(() => { if (!pushed) publish(LOAD_ERROR); });
  };
  return {
    subscribe(listener: () => void) {
      start();
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getSnapshot: () => snapshot
  };
}

export const accountStore = createAccountStore();
