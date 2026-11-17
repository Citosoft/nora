import type { RefObject, UIEvent, WheelEvent } from "react";

export interface TranscriptFollow {
  ref: RefObject<HTMLDivElement | null>;
  /** Activity arrived while the reader was scrolled up. */
  newActivity: boolean;
  onWheel(event: WheelEvent<HTMLDivElement>): void;
  onScroll(event: UIEvent<HTMLDivElement>): void;
  jumpToLatest(): void;
}
