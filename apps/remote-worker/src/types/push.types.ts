import type { PushDeviceEntry, PushPayloadData, RegisterPushDeviceRequest, SendPushRequest, SendPushResponse }
  from "@shared/types/remote-access/push.types";
import type { KeyedMetadataSnapshot, RuntimeDirectoryStore } from "./directoryStore.types";

/** What is persisted per phone: the public entry plus its Expo push token, which never leaves the Worker. */
export interface StoredPushDevice extends PushDeviceEntry {
  readonly token: string;
}

export type PushDeviceSnapshot = KeyedMetadataSnapshot<StoredPushDevice>;

/** Per-user phone registry persisted in Clerk private metadata. */
export interface PushDeviceStore {
  read(userId: string): Promise<PushDeviceSnapshot>;
  /** Writes `device` and removes `removeDeviceIds` in one merge patch. */
  put(userId: string, device: StoredPushDevice, removeDeviceIds?: readonly string[]): Promise<void>;
  remove(userId: string, deviceIds: readonly string[]): Promise<void>;
}

/** One message in Expo's push API request format. Only the fields Nora sends. */
export interface ExpoPushMessage {
  readonly to: string;
  readonly title: string;
  readonly body: string;
  readonly data: PushPayloadData;
  readonly sound: "default";
  readonly priority: "high";
  readonly channelId: "default";
}

/** Expo's per-message ticket, normalised. Receipt-level errors are not tracked. */
export type ExpoPushTicket =
  | { readonly kind: "ok" }
  | { readonly kind: "error"; readonly deviceNotRegistered: boolean };

/** Sends one chunk (at most `EXPO_MAX_MESSAGES_PER_REQUEST`); tickets come back in message order. */
export interface ExpoPushClient {
  send(messages: readonly ExpoPushMessage[]): Promise<readonly ExpoPushTicket[]>;
}

export interface ExpoPushClientOptions {
  readonly accessToken: string;
  readonly fetch: (input: string, init: RequestInit) => Promise<Response>;
}

export interface PushServiceDeps {
  readonly devices: PushDeviceStore;
  readonly directory: RuntimeDirectoryStore;
  /** Null when `EXPO_ACCESS_TOKEN` is unset; sending then fails with `internal` while registration keeps working. */
  readonly expo: ExpoPushClient | null;
  readonly clock: { now(): Date };
  readonly maxDevicesPerUser: number;
}

export interface PushService {
  register(userId: string, request: RegisterPushDeviceRequest): Promise<PushDeviceEntry>;
  remove(userId: string, deviceId: string): Promise<void>;
  send(userId: string, request: SendPushRequest): Promise<SendPushResponse>;
}
