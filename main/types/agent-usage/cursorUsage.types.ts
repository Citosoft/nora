/** Sign-in state the Cursor desktop app keeps in its `state.vscdb` under `cursorAuth/*`. */
export type CursorAuthState = {
  accessToken: string;
  /** WorkOS user id (the JWT `sub` after its `provider|` prefix), needed to build the session cookie. */
  userId: string;
  expiresAtMs: number | null;
  email: string | null;
  membershipType: string | null;
};

/** `POST cursor.com/api/dashboard/get-current-period-usage`, reduced to the fields Nora shows. */
export type CursorPeriodUsage = {
  billingCycleEndMs: number | null;
  totalPercentUsed: number;
  autoPercentUsed: number | null;
  apiPercentUsed: number | null;
  /** Free usage beyond the plan, in cents. */
  bonusSpendCents: number | null;
};

export type CursorUsageStatusInput = {
  title: string;
  stateDbPath: string;
  nowIso: () => string;
};
