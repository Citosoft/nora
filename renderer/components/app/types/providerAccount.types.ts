import type { ReactNode } from "react";
import type { ProviderAccount, ProviderConnectionKind, ProviderLoginMethod } from "@shared/types/provider/account.types";

/** Settings view of one provider runtime's account, keyed by native provider kind. */
export type ProviderAccountView =
  | { status: "loading" }
  | { status: "ready"; account: ProviderAccount; connection?: ProviderConnectionKind }
  | { status: "signing-in" }
  | { status: "error"; message: string };

/** `loginMethods` empty means the runtime has one default sign-in; `onSignIn` receives the picked method's id, if any. */
export interface ProviderAccountStatusProps {
  providerLabel: string; view: ProviderAccountView; loginMethods: readonly ProviderLoginMethod[]; onSignIn(methodId?: string): void;
}
/** `label` names the action ("Sign in", "Switch account"); with several methods it opens a menu of them. */
export interface ProviderSignInButtonProps {
  providerLabel: string; label: string; loginMethods: readonly ProviderLoginMethod[]; onSignIn(methodId?: string): void;
}
export interface ProviderAccountRowProps { children: ReactNode; action?: ReactNode; }
