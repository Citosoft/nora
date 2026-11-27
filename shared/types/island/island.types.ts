import type { z } from "zod";
import type { islandDemoScenarioSchema, islandSizeSchema, islandTargetSchema, notchIslandSettingsSchema } from "@shared/island/contracts";
import type { BotAvatar } from "@shared/types/bots/bots.types";
import type { ProviderConnectionKind } from "@shared/types/provider/account.types";

export type IslandTarget = z.infer<typeof islandTargetSchema>;
export type IslandSize = z.infer<typeof islandSizeSchema>;
/** The user's island preferences (Settings → Notch island). */
export type NotchIslandSettings = z.infer<typeof notchIslandSettingsSchema>;

/** Who is doing the work: a bot shows its face, anything else its provider's icon. */
export type IslandIdentity =
  | { kind: "bot"; name: string; avatar: BotAvatar }
  | { kind: "provider"; toolId: string; label: string; connection: ProviderConnectionKind };

/** How a piece of work stands, most urgent first: something waiting on the user beats running, which beats queued. */
export type IslandPhase = "waiting" | "running" | "queued";

export interface IslandItem {
  /** Stable key for the row; the thread or agent id. */
  key: string;
  title: string;
  /** The workspace folder's name, not its full path. */
  workspaceName: string;
  phase: IslandPhase;
  /** Human status, for example "Waiting for approval" or "Running, 2 queued". */
  status: string;
  identity: IslandIdentity;
  target: IslandTarget;
}

export interface IslandCounts {
  waiting: number;
  running: number;
  queued: number;
  total: number;
}

/** What the island shows; with nothing active it is hidden unless the user keeps it showing. */
export interface IslandState {
  counts: IslandCounts;
  /** Work waiting on the user first, then running, then queued, most recently active first within each; capped at `ISLAND_MAX_ITEMS`. */
  items: IslandItem[];
  /** Phase of the lead item, the one the collapsed island names. */
  headline: IslandPhase | null;
}

/** The notch the island hugs, in display points, relative to the island window's top-left corner. */
export interface IslandGeometry {
  notchWidth: number;
  notchHeight: number;
}

export interface IslandView {
  geometry: IslandGeometry;
  state: IslandState;
  /** How large the user wants the island, never smaller than the notch. */
  size: IslandSize;
}

/** Whether a demo could show: only macOS with a notched display can draw the island. */
export type IslandDemoResult = "shown" | "unsupported" | "no-notch";
export type IslandDemoScenario = z.infer<typeof islandDemoScenarioSchema>;

/** The app window's island controls (`window.nora.island`). */
export interface IslandAppBridge {
  demo(scenario: IslandDemoScenario): Promise<IslandDemoResult>;
  /** Ends a demo early; the island returns to real work, or hides. */
  stopDemo(): Promise<void>;
}

/** The island window's preload bridge (`window.noraIsland`). */
export interface IslandBridge {
  onView(listener: (view: IslandView) => void): () => void;
  setInteractive(interactive: boolean): void;
  open(target: IslandTarget): void;
  openInbox(): void;
  openNora(): void;
}
