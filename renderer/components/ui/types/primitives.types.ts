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
