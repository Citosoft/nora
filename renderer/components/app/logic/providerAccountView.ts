import type { ProviderAccountView } from "@/components/app/types/providerAccount.types";
import type { ProviderAccountResult, ProviderLoginMethod } from "@shared/types/provider/account.types";

/** A read reply becomes a settled view; sign-in replies are not expected from reads and are reported as errors. */
export function providerAccountViewFromRead(result: ProviderAccountResult): ProviderAccountView {
  switch (result.kind) {
    case "account": return { status: "ready", account: result.account, ...(result.connection ? { connection: result.connection } : {}) };
    case "unavailable": return { status: "error", message: result.message };
    case "login":
    case "login-started": return { status: "error", message: "The runtime returned an unexpected sign-in reply. Refresh and try again." };
  }
}

/** The sign-in options a read advertises, or null when the reply carries none so the last known options stay. */
export function providerLoginMethodsFromRead(result: ProviderAccountResult): readonly ProviderLoginMethod[] | null {
  return result.kind === "account" ? result.loginMethods : null;
}

/**
 * Whether a re-read shows the sign-in finished: any signed-in account when none was shown before, and a different one
 * when switching, since the runtime keeps reporting the old account until the browser flow completes.
 */
export function completesSignIn(before: ProviderAccountView | undefined, latest: ProviderAccountView): boolean {
  if (latest.status !== "ready" || latest.account.state !== "signed-in") return false;
  if (before?.status !== "ready" || before.account.state !== "signed-in") return true;
  return before.account.method !== latest.account.method || before.account.label !== latest.account.label;
}
