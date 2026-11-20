import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { RemoteAccessProvider } from "@/context/remoteAccessContext";
import { RuntimeDirectoryProvider } from "@/context/runtimeDirectoryContext";
import { AuthLoading } from "./AuthLoading";
import { useTheme } from "@/hooks/useTheme";

const signedInScreens = ["index", "settings", "runtimes/[runtimeId]/index", "runtimes/[runtimeId]/new", "runtimes/[runtimeId]/inbox",
  "runtimes/[runtimeId]/activity", "runtimes/[runtimeId]/bots/[botId]", "runtimes/[runtimeId]/conversations/[conversationId]"] as const;

/** Routes guarded by Clerk session state; signed-in routes get the remote-access services and runtime directory. */
export function AppNavigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { colors } = useTheme();
  if (!isLoaded) return <AuthLoading />;
  const signedIn = isSignedIn === true;
  return (
    <RemoteAccessProvider>
      <SignedInData signedIn={signedIn}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.groupedBackground } }}>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
          <Stack.Protected guard={signedIn}>
            {signedInScreens.map((name) => <Stack.Screen key={name} name={name} />)}
          </Stack.Protected>
        </Stack>
      </SignedInData>
    </RemoteAccessProvider>
  );
}

function SignedInData({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return signedIn ? <RuntimeDirectoryProvider>{children}</RuntimeDirectoryProvider> : <>{children}</>;
}
