import { useContext } from "react";
import { WorkflowLaunchContext } from "@/components/app/context/workflowLaunchContext";
import type { WorkflowLaunchValue } from "@/components/app/types/workflowLaunch.types";

export function useWorkflowLaunch(): WorkflowLaunchValue {
  const value = useContext(WorkflowLaunchContext);
  if (!value) throw new Error("Workflow launch requires its provider");
  return value;
}
