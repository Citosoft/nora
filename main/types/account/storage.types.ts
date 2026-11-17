export type StorageEntries = [string, string][];
export interface StorageMigration {
  readLegacy(): Promise<StorageEntries>;
  readCurrent(): Promise<StorageEntries>;
  writeCurrent(entries: StorageEntries): Promise<void>;
}
