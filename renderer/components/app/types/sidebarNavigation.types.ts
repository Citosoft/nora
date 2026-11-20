import type { LucideIcon } from "lucide-react";

export interface SidebarIconButtonProps {
  label: string;
  icon: LucideIcon;
  active: boolean;
  /** A count shown on the icon, such as what in the inbox needs the user; hidden at zero. */
  badge?: number;
  onSelect(): void;
}
