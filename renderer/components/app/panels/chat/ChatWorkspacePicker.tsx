import { ChevronDown, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { ChatWorkspacePickerProps } from "@/components/app/types/chatPanels.types";

/** Where a direct chat starts new tasks; follow-ups stay in the workspace their task began in. */
export function ChatWorkspacePicker({ workspaces, selectedId, fixed, disabled, onSelect }: ChatWorkspacePickerProps) {
  const selected = workspaces.find((entry) => entry.id === selectedId);
  const label = <><FolderOpen className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">Working in {selected?.name ?? "an unavailable workspace"}</span></>;
  if (fixed || workspaces.length < 2) return <span className="flex min-w-0 items-center gap-1.5 px-2 text-xs text-muted-foreground">{label}</span>;
  return <DropdownMenu align="start" widthClassName="w-60" trigger={<Button type="button" variant="ghost" size="sm" disabled={disabled}
    className="h-7 min-w-0 gap-1.5 px-2 text-xs font-normal text-muted-foreground" aria-label={`New tasks start in ${selected?.name ?? "an unavailable workspace"}. Change workspace`}>
    {label}<ChevronDown className="size-3 shrink-0" aria-hidden="true" /></Button>}>
    {workspaces.map((workspace) => <DropdownMenuItem key={workspace.id} onSelect={() => onSelect(workspace.id)}>
      {workspace.name}{workspace.id === selectedId ? " ✓" : ""}</DropdownMenuItem>)}
  </DropdownMenu>;
}
