import path from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_CONTROL_PLANE_URL, REMOTE_WEB_APP_ORIGIN } from "@shared/remote-access/constants";
import { clerkFrontendHost } from "@main/account/config";
import type { DesktopRemoteAccessOptions } from "@main/types/remote-access/desktop.types";
import type { RemoteAccessService } from "@main/types/remote-access/service.types";
import { createRemoteAccessService } from "./service";
import { createRemoteStateStore } from "./store";
import { remoteCredentialCodec } from "./credentialCodec";
import { createRemoteControlPlane } from "./controlPlane";
import { createRemoteTokenVerifier } from "./auth";
import { createRemoteConnector } from "./connector/process";
import { openRemoteAuditLog } from "./auditLog";
import { startRuntimeServer } from "./http/server";

/** Desktop composition only: the coordinator and runtime transport accept no Electron dependencies. */
export function createDesktopRemoteAccess(options: DesktopRemoteAccessOptions): RemoteAccessService {
  const issuerHost = clerkFrontendHost(options.account.config().publishableKey);
  const origins = [REMOTE_WEB_APP_ORIGIN];
  const verifier = issuerHost ? createRemoteTokenVerifier({ issuer: `https://${issuerHost}`, origins })
    : { async verify(): Promise<never> { throw new Error("Account sign-in is unavailable."); } };
  let audit: ReturnType<typeof openRemoteAuditLog> | null = null;
  const activityLog = () => { audit ??= openRemoteAuditLog(path.join(options.directory, "remote-access-audit.sqlite")); return audit; };
  let service: RemoteAccessService | null = null;
  service = createRemoteAccessService({
    environment: "desktop",
    store: createRemoteStateStore({ path: path.join(options.directory, "remote-access.json"), name: options.name, nextId: randomUUID, codec: remoteCredentialCodec }),
    control: createRemoteControlPlane({ origin: DEFAULT_CONTROL_PLANE_URL, fetch, sessionToken: options.account.sessionToken }),
    session: options.account.session,
    connector: createRemoteConnector({ directory: path.join(options.directory, "remote-connector"), platform: process.platform, arch: process.arch, fetch, env: process.env }),
    startServer: (port, permits) => startRuntimeServer({ port, permits, verifier, origins, host: options.host, inbox: options.inbox, boot: options.boot,
      runtimeVersion: options.runtimeVersion, environment: "desktop", name: () => service?.view().runtime?.name ?? (options.name.trim().slice(0, 64) || "Nora"),
      hostname: () => service?.view().runtime?.hostname ?? null, record: (entry) => activityLog().record(entry), now: Date.now }),
    activity: (limit) => activityLog().activity(limit), onChanged: options.onChanged, close: () => audit?.close()
  });
  return service;
}
