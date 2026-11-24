import { createContext } from "react";
import { connectorClient } from "@/components/app/clients/connectorClient";
import type { NoraConnectorsClient } from "@/components/app/types/noraConnectors.types";

/** Where Nora's connectors are read and changed; the app uses the desktop bridge, fixture hosts override it. */
export const NoraConnectorsContext = createContext<NoraConnectorsClient>(connectorClient);
