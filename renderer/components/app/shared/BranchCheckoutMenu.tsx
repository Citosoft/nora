import type { BranchCheckoutMenuProps } from "@/components/app/types/branchCheckout.types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown, GitBranch, LoaderCircle } from "lucide-react";

/** Active-branch trigger that opens a list of local branches to check out. */
export function BranchCheckoutMenu({
  activeBranch,
  checkoutableBranches,
  blockedReason,
  isCheckingOut,
  onCheckout,
  triggerClassName
}: BranchCheckoutMenuProps) {
  return (
    <DropdownMenu
      align="end"
      widthClassName="w-64"
      trigger={(
        <Button
          variant="outline"
          className={cn(
            "h-7 max-w-[180px] shrink-0 gap-1.5 rounded-[4px] border-border/60 bg-background/60 px-2 py-1 text-[11px] font-medium text-foreground",
            triggerClassName
          )}
          disabled={blockedReason !== null || isCheckingOut}
          tooltip={blockedReason ?? (activeBranch ? `Switch branch from ${activeBranch}` : "Switch branch")}
          aria-label={activeBranch ? `Active branch: ${activeBranch}` : "Active branch unavailable"}
        >
          {isCheckingOut ? (
            <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
          ) : (
            <GitBranch className="size-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate">{activeBranch || "unknown branch"}</span>
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      )}
    >
      {checkoutableBranches.map((branch) => (
        <DropdownMenuItem key={branch} onSelect={() => onCheckout(branch)}>
          <GitBranch className="size-4" />
          <span className="truncate">{branch}</span>
        </DropdownMenuItem>
      ))}
    </DropdownMenu>
  );
}
