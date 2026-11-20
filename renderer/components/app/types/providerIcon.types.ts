import type { ComponentType, SVGProps } from "react";
import type { ProviderConnectionKind } from "@shared/types/provider/account.types";

export interface AgentToolIconProps {
  toolId: string;
  label: string;
  connection?: ProviderConnectionKind;
  className?: string;
  imageClassName?: string;
}
export type LocalToolIconProps = SVGProps<SVGSVGElement> & { color?: string; size?: number | string; };
export interface LocalToolIconConfig { Icon: ComponentType<LocalToolIconProps>; color: "default" | "currentColor"; }
export type ProviderIconVariant = "provider" | "claude-subscription" | "claude-api" | "claude-unknown";
export interface ProviderIconPresentation { variant: ProviderIconVariant; label: string; }
