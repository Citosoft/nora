import type { AccountBridge } from "@shared/types/account/account.types";

export const accountClient: AccountBridge = {
  read: () => window.nora.account.read(),
  open: (action) => window.nora.account.open(action),
  onOpen: (listener) => window.nora.account.onOpen(listener),
  onChanged: (listener) => window.nora.account.onChanged(listener)
};
