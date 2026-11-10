import type { AppState } from "@shared/appTypes";
export interface NativeShellNavigationInput {
  projectId: string | null;
  focusWorkspace(projectId: string): Promise<AppState | null>;
  showThread(): void;
  onError(cause: unknown): void;
}
