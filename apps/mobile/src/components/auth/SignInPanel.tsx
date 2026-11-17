import { useState } from "react";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { errorMessage } from "@/api/http/remoteRequestError";
import { Banner } from "@/components/common/Banner";
import { Button } from "@/components/common/Button";

/** Native: Clerk's hosted sign-in page in a secure browser session; the session is activated in the app on return. */
export function SignInPanel() {
  const { startHostedAuth } = useHostedAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signIn = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const result = await startHostedAuth({ mode: "sign-in" });
      if (!result.createdSessionId) setError("Sign-in was cancelled or didn't finish. Try again.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {error ? <Banner tone="danger" title="Couldn't sign in" message={error} /> : null}
      <Button label="Continue with Nora account" icon="person-circle" variant="primary" busy={busy} onPress={() => void signIn()} />
    </>
  );
}
