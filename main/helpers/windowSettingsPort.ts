import { randomUUID } from "node:crypto";
import type { MainWindowSettingsPort, PendingWindowSettings, WindowSettingsPortOptions } from "@main/types/nora-tools/windowSettings.types";

/** Request the window's current preferences and wait until its existing setters have applied changes. */
export function createWindowSettingsPort(options: WindowSettingsPortOptions): MainWindowSettingsPort {
  const pending = new Map<string, PendingWindowSettings>();
  return {
    request(patch) {
      return new Promise((resolve, reject) => {
        const id = randomUUID();
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("The Settings window did not respond. Open Nora and try again."));
        }, options.timeoutMs ?? 10_000);
        pending.set(id, { resolve, reject, timer });
        try { options.send({ id, patch }); }
        catch (error) {
          pending.delete(id); clearTimeout(timer);
          reject(error instanceof Error ? error : new Error("The Settings window is unavailable."));
        }
      });
    },
    receive(reply) {
      const request = pending.get(reply.id);
      if (!request) return;
      pending.delete(reply.id); clearTimeout(request.timer);
      if (reply.status === "success") request.resolve(reply.settings);
      else request.reject(new Error(reply.message));
    }
  };
}
