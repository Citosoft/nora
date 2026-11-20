import type { RoutineInput } from "@shared/types/bots/routines.types";
import type { PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { BotDefinition, SharedBotSet } from "@shared/types/bots/bots.types";
import type { NativeWorkspace } from "@shared/types/personalization/workspaces.types";

/** Shared bot definitions read from each workspace's `.nora/bots` directory. */
export interface SharedBotLibrary {
  list(): SharedBotSet[];
  refresh(workspaces: readonly NativeWorkspace[]): Promise<void>;
  write(workspace: NativeWorkspace, bot: BotDefinition): Promise<void>;
  remove(workspace: NativeWorkspace, botId: string): Promise<void>;
}
export interface BotRequestDeps {
  /** Installs an entire routine set or throws without saving any. */
  createRoutines?(inputs: readonly RoutineInput[]): void;
  workspaces(): NativeWorkspace[];
  library: SharedBotLibrary;
}
export type BotRequest = Extract<PersonalizationRequest, { kind: "save-bot" | "delete-bot" | "set-bot-hidden" | "refresh-bots" }>;
