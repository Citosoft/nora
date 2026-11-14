import type { LucideIcon } from "lucide-react";

export interface SidebarIconButtonProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onSelect(): void;
}
