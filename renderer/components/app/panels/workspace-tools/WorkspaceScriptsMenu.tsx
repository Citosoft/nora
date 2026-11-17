import { getPreferredWorkspaceScripts } from "@/components/app/logic/workspaceScripts";
import type { WorkspaceToolProps } from "@/components/app/types/workspaceNavigation.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { WorkspaceScriptMenuItems } from "./WorkspaceScriptMenuItems";

export function WorkspaceScriptsMenu({ workspace }: WorkspaceToolProps) {
  const scripts = getPreferredWorkspaceScripts(workspace);
  if (!scripts.length) return null;
  return <DropdownMenu trigger={<Button variant="outline" size="sm">Scripts</Button>}>
    <WorkspaceScriptMenuItems workspace={workspace} scripts={scripts} />
  </DropdownMenu>;
}
