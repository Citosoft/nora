import type { RefObject } from "react";
import type { HostInstance } from "react-native";

export interface KeyboardOverlap {
  /** Attach to the view whose bottom edge should clear the keyboard. */
  ref: RefObject<HostInstance | null>;
  /** Points of that view the keyboard currently covers; 0 while the keyboard is hidden. */
  overlap: number;
  /** Call from the view's onLayout so a moved or resized view is measured again. */
  remeasure: () => void;
}
