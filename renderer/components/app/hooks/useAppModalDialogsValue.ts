import { useOptionalModalClusterPorts } from "@/components/app/context/modalClusterPortsContext";
import { buildAppModalDialogsContextValue } from "@/components/app/logic/buildAppModalDialogsContextValue";
import type { AppModalDialogsContextValue } from "@/components/app/types/appModalDialogs.types";
import type { AppModalDialogsBuildDeps } from "@/components/app/types/appModalDialogsBuild.types";

/** Consumes full modal build deps from cluster port or args; narrows in `buildAppModalDialogsContextValue`. */
export function useAppModalDialogsValue(args?: AppModalDialogsBuildDeps): AppModalDialogsContextValue {
  const fromClusterPort = useOptionalModalClusterPorts()?.modalDialogs;
  const resolved = args ?? fromClusterPort;
  if (!resolved) {
    throw new Error("useAppModalDialogsValue requires args or ModalClusterPortsProvider.");
  }

  return buildAppModalDialogsContextValue(resolved);
}
