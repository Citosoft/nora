import type { BotMemoryEntry } from "@shared/types/bots/bots.types";

/** Who saved a note, as the notes list shows it. */
export const NOTE_SOURCE_LABELS: Readonly<Record<BotMemoryEntry["source"]["kind"], (botName: string) => string>> = {
  bot: (botName) => `Saved by ${botName}`,
  review: () => "Saved automatically",
  user: () => "Added by you"
};
