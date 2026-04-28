import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";

/** Modal/dialog cluster build deps exposed as a port (assembled slice from signed-in shell). */
export type ModalClusterPorts = {
  modalDialogs: AppModalDialogsBuildDeps;
};
