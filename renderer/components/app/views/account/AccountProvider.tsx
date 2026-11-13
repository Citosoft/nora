import { ClerkProvider } from "@clerk/electron/react";
import { accountAppearance } from "@/components/app/logic/account/appearance";
import { accountCopy } from "@/components/app/constants/accountCopy";
import { useAccountSession } from "@/components/app/hooks/useAccountSession";
import type { AccountProviderProps } from "@/components/app/types/accountProvider.types";
import { SessionBoundary } from "./SessionBoundary";

function AccountSession() {
  useAccountSession();
  return null;
}

export function AccountProvider({ config, children }: AccountProviderProps) {
  if (!config.publishableKey) return <>{children}</>;
  return <SessionBoundary fallback={children}><ClerkProvider publishableKey={config.publishableKey} appearance={accountAppearance} localization={accountCopy}>
    <AccountSession />{children}
  </ClerkProvider></SessionBoundary>;
}
