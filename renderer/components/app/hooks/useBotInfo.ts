import { useContext } from "react";
import { BotInfoContext } from "@/components/app/context/botInfoContext";
import type { BotInfoActions } from "@/components/app/types/botNavigation.types";

/** The shared bot info panel's actions; null in hosts without the app shell (the chat simulator and UI fixtures), where bot faces stay plain. */
export function useBotInfo(): BotInfoActions | null {
  return useContext(BotInfoContext);
}
