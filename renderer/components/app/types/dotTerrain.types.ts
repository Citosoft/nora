/** Everything one frame of the dot-matrix terrain needs, independent of the canvas lifecycle. */
export type DotTerrainFrame = {
  grid: DotTerrainGrid;
  /** Seconds since the animation started; drives the drift. */
  time: number;
  /** Ink colour for lit cells, in any CSS colour syntax. */
  color: string;
};

/** How strongly the terrain draws; the cursor glow is unaffected so it stays visible everywhere. */
export interface DotTerrainLook {
  /** Multiplier for terrain cell opacity, 0–1. */
  intensity: number;
  /** Clears an oval in the middle so centred copy sits on calm ground. */
  clearing: boolean;
}

export interface DotTerrainCanvasOptions extends DotTerrainLook {
  /** Whether the landscape drifts; when false it holds still where it stopped while the cursor glow keeps working. */
  drifting: boolean;
}

export interface DotTerrainProps extends Partial<DotTerrainCanvasOptions> {
  className?: string;
}

/** `greeting` clears the middle for a new thread's centred copy; `conversation` dims the terrain behind messages. */
export type ThreadBackdropVariant = "greeting" | "conversation";

export interface ThreadBackdropProps {
  variant: ThreadBackdropVariant;
  /** Drifts only while the thread is working, so an idle thread sits on a still backdrop. */
  working: boolean;
}

/** A grid cell of the terrain, addressed by column and row. */
export interface DotTerrainCell {
  column: number;
  row: number;
}

/** Cells the cursor has lit, keyed by `dotTerrainCellKey`, mapped to when the cursor last left them (or now, while still over). */
export type DotTerrainGlows = Map<number, number>;

export interface DotTerrainGrid {
  width: number;
  height: number;
  columns: number;
  rows: number;
  thresholds: Float32Array;
  /** Per-cell intensity and clearing fade, indexed `column * rows + row`. */
  visibility: Float32Array;
  /** Per-column fade towards the side edges, applied to the ridges only. */
  edges: Float32Array;
}
