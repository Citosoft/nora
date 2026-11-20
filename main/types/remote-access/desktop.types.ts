import type { AccountRuntime } from "@main/types/account/runtime.types";
import type { RuntimeApiOptions } from "./http/runtime.types";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";

export interface DesktopRemoteAccessOptions {
  directory: string;
  runtimeVersion: string;
  name: string;
  account: Pick<AccountRuntime, "config" | "session" | "sessionToken">;
  host: RuntimeApiOptions["host"];
  inbox: RuntimeApiOptions["inbox"];
  boot: RuntimeApiOptions["boot"];
  onChanged(view: RemoteAccessView): void;
}
