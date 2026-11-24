import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/expo";
import { appConfig } from "@/config/appConfig";
import { clerkTokenCache } from "@/platform/clerkTokenCache";
import { ClerkAccountProvider, DemoAccountProvider } from "@/context/accountContext";
import { useDemoMode } from "@/hooks/useDemoMode";
import { ConfigurationMissing } from "./ConfigurationMissing";

/** Clerk for the whole app; without a publishable key the app explains the missing configuration instead of crashing. */
export function AuthBoundary({ children }: { children: ReactNode }) {
  const { active } = useDemoMode();
  if (active) return <DemoAccountProvider>{children}</DemoAccountProvider>;
  if (!appConfig.clerkPublishableKey) return <ConfigurationMissing />;
  return (
    <ClerkProvider publishableKey={appConfig.clerkPublishableKey} tokenCache={clerkTokenCache}>
      <ClerkAccountProvider>{children}</ClerkAccountProvider>
    </ClerkProvider>
  );
}
