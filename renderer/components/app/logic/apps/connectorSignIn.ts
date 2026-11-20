import { appSpecConnectorIds } from "@shared/apps/portable";
import type { AppSpec } from "@shared/types/apps/apps.types";
import type { Connector } from "@shared/types/connectors/connectors.types";
import type { NoraConnectorAction } from "@/components/app/types/noraConnectors.types";

/** The app's OAuth connectors still waiting for the user's account, including any mid sign-in so their button stays in place. */
export function connectorsAwaitingSignIn(spec: Pick<AppSpec, "sources" | "actions">, connectors: readonly Connector[], pending: (id: string) => NoraConnectorAction | undefined): Connector[] {
  const ids = new Set(appSpecConnectorIds(spec));
  return connectors.filter((entry) => ids.has(entry.id) && entry.auth.kind === "oauth"
    && (entry.status === "needs-auth" || (entry.status === "failed" && !entry.auth.signedIn) || pending(entry.id) === "sign-in"));
}

/** "Notion", "Notion and Linear", "Notion, Linear and 2 more": short enough for one banner line. */
export function signInNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}
