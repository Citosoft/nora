export interface SshConfigHost {
  alias: string;
  hostname: string | null;
  user: string | null;
  port: number | null;
  identityFile: string | null;
}

export interface RemoteMountSupport {
  supported: boolean;
  provider: "sshfs-win" | "sshfs" | null;
  reason: string | null;
  installHint: string | null;
  canAutoInstall: boolean;
  bootstrapScript: string | null;
}

export interface DirectSshSupport {
  supported: boolean;
  reason: string | null;
}

export interface ActiveRemoteMount {
  remote: string;
  localMount: string | null;
  host: string | null;
  user: string | null;
  port: number | null;
  remotePath: string | null;
  alias?: string | null;
}

export interface RemoteConnectionOptions {
  support: RemoteMountSupport;
  directSsh: DirectSshSupport;
  hosts: SshConfigHost[];
  activeMounts: ActiveRemoteMount[];
}
