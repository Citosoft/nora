import type { BackgroundTask } from "@shared/types/conversation/contracts.types";

export interface BackgroundTasksIndicatorProps {
  tasks: readonly BackgroundTask[];
}
