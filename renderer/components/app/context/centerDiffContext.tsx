import type { CenterDiffPorts } from "@/components/app/types/centerDiff.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const CenterDiffContext = createContext<CenterDiffPorts | null>(null);

export const CenterDiffProvider = ({ value, children }: { value: CenterDiffPorts; children: ReactNode }): ReactElement =>
  <CenterDiffContext.Provider value={value}>{children}</CenterDiffContext.Provider>;

export const useOptionalCenterDiffPorts = (): CenterDiffPorts | null => useContext(CenterDiffContext);
