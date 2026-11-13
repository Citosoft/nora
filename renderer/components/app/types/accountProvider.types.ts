import type { ReactNode } from "react";
import type { AccountConfig } from "@shared/types/account/account.types";

export interface AccountProviderProps { config: AccountConfig; children: ReactNode; }
export interface SessionBoundaryProps { children: ReactNode; fallback: ReactNode; }
export interface SessionBoundaryState { failed: boolean; }
