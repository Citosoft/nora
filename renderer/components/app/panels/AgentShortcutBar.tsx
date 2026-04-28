import { AgentToolIcon } from "@/components/app/shared/Tooling";
import type { AgentShortcutBarProps } from "@/components/app/types/component.types";
import { Button } from "@/components/ui/button";
import { isAgentToolAvailable } from "@shared/agentToolState";

export function AgentShortcutBar({
  tools,
  disabled = false,
  onCreateAgent,
  extraContent
}: AgentShortcutBarProps) {
  const availableTools = tools.filter((tool) => isAgentToolAvailable(tool));

  if (!availableTools.length && !extraContent) {
    return null;
  }

  return (
    <div className="border-b border-border/60 bg-card/85 px-4 py-2 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        {availableTools.length ? (
          <div className="flex flex-wrap gap-2">
            {availableTools.map((tool) => (
              <Button
                key={tool.id}
                variant="outline"
                size="icon"
                className="size-9"
                disabled={disabled}
                onClick={() => onCreateAgent(tool.id)}
                tooltip={`Create a new ${tool.label} agent in the current workspace`}
                aria-label={`Create a new ${tool.label} agent in the current workspace`}
              >
                <AgentToolIcon
                  toolId={tool.id}
                  label={tool.label}
                  className="size-6 rounded-[4px] bg-transparent"
                  imageClassName="size-5 rounded-[4px]"
                />
              </Button>
            ))}
          </div>
        ) : null}
        {extraContent ? <div className="ml-auto min-w-0">{extraContent}</div> : null}
      </div>
    </div>
  );
}
