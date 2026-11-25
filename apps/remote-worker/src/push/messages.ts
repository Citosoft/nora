import type { SendPushRequest } from "@shared/types/remote-access/push.types";
import type { ExpoPushMessage, StoredPushDevice } from "../types/push.types";

/** One Expo message per device per notification, each carrying the data the phone parses when it is tapped. */
export function buildExpoMessages(request: SendPushRequest, devices: readonly StoredPushDevice[]): ExpoPushMessage[] {
  return request.notifications.flatMap((notification) => devices.map((device): ExpoPushMessage => ({
    to: device.token,
    title: notification.title,
    body: notification.body,
    data: { v: 1, installationId: request.installationId, kind: notification.kind, id: notification.id, target: notification.target },
    sound: "default",
    priority: "high",
    channelId: "default"
  })));
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}
