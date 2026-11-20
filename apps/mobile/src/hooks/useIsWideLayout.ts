import { useWindowDimensions } from "react-native";
import { layout } from "@/theme/tokens";

/** True on desktop-sized windows, where the sidebar is a permanent column rather than a drawer. */
export function useIsWideLayout(): boolean {
  return useWindowDimensions().width >= layout.wideBreakpoint;
}
