import { useOptionalSessionCenterPorts } from "@/components/app/context/sessionCenterPortsContext";
import { useCanonicalAppSnapshot } from "@/components/app/hooks/useAppDomainState";
import { deriveAppMainCenterContentValue } from "@/components/app/logic/deriveAppMainCenterContentValue";
import type { AppCenterContentValueArgs, UseAppCenterContentValueResult } from "@/components/app/types/appCenterContentValue.types";
import { useMemo } from "react";

/** Consumes full center build deps; narrows in `deriveAppMainCenterContentValue`. */
export function useAppCenterContentValue(args?: AppCenterContentValueArgs): UseAppCenterContentValueResult {
  const snapshot = useCanonicalAppSnapshot();
  const fromPort = useOptionalSessionCenterPorts()?.centerContentBuild;
  const resolved = args ?? fromPort;

  return useMemo(() => {
    if (!resolved || !snapshot) {
      throw new Error("useAppCenterContentValue requires explicit args or SessionCenterPortsProvider and a loaded snapshot.");
    }
    return deriveAppMainCenterContentValue(resolved, snapshot);
  }, [resolved, snapshot]);
}
