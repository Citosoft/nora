import { useEffect, useState } from "react";
import { noraLoopClient } from "@/components/app/clients/noraLoopClient";
import type { LoopDefinitionList } from "@/components/app/types/workflowLaunch.types";

/** Loads a workspace's saved workflows once per mount, so a menu that mounts on open always lists the current set. */
export function useLoopDefinitionList(projectId: string): LoopDefinitionList {
  const [list, setList] = useState<LoopDefinitionList>({ definitions: [], isLoading: true, errorMessage: null });
  useEffect(() => {
    let cancelled = false;
    setList({ definitions: [], isLoading: true, errorMessage: null });
    noraLoopClient.listLoopDefinitions(projectId)
      .then((definitions) => { if (!cancelled) setList({ definitions, isLoading: false, errorMessage: null }); })
      .catch((error: unknown) => {
        if (!cancelled) setList({ definitions: [], isLoading: false, errorMessage: error instanceof Error ? error.message : "Unable to load workflows." });
      });
    return () => { cancelled = true; };
  }, [projectId]);
  return list;
}
