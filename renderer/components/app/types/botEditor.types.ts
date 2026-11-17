import type { BotAvatarPart } from "./botAvatar.types";
import type { BotAvatar, BotDefinition, BotScope, BotTemplate, EffectiveBot } from "@shared/types/bots/bots.types";
import type { ThreadModelDefault } from "@shared/types/personalization/threadModel.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

export interface BotEditorDraft {
  name: string;
  role: string;
  instructions: string;
  model: ThreadModelDefault | null;
  avatar: BotAvatar;
  scope: BotScope;
}
export type BotEditorResult = { ok: true; bot: BotDefinition } | { ok: false; message: string };
/** The bot being edited and where it lives, or null for a new bot. */
export interface BotEditorTarget { bot: BotDefinition; }
export interface BotEditorDialogProps {
  target: BotEditorTarget | null;
  /** Workspace offered for workspace-scoped bots; null limits new bots to global. */
  workspace: NativeWorkspace | null;
  defaultScope: BotScope;
  takenIds: ReadonlySet<string>;
  /** Prefills a new bot; ignored when editing. */
  template?: BotTemplate | null;
  onClose(): void;
}
export interface BotAvatarOptionLabelProps { part: BotAvatarPart; label: string; }
export interface BotAvatarEditorProps { avatar: BotAvatar; disabled: boolean; onChange(avatar: BotAvatar): void; }
export interface BotScopeFieldsProps { scope: BotScope; workspace: NativeWorkspace | null; botId: string | null; disabled: boolean; onChange(scope: BotScope): void; }
export interface BotListProps {
  bots: readonly EffectiveBot[];
  emptyText: string;
  onEdit(bot: BotDefinition): void;
  /** Per-row hide control for bots inherited from a lower layer in a workspace. */
  hide?: { hiddenIds: ReadonlySet<string>; onToggle(botId: string, hidden: boolean): void };
}
