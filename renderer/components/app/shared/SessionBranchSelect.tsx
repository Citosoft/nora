import { useSessionBranchCheckout } from "@/components/app/hooks/useSessionBranchCheckout";
import { BranchCheckoutMenu } from "@/components/app/shared/BranchCheckoutMenu";
import type { SessionBranchSelectProps } from "@/components/app/types/sessionToolbarBadges.types";

/** Switches the branch checked out in the folder a session runs in. */
export function SessionBranchSelect({ session }: SessionBranchSelectProps) {
  const { refreshStatus, ...menu } = useSessionBranchCheckout(session);

  return (
    // Uncommitted changes appear while the agent works, so re-check just before the user can open the menu.
    <div onPointerEnter={refreshStatus} onFocus={refreshStatus}>
      <BranchCheckoutMenu {...menu} triggerClassName="h-[22px] max-w-[14rem] font-mono" />
    </div>
  );
}
