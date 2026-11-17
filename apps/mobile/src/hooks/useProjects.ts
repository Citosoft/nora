import type { RemoteProject } from "@shared/types/remote-access/runtimeApi.types";
import type { RuntimeSession } from "@/types/runtimeSession.types";
import { useSessionResource } from "./useSessionResource";

const never = (): boolean => false;

export function useProjects(session: RuntimeSession | null) {
  return useSessionResource<RemoteProject[]>(session, (client) => client.projects(), { key: "projects", isAffectedBy: never });
}
