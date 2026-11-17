import type { IdleCompactionMode } from "@shared/types/personalization/compaction.types";

export interface EffectWorkerOptions {
  now(): string;
  idleCompactionMode(): IdleCompactionMode;
}
