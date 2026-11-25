import type { PushPlatform } from "@shared/types/remote-access/push.types";
import type { DirectoryClient } from "./directoryClient.types";
import type { KeyValueStorage } from "./storage.types";

export type PushPermission = "granted" | "denied" | "undetermined";

/** Native notification plumbing behind `platform/pushNotifications`; the web build has no push and reports `platform: null`. */
export interface PushNotificationsPlatform {
  /** Null where push cannot work: web, simulators and emulators. */
  readonly platform: PushPlatform | null;
  /** Foreground presentation and the Android "default" channel. Safe to call more than once. */
  configure(): void;
  getPermission(): Promise<PushPermission>;
  /** Shows the system prompt when it still can; otherwise resolves the current answer. */
  requestPermission(): Promise<PushPermission>;
  /** The Expo push token for this app install. */
  getToken(): Promise<string>;
  /** Fires when the OS rotates the device token, so the Expo token should be fetched and registered again. */
  onTokenChange(listener: () => void): () => void;
  /**
   * Delivers the `data` of each notification the user taps, including the one that launched the app. Each tap is
   * delivered once.
   */
  onTap(listener: (data: unknown) => void): () => void;
}

/** Where this phone stands with phone notifications, for Settings. */
export type PushRegistrationStatus =
  | { kind: "unsupported" }
  | { kind: "off" }
  | { kind: "permission-needed" }
  | { kind: "denied" }
  | { kind: "registered" }
  | { kind: "failed"; message: string };

/** The phone's persisted push identity: a stable device ID and, when registered, which account and token it used. */
export interface PushDeviceRecord {
  deviceId: string;
  registered: { userId: string; token: string } | null;
}

export interface PushDeviceStore {
  load(): Promise<PushDeviceRecord>;
  save(record: PushDeviceRecord): Promise<void>;
}

export interface PushDeviceStoreDeps {
  storage: KeyValueStorage;
  createId(): string;
}

export interface PushRegistrationDeps {
  userId: string;
  platform: PushNotificationsPlatform;
  directory: Pick<DirectoryClient, "registerPushDevice" | "removePushDevice">;
  store: PushDeviceStore;
}

/** Keeps this phone's registration with the control plane in step with the setting, permission and token. */
export interface PushRegistration {
  /** Registers (when enabled and permitted) or unregisters; never throws. */
  sync(enabled: boolean): Promise<PushRegistrationStatus>;
  /** Asks for permission when needed, then registers. */
  enable(): Promise<PushRegistrationStatus>;
  /** Removes this phone from the account, best-effort, before sign-out. */
  unregister(): Promise<void>;
}

/** Phone notifications as Settings sees them. */
export interface PushNotificationsValue {
  /** False on the web, simulators and in demo mode. */
  supported: boolean;
  enabled: boolean;
  status: PushRegistrationStatus;
  busy: boolean;
  /** Turning on asks for permission first and stays off if it is refused; turning off unregisters this phone. */
  setEnabled(enabled: boolean): Promise<void>;
}

export interface PushPromptInput {
  supported: boolean;
  enabled: boolean;
  status: PushRegistrationStatus;
  dismissed: boolean;
  linkedComputers: number;
}

export interface PushNotificationsPresentation {
  on: boolean;
  footer: string;
  /** Permission was refused; only the phone's settings can grant it now. */
  openSettings: boolean;
}
