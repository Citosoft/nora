import { useStatusBarChatbots } from "@/components/app/hooks/useStatusBarChatbots";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";

/** Footer trigger listing AI chatbot shortcuts that open in the focused project's internal browser. */
export function StatusBarChatbotsPopover() {
  const model = useStatusBarChatbots();
  const [open, setOpen] = useState(false);

  if (!model) {
    return null;
  }

  const { shortcuts, canOpen, openShortcut } = model;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="AI chatbots"
          className="flex items-center gap-1 rounded-[4px] bg-transparent px-1 py-0.5 transition hover:bg-accent/50"
          aria-label="Open AI chatbot shortcuts"
        >
          <MessagesSquare className="size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-72 space-y-3">
        <div>
          <div className="text-sm font-medium text-foreground">AI Chatbots</div>
          <div className="text-xs text-muted-foreground">
            {canOpen ? "Opens in the internal browser" : "Choose a project to open chatbots in the internal browser."}
          </div>
        </div>
        <div className="space-y-1.5">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              type="button"
              onClick={() => {
                openShortcut(shortcut);
                setOpen(false);
              }}
              disabled={!canOpen}
              title={shortcut.description}
              className={cn(
                "flex w-full items-center gap-2 rounded-[6px] border px-2 py-1.5 text-left transition",
                canOpen
                  ? "border-border/60 bg-background/50 hover:border-primary/30 hover:bg-accent/40"
                  : "cursor-not-allowed border-border/50 bg-background/20 opacity-60"
              )}
            >
              <AgentToolIcon
                toolId={shortcut.id}
                label={shortcut.label}
                className="size-6 shrink-0 rounded-[4px] bg-background/60"
                imageClassName="size-3.5 rounded-none"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{shortcut.label}</span>
              <span className="shrink-0 truncate text-[11px] text-muted-foreground">{shortcut.hostLabel}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
