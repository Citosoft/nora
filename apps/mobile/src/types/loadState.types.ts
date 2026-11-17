/** A remote value's lifecycle; `stale` keeps the last good value visible while a refresh failed. */
export type LoadState<T> =
  | { status: "loading" }
  | { status: "ready"; value: T; refreshing: boolean }
  | { status: "error"; message: string; stale: T | null };

/** A refreshable remote value as hooks hand it to screens. */
export interface SessionResource<T> {
  state: LoadState<T>;
  refresh: () => void;
}
