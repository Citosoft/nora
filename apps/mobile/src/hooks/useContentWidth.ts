import { layout } from "@/theme/tokens";
import { useIsWideLayout } from "./useIsWideLayout";

/** The widest a list or settings page grows: a phone-style column on small windows, roomier on desktop-sized ones. */
export function useContentWidth(): number {
  return useIsWideLayout() ? layout.wideContentWidth : layout.maxContentWidth;
}
