import type { AppDomainEvent, AppState, AppStateDelta } from "@shared/appTypes";
import type { AppBridge } from "@shared/ipc/types/appGateway.types";

import { invokeIpc } from "./invokeIpc";
import { subscribeToIpcEvent } from "./subscribeToIpcEvent";

export function createAppBridge(): AppBridge {
  return {
    getSnapshot: () => invokeIpc("app:get-snapshot"),
    onStateChanged: (listener) => subscribeToIpcEvent<AppState>("state:changed", listener),
    onStateDelta: (listener) => subscribeToIpcEvent<AppStateDelta>("state:delta", listener),
    onDomainEvents: (listener) => subscribeToIpcEvent<AppDomainEvent[]>("state:domain-events", listener)
  };
}
