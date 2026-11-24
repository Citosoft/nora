import type { RuntimeSession } from "./runtimeSession.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { RemoteBot, RemoteProject } from "@shared/types/remote-access/runtimeApi.types";
import type { SaveRemoteBot } from "@shared/types/remote-access/management.types";

export type BotEditorState = { kind: "closed" } | { kind: "open"; draft: SaveRemoteBot };
export interface BotEditorProps {
  initial: SaveRemoteBot;
  projects: readonly RemoteProject[];
  onSave(input: SaveRemoteBot): Promise<void>;
  onClose(): void;
}
export interface BotSettingsData { bots: BotDefinition[]; projects: RemoteProject[]; }

export type BotManagementIntent = { kind: "list" } | { kind: "create"; workspaceId: string | null }
  | { kind: "edit"; botId: string; scope: RemoteBot["scope"] };
export interface BotSettingsProps {
  session: RuntimeSession;
  intent?: BotManagementIntent;
}
export interface BotsScreenProps { runtimeId: string; intent: BotManagementIntent; }
