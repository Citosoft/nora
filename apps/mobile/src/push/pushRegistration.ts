import { RemoteRequestError, errorMessage } from "@/api/http/remoteRequestError";
import type { PushPermission, PushRegistration, PushRegistrationDeps, PushRegistrationStatus } from "@/types/pushNotifications.types";

const permissionStatus = (permission: Exclude<PushPermission, "granted">): PushRegistrationStatus =>
  permission === "denied" ? { kind: "denied" } : { kind: "permission-needed" };

/**
 * Registers this phone with the control plane while the setting is on and the OS allows notifications, and removes it
 * when the setting goes off or the user signs out. Calls run one at a time so a toggle and a token rotation never race.
 */
export function createPushRegistration(deps: PushRegistrationDeps): PushRegistration {
  const { platform } = deps;
  let queue: Promise<unknown> = Promise.resolve();
  /** The token the control plane accepted during this sign-in; later syncs with the same token skip the request. */
  let confirmedToken: string | null = null;
  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const job = queue.then(work, work);
    queue = job.catch(() => undefined);
    return job;
  };

  async function register(): Promise<PushRegistrationStatus> {
    const pushPlatform = platform.platform;
    if (pushPlatform === null) return { kind: "unsupported" };
    const permission = await platform.getPermission();
    if (permission !== "granted") return permissionStatus(permission);
    const record = await deps.store.load();
    const token = await platform.getToken();
    const current = record.registered?.userId === deps.userId && record.registered.token === token;
    if (current && confirmedToken === token) return { kind: "registered" };
    await deps.directory.registerPushDevice({ deviceId: record.deviceId, token, platform: pushPlatform });
    await deps.store.save({ deviceId: record.deviceId, registered: { userId: deps.userId, token } });
    confirmedToken = token;
    return { kind: "registered" };
  }

  /** Only this account's registration can be removed with its token; a stale one from another account is just forgotten. */
  async function remove(): Promise<void> {
    confirmedToken = null;
    const record = await deps.store.load();
    if (record.registered === null) return;
    if (record.registered.userId === deps.userId) {
      try {
        await deps.directory.removePushDevice(record.deviceId);
      } catch (error) {
        if (!(error instanceof RemoteRequestError && error.code === "not-found")) throw error;
      }
    }
    await deps.store.save({ deviceId: record.deviceId, registered: null });
  }

  const settle = async (work: () => Promise<PushRegistrationStatus>): Promise<PushRegistrationStatus> => {
    try {
      return await work();
    } catch (error) {
      return { kind: "failed", message: errorMessage(error) };
    }
  };

  return {
    sync: (enabled) => serialize(() => settle(async () => {
      if (platform.platform === null) return { kind: "unsupported" };
      if (enabled) return register();
      await remove();
      return { kind: "off" };
    })),
    enable: () => serialize(() => settle(async () => {
      if (platform.platform === null) return { kind: "unsupported" };
      const permission = await platform.requestPermission();
      return permission === "granted" ? register() : permissionStatus(permission);
    })),
    unregister: () => serialize(async () => {
      if (platform.platform === null) return;
      await remove().catch(() => undefined);
    })
  };
}
