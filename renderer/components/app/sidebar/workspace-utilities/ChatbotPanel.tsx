import type { UtilityPanelProps } from "@/components/app/types/workspaceUtilities.types";
import { useChatbotShortcuts } from "@/components/app/hooks/useChatbotShortcuts";
import { AgentToolIcon } from "@/components/app/shared/Tooling";
import { cn } from "@/lib/utils";

/** Workspace-tools view listing AI chatbot shortcuts that open in the focused project's internal browser. */
export function ChatbotPanel({ onClose }: UtilityPanelProps) {
  const model = useChatbotShortcuts();

  if (!model) {
    return null;
  }

  const { shortcuts, canOpen, openShortcut } = model;

  return (
    <div className="space-y-3">
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
              onClose();
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
    </div>
  );
}
