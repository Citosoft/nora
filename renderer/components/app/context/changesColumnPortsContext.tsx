import type { ChangesColumnPorts } from "@/components/app/types/changesColumnPorts.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const ChangesColumnPortsContext = createContext<ChangesColumnPorts | null>(null);

export const ChangesColumnPortsProvider = ({
  value,
  children
}: {
  value: ChangesColumnPorts;
  children: ReactNode;
}): ReactElement => <ChangesColumnPortsContext.Provider value={value}>{children}</ChangesColumnPortsContext.Provider>;

export const useOptionalChangesColumnPorts = (): ChangesColumnPorts | null => useContext(ChangesColumnPortsContext);
