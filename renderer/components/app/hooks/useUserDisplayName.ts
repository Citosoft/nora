import { useSyncExternalStore } from "react";
import { readUserDisplayName, subscribeUserDisplayName } from "@/components/app/logic/userDisplayName";

export function useUserDisplayName(): string {
  return useSyncExternalStore(subscribeUserDisplayName, readUserDisplayName);
}
