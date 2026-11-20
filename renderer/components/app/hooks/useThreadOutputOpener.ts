import { useCallback } from "react";
import { useOptionalSessionCenterPorts } from "@/components/app/context/sessionCenterPortsContext";
import { openOutput } from "@/components/app/logic/thread-workspace/openOutput";
import type { ThreadOutputTarget } from "@/components/app/types/threadOutputs.types";
import type { OutputHost } from "@/components/app/types/toolImage.types";

/** Opens a thread's outputs in the session's file viewer when it can show them. */
export function useThreadOutputOpener(rootPath: string, host: OutputHost | null): (target: ThreadOutputTarget) => Promise<void> {
  const openFileEditor = useOptionalSessionCenterPorts()?.centerContentBuild.openFileEditor ?? null;
  return useCallback(async (target: ThreadOutputTarget) => { await openOutput({ rootPath, host, openFileEditor }, target); }, [openFileEditor, rootPath, host]);
}
