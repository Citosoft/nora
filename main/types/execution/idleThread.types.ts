import type { StoreReader } from "./store.types";

export type IdleThreadStore = Pick<StoreReader, "header" | "history" | "hasBackgroundActivity" | "writers" | "checkpointReservations">;
