import { NORA_ASCII_3D } from "@/components/app/logic/asciiWordmark";
import type { WindowUiState } from "@/components/app/types";
import { Button } from "@/components/ui/button";
import { FolderGit2 } from "lucide-react";

type FocusedAgentNoProjectHeroProps = {
  platform: WindowUiState["platform"];
  addWorkspaceShortcutParts: string[];
  onChooseProject: () => void;
};

export const FocusedAgentNoProjectHero = ({
  platform,
  addWorkspaceShortcutParts,
  onChooseProject
}: FocusedAgentNoProjectHeroProps) => (
  <>
    <div className="space-y-2">
      <pre className="mx-auto w-fit overflow-x-auto p-1 text-left font-mono text-sm leading-tight text-foreground md:text-base">
        {NORA_ASCII_3D}
      </pre>
      <div>Open a repository once, then switch between workspaces and sessions from the left sidebar.</div>
    </div>
    <div className="flex justify-center">
      <Button variant="invisible" className="min-w-[220px] justify-between" onClick={() => void onChooseProject()}>
        <span className="inline-flex items-center gap-2">
          <FolderGit2 className="size-4" />
          Add workspace
        </span>
        {addWorkspaceShortcutParts.length ? (
          <span className="inline-flex items-center gap-1">
            {addWorkspaceShortcutParts.map((part, index) => (
              <span key={`${part}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && platform !== "darwin" ? (
                  <span className="text-[10px] text-muted-foreground">+</span>
                ) : null}
                <span className="rounded-[4px] border border-border/70 bg-muted/40 px-1.5 py-0.5 font-mono text-[11px] leading-none text-foreground">
                  {part}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </Button>
    </div>
  </>
);
