import type { ReactNode } from "react";
import type { IconName } from "./icon.types";

export type RowAccessory = "chevron" | "checkmark" | "none";

/** A Settings-style rounded square with a white glyph on a solid colour. */
export interface IconTileSpec {
  icon: IconName;
  color: string;
}

export interface ListRowProps {
  title: string;
  subtitle?: string | null | undefined;
  /** Right-aligned secondary text (iOS "value" cell). */
  value?: string | null | undefined;
  icon?: IconTileSpec;
  /** Custom leading content (e.g. a bot avatar or status dot) when an icon tile does not fit. */
  leading?: ReactNode;
  /** Custom trailing content shown before the accessory. */
  trailing?: ReactNode;
  accessory?: RowAccessory;
  onPress?: () => void;
  onLongPress?: () => void;
  destructive?: boolean;
  /** Centred tinted label, for action rows such as "Sign out". */
  centered?: boolean;
  disabled?: boolean;
  /** Lines before truncation; 0 lets long explanatory rows wrap fully. */
  titleLines?: number;
  subtitleLines?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export interface ListSectionProps {
  header?: string | undefined;
  footer?: ReactNode;
  /** Leading inset of the separators between rows; rows with icon tiles align them with the title. */
  separatorInset?: number;
  children: ReactNode;
}

export interface ActionSheetOption {
  leading?: ReactNode;
  /** Wait for the iOS sheet to close before presenting another native picker. */
  afterDismiss?: boolean;
  label: string;
  onPress: () => void;
  icon?: IconName;
  destructive?: boolean;
  /** Shows a checkmark (for pickers). */
  selected?: boolean;
}

export interface ActionSheetProps {
  visible: boolean;
  title?: string | undefined;
  message?: string | undefined;
  options: readonly ActionSheetOption[];
  onClose: () => void;
}
