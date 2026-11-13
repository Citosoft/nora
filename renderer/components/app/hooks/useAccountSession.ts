import { useEffect, useState } from "react";
import { useClerk, useUser, useSession } from "@clerk/electron/react";
import { accountClient } from "@/components/app/clients/accountClient";
import type { AccountAction, AccountState } from "@shared/types/account/account.types";

/** The avatar opens Clerk's own modal directly, with no intermediate account page. */
export function useAccountSession(): void {
  const clerk = useClerk();
  const { isLoaded, user } = useUser();
  const { session } = useSession();
  const sessionId = session?.id ?? null;
  const [pending, setPending] = useState<AccountAction | null>(null);
  const id = user?.id;
  const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "Your account";
  const imageUrl = user?.imageUrl?.startsWith("https://") ? user.imageUrl : null;
  useEffect(() => accountClient.onOpen(setPending), []);
  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => { void window.noraAccount.publish({ status: "error", message: "Account services are unavailable. Check your connection." }).catch(() => undefined); }, 15_000);
    return () => clearTimeout(timer);
  }, [isLoaded]);
  useEffect(() => {
    if (!isLoaded) return;
    const state: AccountState = id ? { status: "signed-in", user: { id, name, imageUrl } } : { status: "signed-out" };
    void window.noraAccount.publish(state, sessionId).catch(() => undefined);
  }, [isLoaded, id, name, imageUrl, sessionId]);
  useEffect(() => {
    if (!pending || !isLoaded) return;
    setPending(null);
    const fail = (): void => { void window.noraAccount.publish({ status: "error", message: "Account services could not connect. Try again." }).catch(() => undefined); };
    try {
      if (pending === "sign-out") void clerk.signOut().catch(fail);
      else if (user) clerk.openUserProfile();
      else clerk.openSignIn();
    } catch { fail(); }
  }, [pending, isLoaded, user, clerk]);
}
