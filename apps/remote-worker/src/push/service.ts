import type { PushDeviceEntry, RegisterPushDeviceRequest, SendPushRequest, SendPushResponse }
  from "@shared/types/remote-access/push.types";
import { DirectoryFailure } from "../errors/directoryFailure";
import { UpstreamError } from "../errors/upstreamError";
import { EXPO_MAX_MESSAGES_PER_REQUEST } from "../expo/pushClient";
import type { PushService, PushServiceDeps, StoredPushDevice } from "../types/push.types";
import { buildExpoMessages, chunk } from "./messages";

export function createPushService(deps: PushServiceDeps): PushService {
  const { devices, directory, expo, clock } = deps;

  async function register(userId: string, request: RegisterPushDeviceRequest): Promise<PushDeviceEntry> {
    const snapshot = await devices.read(userId);
    const existing = snapshot.entries.find((device) => device.deviceId === request.deviceId) ?? null;
    // A token can only belong to one phone; an app reinstall gets a new device ID but may keep its token.
    const superseded = snapshot.entries
      .filter((device) => device.deviceId !== request.deviceId && device.token === request.token)
      .map((device) => device.deviceId);
    const remaining = snapshot.entries.length - superseded.length;
    if (existing === null && remaining >= deps.maxDevicesPerUser) {
      throw new DirectoryFailure("quota", `At most ${deps.maxDevicesPerUser} phones can receive notifications for an account.`);
    }
    const device: StoredPushDevice = {
      deviceId: request.deviceId,
      platform: request.platform,
      registeredAt: existing?.registeredAt ?? clock.now().toISOString(),
      token: request.token
    };
    // A key holding a malformed value would deep-merge with the new entry, so clear it first.
    if (snapshot.invalidKeys.includes(request.deviceId)) await devices.remove(userId, [request.deviceId]);
    await devices.put(userId, device, superseded);
    return { deviceId: device.deviceId, platform: device.platform, registeredAt: device.registeredAt };
  }

  async function remove(userId: string, deviceId: string): Promise<void> {
    const { entries, invalidKeys } = await devices.read(userId);
    if (!entries.some((device) => device.deviceId === deviceId) && !invalidKeys.includes(deviceId)) {
      throw new DirectoryFailure("not-found", "Device not found.");
    }
    await devices.remove(userId, [deviceId]);
  }

  async function send(userId: string, request: SendPushRequest): Promise<SendPushResponse> {
    if (expo === null) throw new DirectoryFailure("internal", "Phone notifications are not configured.");
    // Only a computer on the caller's own account may notify their phones on its behalf.
    const runtimes = await directory.read(userId);
    if (!runtimes.entries.some((entry) => entry.installationId === request.installationId)) {
      throw new DirectoryFailure("not-found", "Runtime not found.");
    }
    const registered = (await devices.read(userId)).entries;
    if (registered.length === 0) return { delivered: 0 };

    const messages = buildExpoMessages(request, registered);
    const unregisteredTokens = new Set<string>();
    let delivered = 0;
    let failedChunks = 0;
    const chunks = chunk(messages, EXPO_MAX_MESSAGES_PER_REQUEST);
    for (const batch of chunks) {
      try {
        const tickets = await expo.send(batch);
        tickets.forEach((ticket, index) => {
          if (ticket.kind === "ok") delivered += 1;
          else if (ticket.deviceNotRegistered) {
            const message = batch[index];
            if (message !== undefined) unregisteredTokens.add(message.to);
          }
        });
      } catch (error) {
        if (!(error instanceof UpstreamError)) throw error;
        failedChunks += 1;
      }
    }

    const pruned = registered.filter((device) => unregisteredTokens.has(device.token)).map((device) => device.deviceId);
    // Best-effort: the pushes already went out, and a stale device is retried and pruned on the next send.
    await devices.remove(userId, pruned).catch(() => undefined);
    if (failedChunks === chunks.length) throw new UpstreamError("expo", null, "every push chunk failed");
    return { delivered };
  }

  return { register, remove, send };
}
