import type { ProviderAccountView } from "@/components/app/types/providerAccount.types";
import type { ProviderAccountResult } from "@shared/types/provider/account.types";

/** A read reply becomes a settled view; sign-in replies are not expected from reads and are reported as errors. */
export function providerAccountViewFromRead(result: ProviderAccountResult): ProviderAccountView {
  switch (result.kind) {
    case "account": return { status: "ready", account: result.account };
    case "unavailable": return { status: "error", message: result.message };
    case "login":
    case "login-started": return { status: "error", message: "The runtime returned an unexpected sign-in reply. Refresh and try again." };
  }
}
