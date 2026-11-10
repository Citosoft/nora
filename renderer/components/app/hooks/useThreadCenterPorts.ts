import { useContext } from "react";
import { ThreadCenterContext } from "@/components/app/context/threadWorkspaceContext";

export function useThreadCenterPorts() {
  const ports = useContext(ThreadCenterContext);
  if (!ports) throw new Error("Thread center requires its workspace composition");
  return ports;
}
