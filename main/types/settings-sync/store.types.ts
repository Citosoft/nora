import type { SyncStore } from "./service.types";

export interface SyncPersistence {
  read(): Promise<SyncStore>;
  save(store: SyncStore): Promise<void>;
  flush(): Promise<void>;
}
