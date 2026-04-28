import type { AppDomainEvent, AppState, AppStateDelta } from "../../appTypes";

export interface AppBridge {
  getSnapshot: () => Promise<AppState>;
  onStateChanged: (listener: (snapshot: AppState) => void) => () => void;
  onStateDelta: (listener: (delta: AppStateDelta) => void) => () => void;
  onDomainEvents: (listener: (events: AppDomainEvent[]) => void) => () => void;
}

export interface AppGateway extends AppBridge {}
