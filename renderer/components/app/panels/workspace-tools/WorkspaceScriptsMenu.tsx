import { getWorkspaceRunnableScripts, hasWorkspaceRunnableScripts } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { WorkspaceScriptMenuItems } from "./WorkspaceScriptMenuItems";
import { WorkspaceSetupScriptMenuItems } from "./WorkspaceSetupScriptMenuItems";

export function WorkspaceScriptsMenu({ workspace }: WorkspaceToolProps) {
  const scripts = getWorkspaceRunnableScripts(workspace);
  if (!hasWorkspaceRunnableScripts(scripts)) return null;
  return <DropdownMenu trigger={<Button variant="outline" size="sm">Scripts</Button>}>
    <WorkspaceScriptMenuItems workspace={workspace} scripts={scripts.packageScripts} />
    <WorkspaceSetupScriptMenuItems workspace={workspace} />
  </DropdownMenu>;
}
