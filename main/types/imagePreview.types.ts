export interface ImagePreviewOptions {
  /** Longest output edge in pixels; smaller images keep their size. */
  maxEdge: number;
  /** Larger source files are skipped rather than decoded. */
  maxBytes: number;
  /** WebP quality, 1–100. */
  quality: number;
}
