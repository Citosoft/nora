import { LoaderCircle } from "lucide-react";
import type { ProviderAccountRowProps, ProviderAccountStatusProps } from "@/components/app/types/providerAccount.types";
import { ProviderSignInButton } from "@/components/app/panels/settings/ProviderSignInButton";
import { Badge } from "@/components/ui/badge";

export function ProviderAccountStatus({ providerLabel, view, loginMethods, onSignIn }: ProviderAccountStatusProps) {
  const signInButton = <ProviderSignInButton providerLabel={providerLabel} label="Sign in" loginMethods={loginMethods} onSignIn={onSignIn} />;
  switch (view.status) {
    case "loading":
      return <Row><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />Checking sign-in…</Row>;
    case "signing-in":
      return <Row><LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />Finish signing in to {providerLabel} in your browser…</Row>;
    case "error":
      return <Row action={signInButton}><span className="text-destructive">{view.message}</span></Row>;
    case "ready": {
      const { account } = view;
      if (account.state === "signed-in") {
        // Offered only when the runtime has several sign-ins, e.g. moving Claude from a subscription to an Anthropic Console account.
        const switchButton = loginMethods.length > 1
          ? <ProviderSignInButton providerLabel={providerLabel} label="Switch account" loginMethods={loginMethods} onSignIn={onSignIn} /> : undefined;
        return <Row action={switchButton}><Badge variant="success">Signed in</Badge>
          <span className="truncate">{account.method}{account.label ? ` · ${account.label}` : ""}</span></Row>;
      }
      if (account.state === "signed-out") return <Row action={signInButton}><Badge variant="warning">Signed out</Badge></Row>;
      return <Row action={signInButton}>Sign-in status unavailable</Row>;
    }
  }
}

function Row({ children, action }: ProviderAccountRowProps) {
  return <div role="status" aria-live="polite" className="flex min-h-8 items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">{children}</div>
    {action}
  </div>;
}
