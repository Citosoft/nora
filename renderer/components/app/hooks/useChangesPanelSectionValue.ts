import { useOptionalChangesColumnPorts } from "@/components/app/context/changesColumnPortsContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { buildChangesPanelSectionProps } from "@/components/app/logic/buildChangesPanelSectionProps";
import type { ChangesPanelSectionProps } from "@/components/app/types/changesPanel.types";
import type { ChangesPanelSectionBuildDeps } from "@/components/app/types/changesPanelSectionBuild.types";
import { useMemo } from "react";

/** Consumes full changes-panel build deps; narrows in `buildChangesPanelSectionProps`. */
export function useChangesPanelSectionValue(args?: ChangesPanelSectionBuildDeps): ChangesPanelSectionProps {
  const snapshot = useCanonicalAppSnapshot();
  const fromPort = useOptionalChangesColumnPorts()?.changesPanelSectionBuild;
  const resolved = args ?? fromPort;

  return useMemo(() => {
    if (!resolved || !snapshot) {
      throw new Error("useChangesPanelSectionValue requires args or ChangesColumnPortsProvider and a loaded snapshot.");
    }
    return buildChangesPanelSectionProps(resolved, snapshot);
  }, [resolved, snapshot]);
}
