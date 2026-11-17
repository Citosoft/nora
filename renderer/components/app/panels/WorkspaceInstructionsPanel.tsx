import { useState } from "react";
import { RefreshCcw } from "lucide-react";
import { useChangesColumnPorts } from "@/components/app/hooks/useChangesColumnPorts";
import { useWorkspaceInstructions } from "@/components/app/hooks/useWorkspaceInstructions";
import { MarkdownRenderer } from "@/components/app/shared/MarkdownRenderer";
import { SidebarIconAction } from "@/components/app/panels/changes-panel/SidebarIconAction";
import type { InstructionsContentProps } from "@/components/app/types/workspaceInstructions.types";

function InstructionsContent({ workspace }: InstructionsContentProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const state = useWorkspaceInstructions(workspace, refreshKey);
  return <div className="flex min-h-0 flex-1 flex-col border-t border-border/50">
    <div className="flex items-center justify-between px-4 py-2">
      <span className="text-xs font-medium">Agent instructions</span>
      <SidebarIconAction label="Refresh workspace instructions" icon={<RefreshCcw className="size-3.5" aria-hidden="true" />}
        disabled={state.status === "loading"} onClick={() => setRefreshKey((value) => value + 1)} />
    </div>
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-4" aria-live="polite" aria-busy={state.status === "loading"}>
      {state.status === "loading" ? <p className="py-4 text-xs text-muted-foreground">Loading instructions…</p>
        : state.documents.length === 0 ? <p className="py-4 text-xs text-muted-foreground">No AGENTS.md or CLAUDE.md found in this workspace’s root folder.</p>
        : state.documents.map((document) => <section key={document.path} aria-label={document.path} className="mb-6 last:mb-0">
          <h2 className="sticky top-0 mb-3 border-b border-border/50 bg-card py-2 font-mono text-xs text-muted-foreground">{document.path}</h2>
          {document.status === "error" ? <p role="alert" className="text-xs text-destructive">{document.message}</p>
            : document.content.trim() ? <MarkdownRenderer className="min-w-0 break-words">{document.content}</MarkdownRenderer>
              : <p className="text-xs text-muted-foreground">This file is empty.</p>}
        </section>)}
    </div>
  </div>;
}

export function WorkspaceInstructionsPanel() {
  const { instructionsWorkspace } = useChangesColumnPorts();
  if (!instructionsWorkspace) {
    return <p className="px-4 py-8 text-center text-xs text-muted-foreground">Choose a workspace to see its agent instructions.</p>;
  }
  return <InstructionsContent key={`${instructionsWorkspace.projectId}:${instructionsWorkspace.rootPath}`} workspace={instructionsWorkspace} />;
}
