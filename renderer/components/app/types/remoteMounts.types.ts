import type { ActiveRemoteMount } from "@shared/appTypes";

/** Sidebar remote-mounts readout; only available inside the signed-in shell where project actions exist. */
export type RemoteMountsModel = {
  mounts: ActiveRemoteMount[];
  unmountingMountPoint: string | null;
  chooseProjectInMount: (mount: ActiveRemoteMount) => Promise<void>;
  unmount: (mountPoint: string) => Promise<void>;
};
