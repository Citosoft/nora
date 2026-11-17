import type { RuntimeEndpoint, RuntimeSession, RuntimeSessionRegistry } from "@/types/runtimeSession.types";

export function createRuntimeSessionRegistry(createSession: (endpoint: RuntimeEndpoint) => RuntimeSession): RuntimeSessionRegistry {
  const sessions = new Map<string, RuntimeSession>();
  return {
    get(endpoint) {
      const existing = sessions.get(endpoint.installationId);
      if (existing && existing.hostname === endpoint.hostname) return existing;
      existing?.dispose();
      const session = createSession(endpoint);
      sessions.set(endpoint.installationId, session);
      return session;
    },
    resumeAll() {
      for (const session of sessions.values()) session.resume();
    },
    disposeAll() {
      for (const session of sessions.values()) session.dispose();
      sessions.clear();
    }
  };
}
