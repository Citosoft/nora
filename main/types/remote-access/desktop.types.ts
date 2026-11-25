import type { AccountRuntime } from "@main/types/account/runtime.types";
import type { RuntimeApiOptions } from "./http/runtime.types";
import type { RemoteAccessView } from "@shared/types/remote-access/remoteAccess.types";
import type { InboxService } from "@main/types/inbox/inbox.types";

export interface DesktopRemoteAccessOptions {
  directory: string;
  runtimeVersion: string;
  name: string;
  account: Pick<AccountRuntime, "config" | "session" | "sessionToken">;
  host: RuntimeApiOptions["host"];
  /** Served to phones over the runtime API, and watched for what to push to them. */
  inbox: RuntimeApiOptions["inbox"] & Pick<InboxService, "subscribe">;
  boot: RuntimeApiOptions["boot"];
  management: NonNullable<RuntimeApiOptions["management"]>;
  /** The user's "Notify my phone" setting. */
  phonePushEnabled(): boolean;
  onChanged(view: RemoteAccessView): void;
}
