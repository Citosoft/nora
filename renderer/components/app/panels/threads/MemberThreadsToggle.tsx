import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemberThreadVisibility } from "@/components/app/hooks/useMemberThreadVisibility";
import type { MemberThreadsToggleProps } from "@/components/app/types/thread-workspace/navigation.types";

/** Lists or hides group members' own threads, where each bot's tool calls and approvals happen; shown in group chats and the Bots sidebar. */
export function MemberThreadsToggle({ compact = false }: MemberThreadsToggleProps) {
  const { visibility, setVisibility } = useMemberThreadVisibility();
  const visible = visibility === "visible";
  const label = visible ? "Hide members' threads" : "Show members' threads";
  const icon = compact ? "size-3" : "size-3.5";
  return <Button type="button" variant="ghost" size="icon" className={`${compact ? "size-5" : "size-7"} text-muted-foreground`} aria-pressed={visible} aria-label={label}
    tooltip={visible ? "Members' threads are listed and replies link to them. Hide them to keep only the group." : "Members' threads are hidden unless they need you. Show them to follow each bot's work."}
    onClick={() => setVisibility(visible ? "hidden" : "visible")}>
    {visible ? <Eye className={icon} aria-hidden="true" /> : <EyeOff className={icon} aria-hidden="true" />}
  </Button>;
}
