import type { threadSortSchema } from "@/components/app/logic/thread-workspace/sorting";
import type { z } from "zod";
import type { threadSourceFilterSchema } from "@/components/app/logic/thread-workspace/sources";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ExternalSessionEntry } from "../externalSessions.types";
import type { ThreadNavigationRow } from "./ports.types";

export type ThreadSourceFilter = z.infer<typeof threadSourceFilterSchema>;
export interface ThreadSourceOption { id: ThreadSourceFilter; label: string; providerKind: ProviderBinding["kind"] | null; }
export interface ResumableThreadRow extends Omit<ThreadNavigationRow, "target"> {
  target: { kind: "external"; entry: ExternalSessionEntry; opening: boolean; disabled: boolean };
}
export type ThreadListRow = ThreadNavigationRow | ResumableThreadRow;
export interface ThreadAgeProps { updatedAt: string; now: number; }
export interface ThreadAgeValue { label: string; description: string; }

export type ThreadSort = z.infer<typeof threadSortSchema>;
export interface ThreadSortEntry { id: string; title: string; updatedAt: string; }
export interface ThreadSortOption { id: ThreadSort; label: string; }
