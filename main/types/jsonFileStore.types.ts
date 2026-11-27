export interface JsonFileStore<T> {
  /** Reads and normalises the file; a missing or unreadable file yields the empty value. */
  load(): Promise<T>;
  /** Writes atomically; concurrent saves are serialised. */
  save(value: T): Promise<void>;
}

export interface JsonFileStoreOptions<T> {
  path: string;
  nextId: () => string;
  empty: T;
  /** Validates parsed JSON; throws for content the store must not trust. */
  normalize: (value: unknown) => T;
  /** Reports a file that exists but cannot be parsed (it is then treated as empty, not overwritten). */
  onReadError?: (error: unknown) => void;
}
