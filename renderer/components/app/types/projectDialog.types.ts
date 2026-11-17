import type { ReactNode } from "react";
import type { AddWorkspaceDialogProps } from "@/components/app/types/chromeDialog.types";

export interface ProjectDialogFrameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  busy?: boolean;
  wide?: boolean;
  children: ReactNode;
}

export interface NewProjectDialogProps extends AddWorkspaceDialogProps {
  onBack: () => void;
}
