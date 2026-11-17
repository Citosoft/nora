import type { PropsWithChildren, ReactNode } from "react";

export interface DialogProps extends PropsWithChildren {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  widthClassName?: string;
};

export type DropdownMenuItemProps = {
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  className?: string;
  onSelect?: () => void;
};

export type MenuLabelProps = {
  children: ReactNode;
};

export type DropdownMenuSubProps = {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
};

/** Shared by a dropdown and its submenus; `layerId` marks every surface that belongs to one open menu. */
export type DropdownMenuContextValue = {
  close: () => void;
  layerId: string;
  openSubId: string | null;
  setOpenSubId: (id: string | null) => void;
};

export type DropdownMenuGroupProps = {
  label: string;
  children: ReactNode;
  /** Nested groups indent under their parent instead of drawing a divider. */
  nested?: boolean;
};

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  children?: React.ReactNode;
}

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  groupLabel?: React.ReactNode;
};

export type OptionLikeProps = {
  value?: string;
  children?: React.ReactNode;
  disabled?: boolean;
};

export type OptionGroupLikeProps = {
  label?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
};

export type SelectOptionGroup = {
  id: string;
  label: React.ReactNode | null;
  options: SelectOption[];
};

export type SelectOptionItemProps = {
  option: SelectOption;
};
