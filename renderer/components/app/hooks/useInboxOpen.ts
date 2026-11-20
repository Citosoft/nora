import { useContext } from "react";
import { InboxOpenContext } from "@/components/app/context/inboxOpenContext";
import type { InboxOpenValue } from "@/components/app/types/inbox.types";

export function useInboxOpen(): InboxOpenValue {
  const value = useContext(InboxOpenContext);
  if (!value) throw new Error("Opening inbox items requires its provider");
  return value;
}
