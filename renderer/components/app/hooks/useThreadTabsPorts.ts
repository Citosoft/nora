import { useContext } from "react";
import { ThreadTabsContext } from "@/components/app/context/threadWorkspaceContext";

export function useThreadTabsPorts() {
  const ports = useContext(ThreadTabsContext);
  if (!ports) throw new Error("Thread tabs require their workspace composition");
  return ports;
}
