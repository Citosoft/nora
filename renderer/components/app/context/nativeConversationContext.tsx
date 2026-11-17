import { createContext } from "react";
import type { NativeConversationPorts } from "@/components/app/types/nativePanels.types";

export const NativeConversationContext = createContext<NativeConversationPorts | null>(null);
