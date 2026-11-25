import { WORKSPACE_TOOLS } from "@/components/app/constants/workspaceTools";
import { useWorkspaceToolPins } from "@/components/app/hooks/useWorkspaceToolPins";
import type { WorkspaceHomePinnedToolsProps, WorkspaceHomeToolsProps } from "@/components/app/types/workspace-home/home.types";
import { WorkspaceHomeHeading } from "./WorkspaceHomeHeading";
import { WorkspaceHomeToolGrid } from "./WorkspaceHomeToolGrid";

export function WorkspaceHomeTools({ onOpenTool, projectId, git }: WorkspaceHomeToolsProps) {
  return <section aria-labelledby="home-tools-title">
    <WorkspaceHomeHeading id="home-tools-title">Project tools</WorkspaceHomeHeading>
    {projectId ? <PinnedTools key={projectId} projectId={projectId} git={git} onOpenTool={onOpenTool} />
      : <WorkspaceHomeToolGrid tools={WORKSPACE_TOOLS} pins={[]} onOpenTool={onOpenTool} onTogglePin={null} />}
  </section>;
}

function PinnedTools({ projectId, git, onOpenTool }: WorkspaceHomePinnedToolsProps) {
  const { available, pins, togglePin } = useWorkspaceToolPins(projectId, git);
  return <WorkspaceHomeToolGrid tools={WORKSPACE_TOOLS.filter((tool) => available.includes(tool.id))} pins={pins} onOpenTool={onOpenTool} onTogglePin={togglePin} />;
}
