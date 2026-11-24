import { useContext, useSyncExternalStore } from "react";
import { InboxContext } from "@/components/app/context/inboxContext";
import type { InboxState, InboxStore } from "@/components/app/types/inbox.types";

/** The window's inbox, kept current by main. */
export function useInbox(): { state: InboxState; store: InboxStore } {
  const inbox = useContext(InboxContext);
  if (!inbox) throw new Error("The inbox is unavailable");
  const state = useSyncExternalStore(inbox.subscribe, inbox.state);
  return { state, store: inbox };
}
