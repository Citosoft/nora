import { useWorkspaceSidebarPorts } from "@/components/app/hooks/useWorkspaceSidebarPorts";
import type { WorkspaceUtilitiesProps, WorkspaceUtilitiesViewProps } from "@/components/app/types/workspaceUtilities.types";
import { AppTools } from "./workspace-utilities/AppTools";
import { UpdateIndicators } from "./workspace-utilities/UpdateIndicators";

export function WorkspaceUtilities({ collapsed }: WorkspaceUtilitiesProps) {
  const { utilities } = useWorkspaceSidebarPorts();
  return <WorkspaceUtilitiesView {...utilities} collapsed={collapsed} />;
}

export function WorkspaceUtilitiesView({ collapsed, appTools, updates }: WorkspaceUtilitiesViewProps) {
  return <section aria-label="App utilities" className={`shrink-0 ${collapsed ? "px-1 py-2" : "p-2"}`}>
    <div className={collapsed ? "flex flex-col items-center gap-1" : "flex items-center justify-end gap-1"}>
      <AppTools {...appTools} collapsed={collapsed} />
      <UpdateIndicators {...updates} collapsed={collapsed} />
    </div>
  </section>;
}
