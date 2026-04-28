import type { SessionCenterPorts } from "@/components/app/types/sessionCenterPorts.types";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";

const SessionCenterPortsContext = createContext<SessionCenterPorts | null>(null);

export const SessionCenterPortsProvider = ({
  value,
  children
}: {
  value: SessionCenterPorts;
  children: ReactNode;
}): ReactElement => <SessionCenterPortsContext.Provider value={value}>{children}</SessionCenterPortsContext.Provider>;

export const useOptionalSessionCenterPorts = (): SessionCenterPorts | null => useContext(SessionCenterPortsContext);
