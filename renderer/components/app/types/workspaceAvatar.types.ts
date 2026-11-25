export type WorkspaceAvatarColor = "blue" | "violet" | "fuchsia" | "rose" | "orange" | "teal" | "emerald" | "cyan";

export interface WorkspaceAvatarColorOption {
  id: WorkspaceAvatarColor;
  label: string;
  className: string;
}

export interface WorkspaceAvatarIdentity {
  id: string;
  name: string;
}

export interface WorkspaceAvatarProps {
  workspace: WorkspaceAvatarIdentity;
  size?: "small" | "default" | "large";
}

export interface WorkspaceColorPickerProps {
  workspace: WorkspaceAvatarIdentity;
}

/** What a workspace avatar shows: the user for Personal, a detected project logo, or coloured initials. */
export type WorkspaceAvatarSource =
  | { kind: "personal" }
  | { kind: "logo"; dataUrl: string }
  | { kind: "initials" };

export interface WorkspaceColorSwatchesProps {
  selectedColor: WorkspaceAvatarColor | undefined;
  onChoose: (color: WorkspaceAvatarColor | null) => void;
  /** Compact swatches fit a single row inside menus. */
  compact?: boolean;
}

export interface WorkspaceAvatarColorChoice {
  selectedColor: WorkspaceAvatarColor | undefined;
  chooseColor: (color: WorkspaceAvatarColor | null) => void;
}

export interface WorkspacePinButtonProps {
  workspace: WorkspaceAvatarIdentity;
}
