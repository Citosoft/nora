import { useMemo, useState, type PropsWithChildren } from "react";
import { withFavoriteModel } from "@shared/personalization/favoriteModels";
import { FavoriteModelsContext } from "@/components/app/context/favoriteModelsContext";
import { InboxContext } from "@/components/app/context/inboxContext";
import { VoiceInputContext } from "@/components/app/context/voiceInputContext";
import { NoraConnectorsContext } from "@/components/app/context/noraConnectorsContext";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { FavoriteModelsPort } from "@/components/app/types/modelPicker.types";
import type { InboxState, InboxStore } from "@/components/app/types/inbox.types";
import type { VoiceInputPort } from "@/components/app/types/voiceInput.types";
import type { NoraConnectorsClient } from "@/components/app/types/noraConnectors.types";

const EMPTY_INBOX_STATE: InboxState = { snapshot: { items: [] }, loading: false, error: null };
const NO_THREADS: readonly string[] = [];

/** Fixture hosts have no main-process inbox, so nothing ever waits or is unread. */
export const emptyInbox: InboxStore = {
  state: () => EMPTY_INBOX_STATE,
  unreadThreadIds: () => NO_THREADS,
  markThreadRead: () => {},
  subscribe: () => () => {},
  start: () => () => {},
  async execute() { throw new Error("Fixture hosts have no inbox"); }
};

/** Fixture hosts have no dictation provider, so the composer's voice button shows why it is off. */
const noVoiceInput: VoiceInputPort = {
  async getVoiceInputReadiness() { return { state: "unconfigured", reason: "Voice input is not available in fixture hosts." }; },
  onAppSettingsChanged: () => () => {},
  async transcribeVoiceInput() { throw new Error("Voice input is not available in fixture hosts."); }
};

/** Fixture hosts store no Nora connectors, so composers list none and adding one explains why it can't. */
const noConnectors: NoraConnectorsClient = {
  async request(input) {
    if (input.kind === "list") return [];
    throw new Error("Adding or changing Nora connectors isn't available in fixture hosts.");
  },
  onChanged: () => () => {}
};

/** The window-wide ports the native runtime normally supplies, kept in memory for fixture hosts and the chat simulator. */
export function FixturePortsProvider({ children }: PropsWithChildren) {
  const [models, setModels] = useState<readonly ThreadModelDefault[]>([]);
  const favorites = useMemo<FavoriteModelsPort>(() => ({
    models,
    async setFavorite(model, favorite) { setModels((current) => withFavoriteModel(current, model, favorite)); }
  }), [models]);
  return <InboxContext.Provider value={emptyInbox}><FavoriteModelsContext.Provider value={favorites}><VoiceInputContext.Provider value={noVoiceInput}>
    <NoraConnectorsContext.Provider value={noConnectors}>{children}</NoraConnectorsContext.Provider>
  </VoiceInputContext.Provider></FavoriteModelsContext.Provider></InboxContext.Provider>;
}
