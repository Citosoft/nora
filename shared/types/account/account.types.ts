export interface AccountUser {
  id: string;
  name: string;
  imageUrl: string | null;
}

export type AccountState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; user: AccountUser }
  | { status: "error"; message: string };

export interface AccountConfig { publishableKey: string; }
export type AccountAction = "manage" | "sign-out";

export interface AccountBridge {
  read(): Promise<AccountState>;
  open(action?: AccountAction): Promise<void>;
  onOpen(listener: (action: AccountAction) => void): () => void;
  onChanged(listener: (state: AccountState) => void): () => void;
}

/** Session integration available only in Nora's trusted main frame. */
export interface AccountSessionBridge {
  config(): Promise<AccountConfig>;
  publish(state: AccountState, sessionId?: string | null): Promise<void>;
}
