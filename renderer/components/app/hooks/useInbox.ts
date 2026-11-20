import { useSyncExternalStore } from "react";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import type { InboxState, InboxStore } from "@/components/app/types/inbox.types";

/** The window's inbox, kept current by main. */
export function useInbox(): { state: InboxState; store: InboxStore } {
  const { inbox } = useNativeRuntimePorts();
  const state = useSyncExternalStore(inbox.subscribe, inbox.state);
  return { state, store: inbox };
}
