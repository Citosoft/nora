import { LoaderCircle } from "lucide-react";
import type { ProviderAccountRowProps, ProviderAccountStatusProps } from "@/components/app/types/providerAccount.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ProviderAccountStatus({ providerLabel, view, onSignIn }: ProviderAccountStatusProps) {
  const signInButton = <Button variant="outline" size="sm" onClick={onSignIn}>Sign in</Button>;
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
        return <Row><Badge variant="success">Signed in</Badge>
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
