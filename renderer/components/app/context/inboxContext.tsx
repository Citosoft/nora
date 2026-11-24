import { createContext } from "react";
import type { InboxStore } from "@/components/app/types/inbox.types";

/** The window's one inbox; supplied by the native runtime, or by a fixture host. */
export const InboxContext = createContext<InboxStore | null>(null);
