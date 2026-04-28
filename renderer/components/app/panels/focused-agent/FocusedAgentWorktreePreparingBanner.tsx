import { LoaderCircle } from "lucide-react";

export const FocusedAgentWorktreePreparingBanner = () => (
  <div className="border-b border-border/50 bg-primary/5 px-4 py-2 text-sm text-foreground">
    <div className="flex items-center gap-2">
      <LoaderCircle className="size-4 animate-spin text-primary" />
      <span>Preparing worktree...</span>
    </div>
  </div>
);
