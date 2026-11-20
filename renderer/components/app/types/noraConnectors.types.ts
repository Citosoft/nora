import type { Connector, ConnectorAccess, ConnectorInput, ConnectorSubject } from "@shared/types/connectors/connectors.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { BotAvatar } from "@shared/types/bots/bots.types";
import type { McpServerLogo } from "@shared/types/provider/mcp.types";
import type { ConnectorGalleryEntry } from "@shared/types/connectors/gallery.types";
import type { WorkspaceAvatarIdentity } from "@/components/app/types/workspaceAvatar.types";
import type { ThreadConnectorsState } from "@/components/app/types/threadConnectors.types";
import type { ReactNode } from "react";
import type { ConnectorBridge } from "@shared/ipc/types/connectorGateway.types";

/** A per-connector action the window is waiting on; sign-in can wait minutes for the browser. */
export type NoraConnectorAction = "sign-in" | "sign-out" | "set-enabled" | "remove" | "refresh";

export interface NoraConnectors {
  /** Null until the first list arrives. */
  connectors: readonly Connector[] | null;
  loadError: string | null;
  pending(id: string): NoraConnectorAction | undefined;
  /** Why the last action on a connector failed, until another starts. */
  failure(id: string): string | undefined;
  /** Rejects with a user-facing message, so the add dialog can stay open and show it. */
  create(input: ConnectorInput): Promise<void>;
  /** Rejects with a user-facing message, so the availability dialog can stay open and show it. */
  setAccess(id: string, access: ConnectorAccess): Promise<void>;
  signIn(id: string): void;
  signOut(id: string): void;
  setEnabled(id: string, enabled: boolean): void;
  remove(id: string): void;
  refresh(id?: string): void;
}
export type NoraConnectorsClient = Pick<ConnectorBridge, "request" | "onChanged">;

export type ConnectorAuthMode = "oauth" | "header";
/** The add-connector form as typed; `buildConnectorInput` turns it into a validated request. */
export interface ConnectorFormState {
  name: string;
  url: string;
  authMode: ConnectorAuthMode;
  clientId: string;
  clientSecret: string;
  headerName: string;
  headerValue: string;
  access: ConnectorAccessDraft;
}

/** One access dimension as edited: picked ids survive switching to "all" and back, and may be empty until saved. */
export interface ConnectorAudienceDraft { kind: "all" | "only"; ids: readonly string[]; }
export interface ConnectorAccessDraft { workspaces: ConnectorAudienceDraft; bots: ConnectorAudienceDraft; }
export type ConnectorAccessResult = { ok: true; access: ConnectorAccess } | { ok: false; message: string };
/** A workspace a connector can be limited to, with the identity its avatar is drawn from. */
export interface ConnectorWorkspaceChoice { kind: "workspace"; id: string; name: string; avatar: WorkspaceAvatarIdentity; }
/** A bot a connector can be limited to; `detail` says where it comes from. */
export interface ConnectorBotChoice { kind: "bot"; id: string; name: string; detail: string; avatar: BotAvatar; }
export type ConnectorAccessChoice = ConnectorWorkspaceChoice | ConnectorBotChoice;
export interface ConnectorAccessChoices { workspaces: readonly ConnectorWorkspaceChoice[]; bots: readonly ConnectorBotChoice[]; }
/** One limited dimension of a connector's access, for summaries: the picks still known, and a short label. */
export interface ConnectorAccessSummaryPart { label: string; choices: readonly ConnectorAccessChoice[]; }
export interface ConnectorAccessSummaryProps { access: ConnectorAccess; choices: ConnectorAccessChoices; }
export interface ConnectorAccessChoiceIconProps { choice: ConnectorAccessChoice; }
/** The parts of the native boot state that name the workspaces and bots a connector can be limited to. */
export type ConnectorAccessSource = Pick<NativeBoot, "workspaces" | "personalization" | "sharedBots">;
export type ConnectorFormResult = { ok: true; input: ConnectorInput } | { ok: false; message: string };
export type AddConnectorStep = "server" | "auth" | "access";
/** The server and how Nora signs in to it, before choosing where it is available. */
export type ConnectorServerInput = Omit<ConnectorInput, "access">;
/** A failure names the step whose field needs fixing, so the dialog can send the user back to it. */
export type ConnectorServerResult = { ok: true; server: ConnectorServerInput }
  | { ok: false; message: string; step: Exclude<AddConnectorStep, "access"> };
/** Where the add dialog lands when asked for a step: that step, or an earlier one with a problem and why. */
export interface AddConnectorStepTarget { step: AddConnectorStep; error: string | null; }
/** Props shared by the add dialog's form steps; `clientRequired` opens the own-client fields for servers that cannot register Nora themselves. */
export interface AddConnectorFormStepProps { form: ConnectorFormState; update(patch: Partial<ConnectorFormState>): void; clientRequired?: boolean; }

export interface AddConnectorDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onCreate(input: ConnectorInput): Promise<void>;
  accessChoices: ConnectorAccessChoices;
  /** A gallery entry to add: the form starts filled with its server and opens on the sign-in step. */
  preset?: ConnectorGalleryEntry | null;
}
/** The whole add flow: the gallery of official servers first, then the add dialog for the chosen one or a custom server. */
export interface ConnectorGalleryDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  onCreate(input: ConnectorInput): Promise<void>;
  accessChoices: ConnectorAccessChoices;
  /** URLs already added, so those entries show as added instead of being offered twice. */
  addedUrls: readonly string[];
}
export interface ConnectorGalleryGridProps { addedUrls: readonly string[]; onPick(entry: ConnectorGalleryEntry): void; onCustom(): void; }
/** A gallery server as the table shows it. */
export interface GalleryTableRow { entry: ConnectorGalleryEntry; category: string; ownApp: boolean; added: boolean; }
export type GallerySortKey = "name" | "category" | "signIn" | "status";
export interface GalleryTableQuery { search: string; category: ConnectorGalleryEntry["category"] | "all"; sort: GallerySortKey; direction: "asc" | "desc"; }
/** The auth step's preset notice: where to create the client the service requires. */
export interface AddConnectorPresetNoticeProps { preset: ConnectorGalleryEntry; }
export interface ConnectorAccessDialogProps {
  /** The connector being edited; the dialog is open while one is set. */
  connector: Connector | null;
  accessChoices: ConnectorAccessChoices;
  onClose(): void;
  onSave(id: string, access: ConnectorAccess): Promise<void>;
}
export interface ConnectorAccessFormProps extends Omit<ConnectorAccessDialogProps, "connector"> { connector: Connector; }
export interface ConnectorAccessFieldsProps {
  value: ConnectorAccessDraft;
  choices: ConnectorAccessChoices;
  onChange(value: ConnectorAccessDraft): void;
}
export interface ConnectorAudienceFieldProps {
  legend: string;
  allLabel: string;
  onlyLabel: string;
  emptyText: string;
  choices: readonly ConnectorAccessChoice[];
  value: ConnectorAudienceDraft;
  onChange(value: ConnectorAudienceDraft): void;
}
export interface NoraConnectorRowProps { connector: Connector; controls: NoraConnectors; accessChoices: ConnectorAccessChoices; onEditAccess(connector: Connector): void; }
/** `compact` sizes the actions for dense lists; `menu` adds the overflow menu (enable, sign out, remove…) beside the primary action. */
export interface NoraConnectorActionsProps { connector: Connector; controls: NoraConnectors; compact?: boolean; menu?: boolean; onEditAccess?(connector: Connector): void; }
/** One connector in a dense list; `manage` adds its overflow menu so the list can also enable, sign out or remove it. */
export interface NoraConnectorListItemProps { connector: Connector; controls: NoraConnectors; manage: boolean; onEditAccess?(connector: Connector): void; }
export interface NoraThreadConnectorsProps { subject: ConnectorSubject; }
/** One connector's logo in the composer pill; `key` is unique across Nora's and the provider's connectors. */
export interface ComposerConnectorLogo { key: string; logo: McpServerLogo | undefined; }
/** What the composer's connector button shows: how many connectors the thread gets, a few of their logos, and whether any needs a sign-in. */
export interface ComposerConnectorBadge { count: number; needsSignIn: boolean; logos: readonly ComposerConnectorLogo[]; }
/**
 * `subject` is the thread the composer sends to, so the control shows the Nora connectors that thread gets; `providerConnectors`
 * is what the thread's provider runtime enables on its own, null until a provider is known.
 */
export interface NativeComposerConnectorsProps {
  disabled: boolean;
  subject: ConnectorSubject;
  accessChoices: ConnectorAccessChoices;
  providerConnectors: ThreadConnectorsState | null;
}
export interface NoraConnectorMenuItem { label: string; run(): void; destructive?: boolean; }
export interface NoraConnectorMenuProps { label: string; busy: boolean; icon: ReactNode; items: readonly NoraConnectorMenuItem[]; }
