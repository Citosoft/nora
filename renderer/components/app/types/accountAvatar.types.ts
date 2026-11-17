import type { ReactNode } from "react";

export interface AccountAvatarImageProps {
  /** Rendered when there is no signed-in photo or the photo fails to load. */
  fallback: ReactNode;
}

export interface PersonalWorkspaceArtProps {
  className?: string;
}
