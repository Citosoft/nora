export class StateStore<TState> {
  private state: TState;
  private readonly listeners = new Set<(state: TState) => void>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getState(): TState {
    return this.state;
  }

  setState(partialState: Partial<TState>): void {
    const nextState = {
      ...this.state,
      ...partialState
    };
    if (nextState === this.state) {
      return;
    }
    this.state = nextState;
    this.emit();
  }

  update(updater: (state: TState) => TState): void {
    const nextState = updater(this.state);
    if (nextState === this.state) {
      return;
    }
    this.state = nextState;
    this.emit();
  }

  subscribe(listener: (state: TState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
