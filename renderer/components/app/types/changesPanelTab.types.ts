import type { ComponentType } from "react";

export type ChangesPanelTab = "git" | "files" | "memory" | "instructions" | "forge" | "vercel";

export type ChangesPanelTabPresentation = {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  title?: string;
};
