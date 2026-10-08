import type { ActiveRemoteMount } from "@shared/appTypes";

/** Footer remote-mounts readout; only available inside the signed-in shell where project actions exist. */
export type StatusBarRemoteMountsModel = {
  mounts: ActiveRemoteMount[];
  unmountingMountPoint: string | null;
  chooseProjectInMount: (mount: ActiveRemoteMount) => Promise<void>;
  unmount: (mountPoint: string) => Promise<void>;
};
