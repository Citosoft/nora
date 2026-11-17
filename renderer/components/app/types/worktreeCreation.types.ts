import type { ProjectSummary } from "@shared/appTypes";

export interface CreateWorktreeDialogProps {
  project: ProjectSummary;
  onClose(): void;
}
