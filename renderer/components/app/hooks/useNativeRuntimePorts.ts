import { useContext } from "react";
import { NativeRuntimeContext } from "@/components/app/context/nativeRuntimeContext";

export function useNativeRuntimePorts() {
  const ports = useContext(NativeRuntimeContext);
  if (!ports) throw new Error("Native thread runtime is unavailable");
  return ports;
}
