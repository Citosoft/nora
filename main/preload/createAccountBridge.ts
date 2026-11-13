import { ACCOUNT_CHANNELS, accountActionSchema, accountStateSchema } from "@shared/account/contracts";
import type { AccountBridge } from "@shared/types/account/account.types";
import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createAccountBridge(): AccountBridge {
  return {
    async read() { return accountStateSchema.parse(await invokeIpc(ACCOUNT_CHANNELS.read)); },
    async open(action = "manage") { await invokeIpc(ACCOUNT_CHANNELS.open, action); },
    onOpen(listener) {
      return subscribeToIpcEvent<unknown>(ACCOUNT_CHANNELS.open, (input) => {
        const parsed = accountActionSchema.safeParse(input);
        if (parsed.success) listener(parsed.data);
      });
    },
    onChanged(listener) {
      return subscribeToIpcEvent<unknown>(ACCOUNT_CHANNELS.changed, (input) => {
        const parsed = accountStateSchema.safeParse(input);
        if (parsed.success) listener(parsed.data);
      });
    }
  };
}
