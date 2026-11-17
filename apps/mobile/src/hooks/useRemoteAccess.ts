import { useContext } from "react";
import type { RemoteAccessServices } from "@/types/remoteAccess.types";
import { RemoteAccessContext } from "@/context/remoteAccessContext";

/** Signed-in services; only call from screens behind the signed-in guard. */
export function useRemoteAccess(): RemoteAccessServices {
  const services = useContext(RemoteAccessContext);
  if (!services) throw new Error("useRemoteAccess used while signed out");
  return services;
}
