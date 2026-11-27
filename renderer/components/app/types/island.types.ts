import type { IslandBridge, IslandCounts, IslandIdentity, IslandItem, IslandPhase } from "@shared/types/island/island.types";

export interface IslandProps { bridge: IslandBridge; }
export interface IslandPhaseIndicatorProps {
  phase: IslandPhase;
  /** Rendered size in px. */
  size: number;
}
export interface IslandIdentityIconProps {
  identity: IslandIdentity;
  phase: IslandPhase;
  /** Rendered size in px. */
  size: number;
}
export interface IslandWorkRowProps {
  item: IslandItem;
  onOpen(item: IslandItem): void;
}
export interface IslandBarProps {
  /** The work the bar names; null when nothing is active and the user keeps the island showing. */
  lead: IslandItem | null;
  /** How much the user's size grows the bar from the notch (1 = the notch's own height). */
  scale: number;
  counts: IslandCounts;
  /** Height of the notch the bar sits beside. */
  height: number;
  /** Width of the camera housing the bar leaves empty in its middle. */
  notchWidth: number;
  onOpenInbox(): void;
}
export interface IslandShoulderProps { side: "left" | "right"; radius: number; }
/** Why an island preview could not show, in words for the user. */
export interface IslandDemoNotice { title: string; description: string; }
