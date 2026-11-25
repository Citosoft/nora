import { useContext } from "react";
import { TitleBarLayoutContext } from "@/components/app/context/titleBarLayoutContext";
import type { TitleBarLayoutValue } from "@/components/app/types/titleBarLayout.types";

/** Returns null outside the signed-in shell, where the title bar has no content column or tab row. */
export function useTitleBarLayout(): TitleBarLayoutValue | null {
  return useContext(TitleBarLayoutContext);
}
