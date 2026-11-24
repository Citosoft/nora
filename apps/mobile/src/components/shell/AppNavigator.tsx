import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { useAppAccount } from "@/hooks/useAppAccount";
import { DemoFrame } from "@/components/demo/DemoFrame";
import { RemoteAccessProvider } from "@/context/remoteAccessContext";
import { RuntimeDirectoryProvider } from "@/context/runtimeDirectoryContext";
import { AuthLoading } from "./AuthLoading";
import { useTheme } from "@/hooks/useTheme";

const signedInScreens = ["index", "computers", "settings", "about", "runtimes/[runtimeId]/settings", "runtimes/[runtimeId]/index", "runtimes/[runtimeId]/new", "runtimes/[runtimeId]/inbox",
  "runtimes/[runtimeId]/activity", "runtimes/[runtimeId]/bots/index", "runtimes/[runtimeId]/bots/[botId]", "runtimes/[runtimeId]/conversations/[conversationId]"] as const;

/** Real sessions and the isolated offline demo share the same guarded routes and views. */
export function AppNavigator() {
  const account = useAppAccount();
  const { colors } = useTheme();
  if (account.status === "loading") return <AuthLoading />;
  const signedIn = account.status === "signed-in" || account.status === "demo";
  return (
    <RemoteAccessProvider>
      <SignedInData signedIn={signedIn}>
        <DemoFrame>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.groupedBackground } }}>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="sign-in" />
            </Stack.Protected>
            <Stack.Protected guard={signedIn}>
              {signedInScreens.map((name) => <Stack.Screen key={name} name={name} />)}
            </Stack.Protected>
          </Stack>
        </DemoFrame>
      </SignedInData>
    </RemoteAccessProvider>
  );
}

function SignedInData({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return signedIn ? <RuntimeDirectoryProvider>{children}</RuntimeDirectoryProvider> : <>{children}</>;
}
