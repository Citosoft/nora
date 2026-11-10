import { createContext } from "react";
import type { ThreadNavigationPorts, ThreadCenterPorts, ThreadTabsPorts } from "@/components/app/types/thread-workspace/ports.types";

export const ThreadNavigationContext = createContext<ThreadNavigationPorts | null>(null);
export const ThreadCenterContext = createContext<ThreadCenterPorts | null>(null);
export const ThreadTabsContext = createContext<ThreadTabsPorts | null>(null);
