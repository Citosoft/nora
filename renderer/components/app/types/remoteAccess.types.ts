import type { ReactNode } from "react";
import type { BotAvatar } from "@shared/types/bots/bots.types";
import type { BotAvatarState } from "@/components/app/types/botAvatar.types";
import type { RemoteAccessViewRequest } from "@shared/ipc/types/remoteAccessGateway.types";
import type { RemoteAccessView, RemoteAuditEntry, RemoteDevice } from "@shared/types/remote-access/remoteAccess.types";

export interface RemoteAccessControls {
  view: RemoteAccessView | null;
  activity: RemoteAuditEntry[];
  pending: boolean;
  error: string | null;
  activityError: string | null;
  request(input: RemoteAccessViewRequest): Promise<boolean>;
  refreshActivity(): Promise<void>;
}

export interface StatusPresentation {
  label: string;
  detail: string | null;
  tone: "normal" | "success" | "warning";
}

/** Where this computer is in setting up the phone app, and what the Mobile page should offer next. */
export type MobileRemoteSetupStep =
  | { kind: "loading" }
  | { kind: "sign-in" }
  | { kind: "enable" }
  | { kind: "starting"; label: string; detail: string | null }
  | { kind: "connected" }
  | { kind: "attention"; label: string; detail: string | null; recovery: "retry" | "sign-in" | null };

export interface MobileRemoteSetupProps {
  controls: RemoteAccessControls;
  onOpenSettings(): void;
}

export interface MobileRemoteDemoScene {
  id: "threads" | "bots" | "approve" | "message" | "notify";
  title: string;
  description: string;
}

export interface MobileRemoteDemoProps {
  scene: MobileRemoteDemoScene["id"];
}

export interface MobileRemoteOverlayProps {
  edge: "left" | "right";
}

export interface MobileRemoteDemoHeaderProps {
  title: string;
  /** A thread view shows a back chevron; the thread list shows the computer and its connection. */
  back?: boolean;
}

export interface MobileRemoteDemoBubbleProps {
  from: "nora" | "you";
  children: ReactNode;
  /** Entrance delay in milliseconds, so a conversation plays in turn by turn. */
  at: number;
}

/** One numbered step of how Nora Relay links a phone to this computer; the number matches its badge in the diagram. */
export interface NoraRelayStep {
  title: string;
  body: string;
}

/** Where to get the Nora phone app on one platform. */
export interface MobileAppDownload {
  platform: "ios" | "android";
  label: string;
  /** How the app is distributed, such as a public beta, so people know what to expect before they tap. */
  channel: string;
  url: string;
}

/** A sample bot in the Mobile page's phone demo. */
export interface MobileRemoteDemoBot {
  name: string;
  role: string;
  status: string;
  avatar: BotAvatar;
  state: BotAvatarState;
}

/** One row of the Mobile page's device list, ready to render. */
export interface RemoteDeviceRow {
  id: string;
  label: string;
  connected: boolean;
  /** "Connected now", or how long ago the device was last active. */
  status: string;
}

export interface MobileRemoteDevicesProps {
  devices: readonly RemoteDevice[];
  /** Disables Disconnect while another remote access change is running. */
  pending: boolean;
  onDisconnect(deviceId: string): void;
}

export interface NoraRelayLinkAnimationProps {
  /** Packets move only while the link is live; otherwise the lanes are drawn dashed and still. */
  active: boolean;
  className?: string;
}
