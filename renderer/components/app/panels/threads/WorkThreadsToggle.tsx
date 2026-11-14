import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkThreadVisibility } from "@/components/app/hooks/useWorkThreadVisibility";
import type { WorkThreadsToggleProps } from "@/components/app/types/thread-workspace/navigation.types";

/** Lists or hides bots' work threads, where their tool calls and approvals happen; shown in chats and the Bots sidebar. */
export function WorkThreadsToggle({ compact = false }: WorkThreadsToggleProps) {
  const { visibility, setVisibility } = useWorkThreadVisibility();
  const visible = visibility === "visible";
  const label = visible ? "Hide work threads" : "Show work threads";
  const icon = compact ? "size-3" : "size-3.5";
  return <Button type="button" variant="ghost" size="icon" className={`${compact ? "size-5" : "size-7"} text-muted-foreground`} aria-pressed={visible} aria-label={label}
    tooltip={visible ? "Bots' work threads are listed in the sidebar. Hide them to keep only your chats." : "Work threads are hidden unless they need you. Show them to follow each bot's work."}
    onClick={() => setVisibility(visible ? "hidden" : "visible")}>
    {visible ? <Eye className={icon} aria-hidden="true" /> : <EyeOff className={icon} aria-hidden="true" />}
  </Button>;
}
