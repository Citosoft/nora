import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { WorkspaceSessionTabIcon } from "@/components/app/panels/WorkspaceSessionTabIcon";
import { SESSION_TAB_MORE_WIDTH } from "@/components/app/logic/sessionTabOverflow";
import type { WorkspaceSessionTabOverflowProps } from "@/components/app/types/sessionTabOverflow.types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function WorkspaceSessionTabOverflow({ tabs, activeTabId, onSelect }: WorkspaceSessionTabOverflowProps) {
  const [open, setOpen] = useState(false);
  if (!tabs.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          style={{ width: SESSION_TAB_MORE_WIDTH }}
          className="h-8 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
          aria-label={`More tabs (${tabs.length})`}
        >
          More ({tabs.length})<ChevronDown className="size-3.5 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[min(24rem,var(--radix-popover-content-available-height))] w-72 overflow-y-auto p-1" aria-label="More tabs">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            title={tab.name}
            aria-current={tab.id === activeTabId ? "page" : undefined}
            className="flex w-full justify-start gap-2 px-2 text-xs"
            onClick={() => {
              setOpen(false);
              onSelect(tab);
            }}
          >
            <WorkspaceSessionTabIcon tab={tab} />
            <span className="min-w-0 truncate">{tab.name}</span>
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
