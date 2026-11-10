import { useContext } from "react";
import { ThreadNavigationContext } from "@/components/app/context/threadWorkspaceContext";

export function useThreadNavigationPorts() {
  const ports = useContext(ThreadNavigationContext);
  if (!ports) throw new Error("Thread navigation requires its workspace composition");
  return ports;
}
