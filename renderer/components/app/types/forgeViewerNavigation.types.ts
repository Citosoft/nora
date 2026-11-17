import type { ForgeViewerTabState } from "@/components/app/types";
import type { WorkspaceNavigationValue } from "./workspaceNavigation.types";

export interface ForgeViewerBackInput {
  tab: ForgeViewerTabState | null;
  openTool: WorkspaceNavigationValue["openTool"];
  closeViewer(tabId: string): void;
}
