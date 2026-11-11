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
  size?: "small" | "default";
}

export interface WorkspaceColorPickerProps {
  workspace: WorkspaceAvatarIdentity;
}
