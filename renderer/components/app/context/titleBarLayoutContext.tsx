import { createContext, useMemo, useState } from "react";
import type { TitleBarLayoutProviderProps, TitleBarLayoutValue } from "@/components/app/types/titleBarLayout.types";

/**
 * Shares the main content column with the title bar so its divider and tabs line up with the content,
 * and gives the session panel a slot to portal its tab row into while the tab state stays in the panel.
 * Title bars outside the provider (loading, onboarding) have neither.
 */
export const TitleBarLayoutContext = createContext<TitleBarLayoutValue | null>(null);

export function TitleBarLayoutProvider({ children }: TitleBarLayoutProviderProps) {
  const [tabSlot, setTabSlot] = useState<HTMLElement | null>(null);
  const [contentColumn, setContentColumn] = useState<HTMLElement | null>(null);
  const value = useMemo<TitleBarLayoutValue>(
    () => ({ tabSlot, setTabSlot, contentColumn, setContentColumn }),
    [tabSlot, contentColumn]
  );
  return <TitleBarLayoutContext.Provider value={value}>{children}</TitleBarLayoutContext.Provider>;
}
