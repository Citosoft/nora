import { useEffect, useState } from "react";
import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import { readWorkspaceInstructions } from "@/components/app/logic/workspaceInstructions";
import type { InstructionsState, InstructionsWorkspace } from "@/components/app/types/workspaceInstructions.types";

export function useWorkspaceInstructions(workspace: InstructionsWorkspace, refreshKey: number): InstructionsState {
  const [state, setState] = useState<InstructionsState>({ status: "loading" });
  const { projectId, rootPath } = workspace;
  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void readWorkspaceInstructions(noraWorkspaceClient, { projectId, rootPath }).then((documents) => {
      if (!cancelled) setState({ status: "ready", documents });
    });
    return () => { cancelled = true; };
  }, [projectId, rootPath, refreshKey]);
  return state;
}
