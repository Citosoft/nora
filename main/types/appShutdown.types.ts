export interface AppShutdownDeps {
  shutdown(): Promise<void>;
  quit(): void;
  onFailure(message: string): void;
}

export interface AppQuitEvent {
  preventDefault(): void;
}
