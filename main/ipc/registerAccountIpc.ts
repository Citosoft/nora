import { ACCOUNT_CHANNELS, accountActionSchema, accountReportSchema } from "@shared/account/contracts";
import type { AccountIpcDeps } from "@main/types/account/ipc.types";

export function registerAccountIpc({ ipc, runtime, isAllowedSender }: AccountIpcDeps): () => void {
  ipc.handle(ACCOUNT_CHANNELS.read, (event) => {
    if (!isAllowedSender(event)) throw new Error("This window cannot access your account.");
    return runtime.state();
  });
  ipc.handle(ACCOUNT_CHANNELS.open, (event, input: unknown) => {
    if (!isAllowedSender(event)) throw new Error("This window cannot open your account.");
    runtime.open(accountActionSchema.parse(input ?? "manage"));
  });
  ipc.handle(ACCOUNT_CHANNELS.config, (event) => {
    if (!runtime.isAccountSender(event)) throw new Error("This window cannot configure account services.");
    return runtime.config();
  });
  ipc.handle(ACCOUNT_CHANNELS.publish, (event, input: unknown) => {
    if (!runtime.isAccountSender(event)) throw new Error("This window cannot update your account.");
    const report = accountReportSchema.parse(input);
    runtime.publish(report.state, report.sessionId);
  });
  return () => {
    for (const channel of [ACCOUNT_CHANNELS.read, ACCOUNT_CHANNELS.open, ACCOUNT_CHANNELS.config, ACCOUNT_CHANNELS.publish]) ipc.removeHandler(channel);
  };
}
