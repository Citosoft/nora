import { MonitorPlay } from "lucide-react";

export const FocusedAgentNoWorkspaceHint = () => (
  <>
    <MonitorPlay className="mx-auto size-10 text-primary" />
    <div className="space-y-2">
      <div className="text-lg font-medium text-foreground">No workspaces yet</div>
      <div>Add a repository in the left sidebar to start creating agents and terminals.</div>
    </div>
  </>
);
