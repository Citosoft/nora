import { useSyncExternalStore } from "react";
import { accountStore } from "@/components/app/logic/account/accountStore";
import type { AccountState } from "@shared/types/account/account.types";

export function useAccount(): AccountState {
  return useSyncExternalStore(accountStore.subscribe, accountStore.getSnapshot);
}
