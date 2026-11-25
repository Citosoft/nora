/** Everything one frame of the dot-matrix terrain needs, independent of the canvas lifecycle. */
export type DotTerrainFrame = {
  /** CSS pixel width of the drawing area. */
  width: number;
  /** CSS pixel height of the drawing area. */
  height: number;
  /** Seconds since the animation started; drives the drift. */
  time: number;
  /** Ink colour for lit cells, in any CSS colour syntax. */
  color: string;
} & DotTerrainLook;

/** How strongly the terrain draws; the cursor glow is unaffected so it stays visible everywhere. */
export interface DotTerrainLook {
  /** Multiplier for terrain cell opacity, 0–1. */
  intensity: number;
  /** Clears an oval in the middle so centred copy sits on calm ground. */
  clearing: boolean;
}

export interface DotTerrainProps extends Partial<DotTerrainLook> {
  className?: string;
}

/** `greeting` clears the middle for a new thread's centred copy; `conversation` dims the terrain behind messages. */
export type ThreadBackdropVariant = "greeting" | "conversation";

export interface ThreadBackdropProps {
  variant: ThreadBackdropVariant;
}

/** A grid cell of the terrain, addressed by column and row. */
export interface DotTerrainCell {
  column: number;
  row: number;
}

/** Cells the cursor has lit, keyed by `dotTerrainCellKey`, mapped to when the cursor last left them (or now, while still over). */
export type DotTerrainGlows = Map<number, number>;
