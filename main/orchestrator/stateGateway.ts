import type { AppState } from "@shared/appTypes";
import { StateStore } from "../stateStore";

export class StateGateway {
  constructor(private readonly store: StateStore<AppState>) {}

  getSnapshot(): AppState {
    return this.store.getState();
  }

  setState(partialState: Partial<AppState>): void {
    this.store.setState(partialState);
  }

  updateState(updater: (state: AppState) => AppState): void {
    this.store.update(updater);
  }
}
