import type { BotMemoryEntry } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

export interface BotMemoryState {
  notes: readonly BotMemoryEntry[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  add(text: string, workspaceId: string | null): Promise<boolean>;
  update(id: string, text: string): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}
export interface BotMemorySectionProps { botId: string; botName: string; workspaces: readonly NativeWorkspace[]; currentWorkspace: NativeWorkspace | null; disabled: boolean; }
export interface BotMemoryNoteProps { text: string; scope: string; source: string; disabled: boolean; onSave(text: string): Promise<boolean>; onRemove(): void; }
