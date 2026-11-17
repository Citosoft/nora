import { useContext } from "react";
import { NativeConversationContext } from "@/components/app/context/nativeConversationContext";

export function useNativeConversationPorts() {
  const ports = useContext(NativeConversationContext);
  if (!ports) throw new Error("Native conversation region requires its ports provider");
  return ports;
}
