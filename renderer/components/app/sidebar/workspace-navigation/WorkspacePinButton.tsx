import { Pin } from "lucide-react";
import { useWorkspacePin } from "@/components/app/hooks/useWorkspacePin";
import type { WorkspacePinButtonProps } from "@/components/app/types/workspaceAvatar.types";
import { Button } from "@/components/ui/button";

export function WorkspacePinButton({ workspace }: WorkspacePinButtonProps) {
  const { pinned, togglePinned } = useWorkspacePin(workspace.id);
  return <Button variant="ghost" size="icon" className="mr-1 size-7 shrink-0" aria-label={`${pinned ? "Unpin" : "Pin"} workspace ${workspace.name}`} aria-pressed={pinned} onClick={togglePinned}>
    <Pin className={`size-3 ${pinned ? "fill-current" : "text-muted-foreground"}`} aria-hidden="true" />
  </Button>;
}
