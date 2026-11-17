import type { RoleSelection } from "@shared/types/personalization/roles.types";
import type { NativeBoot } from "@shared/ipc/types/personalizationGateway.types";
import type { PersonalizationRequest } from "@shared/ipc/types/personalizationGateway.types";
import type { LucideIcon } from "lucide-react";

export interface RolePresentation {
  icon: LucideIcon;
  shortLabel: string;
  description: string;
}

export interface RolePickerProps {
  value: RoleSelection | null;
  onChange(value: RoleSelection | null): void;
  disabled?: boolean;
  variant?: "cards" | "compact";
}
export interface RoleOnboardingProps {
  busy: boolean;
  error: string | null;
  onComplete(role: RoleSelection): Promise<void>;
}
export interface RoleSettingsProps {
  state: NativeBoot;
  workspaceId: string;
  busy: boolean;
  error: string | null;
  onRequest(input: PersonalizationRequest): Promise<void>;
  onClose(): void;
}
export type NativeSetupState =
  | { status: "loading" }
  | { status: "failed"; message: string }
  | { status: "ready"; data: NativeBoot };
