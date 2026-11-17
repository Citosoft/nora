import type { ActiveLocalPort } from "@/components/app/types/activeLocalPort.types";

/** Sidebar ports readout; only available inside the signed-in shell where workspace navigation exists. */
export type LocalPortsModel = {
  ports: ActiveLocalPort[];
  openTerminal: (port: ActiveLocalPort) => void;
  openInAppBrowser: (port: ActiveLocalPort) => void;
};
