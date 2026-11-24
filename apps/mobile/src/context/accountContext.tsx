import { createContext, useMemo, type ReactNode } from "react";
import { useAuth, useClerk, useUser } from "@clerk/expo";
import type { AppAccount } from "@/types/account.types";
import { useDemoMode } from "@/hooks/useDemoMode";

export const AccountContext = createContext<AppAccount | null>(null);

/** Clerk remains the sole authority for real account sessions. Demo has no token or network identity. */
export function ClerkAccountProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const account = useMemo<AppAccount>(() => ({
    status: !isLoaded ? "loading" : isSignedIn ? "signed-in" : "signed-out",
    userId: userId ?? null,
    user: user ? { fullName: user.fullName, email: user.primaryEmailAddress?.emailAddress ?? null, imageUrl: user.hasImage ? user.imageUrl : null } : null,
    getToken, signOut: () => clerk.signOut()
  }), [clerk, getToken, isLoaded, isSignedIn, user, userId]);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function DemoAccountProvider({ children }: { children: ReactNode }) {
  const { exit } = useDemoMode();
  const account = useMemo<AppAccount>(() => ({ status: "demo", userId: "nora-demo", user: { fullName: "Demo account", email: null, imageUrl: null },
    getToken: async () => null, signOut: async () => exit() }), [exit]);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
