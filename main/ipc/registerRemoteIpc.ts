import { installRemoteMountSupport, mountRemoteWorkspace, unmountRemoteWorkspace } from "@main/remoteMounts";
import type { MainServices } from "@main/services/mainServices";
import type { AppState, ConnectRemoteProjectPayload, RemoteConnectionOptions } from "@shared/appTypes";
import { ipcMain } from "electron";

interface RegisterRemoteIpcDeps {
  services: MainServices;
  withSnapshot: (action: () => Promise<AppState>) => Promise<AppState>;
  chooseMountedProject: (mountPoint: string, host: string) => Promise<AppState>;
  notifyRemoteMountOutput: (line: string) => void;
  pathIsWithinAnyMount: (candidatePath: string, mountPoints: string[]) => boolean;
}

export function registerRemoteIpc({
  services,
  withSnapshot,
  chooseMountedProject,
  notifyRemoteMountOutput,
  pathIsWithinAnyMount
}: RegisterRemoteIpcDeps): void {
  ipcMain.handle("app:install-remote-mount-support", () =>
    installRemoteMountSupport((line) => notifyRemoteMountOutput(line)) as Promise<RemoteConnectionOptions>
  );
  ipcMain.handle("app:mount-remote-project", (_event, payload: ConnectRemoteProjectPayload) =>
    mountRemoteWorkspace(payload, (line) => notifyRemoteMountOutput(line))
  );
  ipcMain.handle("app:open-ssh-project", (_event, payload: ConnectRemoteProjectPayload) =>
    withSnapshot(() => services.workspace.openDirectSshProject(payload))
  );
  ipcMain.handle("app:connect-remote-project", (_event, mountPoint: string, host: string) =>
    chooseMountedProject(mountPoint, host)
  );
  ipcMain.handle("app:unmount-remote-project", (_event, mountPoint: string) =>
    withSnapshot(async () => {
      const snapshot = services.snapshot.getSnapshot();
      const currentProjectRoot = snapshot.project?.rootPath || null;
      const matchedMount = snapshot.activeRemoteMounts.find((mount) =>
        (mount.localMount || "").replace(/[\\/]+$/, "").toLowerCase() === mountPoint.replace(/[\\/]+$/, "").toLowerCase()
      ) || null;
      const mountMatchers = [mountPoint, matchedMount?.remote || ""].filter(Boolean);
      if (currentProjectRoot && pathIsWithinAnyMount(currentProjectRoot, mountMatchers)) {
        await services.workspace.closeProject();
      }
      await unmountRemoteWorkspace(mountPoint);
      await services.workspace.removeProjectsWithinMount(
        mountPoint,
        matchedMount?.remote ? [matchedMount.remote] : []
      );
      return services.workspace.refreshProjectState();
    })
  );
}
