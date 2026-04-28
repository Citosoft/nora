import type { FocusedAgentNoSessionViewProps } from "@/components/app/types/focusedAgentEmptyState.types";
import { Card, CardContent } from "@/components/ui/card";
import { FocusedAgentNoProjectHero } from "@/components/app/panels/focused-agent/FocusedAgentNoProjectHero";
import { FocusedAgentNoWorkspaceHint } from "@/components/app/panels/focused-agent/FocusedAgentNoWorkspaceHint";
import { FocusedAgentWorkspaceHome } from "@/components/app/panels/focused-agent/FocusedAgentWorkspaceHome";

export const FocusedAgentNoSessionView = ({
  project,
  workspace,
  platform,
  addWorkspaceShortcutParts,
  onChooseProject,
  workspaceHome
}: FocusedAgentNoSessionViewProps) => (
  <Card className="center-column-surface h-full min-h-0 rounded-none border-x-0 border-t-0 bg-card/95">
    <CardContent className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        {!project ? (
          <FocusedAgentNoProjectHero
            platform={platform}
            addWorkspaceShortcutParts={addWorkspaceShortcutParts}
            onChooseProject={onChooseProject}
          />
        ) : workspace && workspaceHome ? (
          <FocusedAgentWorkspaceHome {...workspaceHome} />
        ) : (
          <FocusedAgentNoWorkspaceHint />
        )}
      </div>
    </CardContent>
  </Card>
);
