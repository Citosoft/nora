import { useMemo } from "react";
import { buildActiveTaskThreads } from "@/components/app/logic/taskThreads";
import type { ActiveTaskThreads } from "@/components/app/types/taskThreads.types";
import { useNativeRuntimePorts } from "./useNativeRuntimePorts";
import { useThreadWorkspaceSnapshot } from "./useThreadWorkspaceSnapshot";

/** Live map of the threads currently working on tasks; updates as those threads start, wait and finish. */
export function useActiveTaskThreads(): ActiveTaskThreads {
  const { store } = useNativeRuntimePorts();
  const { summaries } = useThreadWorkspaceSnapshot(store);
  return useMemo(() => buildActiveTaskThreads(summaries), [summaries]);
}
