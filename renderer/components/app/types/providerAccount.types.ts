import type { ReactNode } from "react";
import type { ProviderAccount } from "@shared/types/provider/account.types";

/** Settings view of one provider runtime's account, keyed by native provider kind. */
export type ProviderAccountView =
  | { status: "loading" }
  | { status: "ready"; account: ProviderAccount }
  | { status: "signing-in" }
  | { status: "error"; message: string };

export interface ProviderAccountStatusProps { providerLabel: string; view: ProviderAccountView; onSignIn(): void; }
export interface ProviderAccountRowProps { children: ReactNode; action?: ReactNode; }
