import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";

/**
 * App-wide cache of detected workspace logos, keyed by shell project id, so every avatar of a
 * workspace shares one detection per session. `undefined` means not resolved yet; `null` means none.
 */
function createWorkspaceLogoStore() {
  const logos = new Map<string, string | null>();
  const pending = new Set<string>();
  const listeners = new Set<() => void>();
  const resolve = (projectId: string, dataUrl: string | null) => {
    pending.delete(projectId); logos.set(projectId, dataUrl); listeners.forEach((listener) => listener());
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    get: (projectId: string): string | null | undefined => logos.get(projectId),
    request(projectId: string) {
      if (logos.has(projectId) || pending.has(projectId)) return;
      pending.add(projectId);
      void noraWorkspaceClient.readWorkspaceLogo(projectId)
        .then((logo) => resolve(projectId, logo?.dataUrl || null), () => resolve(projectId, null));
    }
  };
}

export const workspaceLogoStore = createWorkspaceLogoStore();
