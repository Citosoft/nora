import type { threadSortSchema } from "@/components/app/logic/thread-workspace/sorting";
import type { z } from "zod";
import type { threadSourceFilterSchema } from "@/components/app/logic/thread-workspace/sources";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";
import type { ExternalSessionEntry } from "../externalSessions.types";
import type { ThreadNavigationRow } from "./ports.types";

export type ThreadSourceFilter = z.infer<typeof threadSourceFilterSchema>;
export interface ThreadSourceOption { id: ThreadSourceFilter; label: string; providerKind: ProviderBinding["kind"] | null; }
/** What an outside thread's row is waiting on while Nora imports it. */
export type ResumableThreadAction = "open" | "pin" | "settle";
export interface ResumableThreadBusy { key: string; action: ResumableThreadAction; }
export interface ResumableThreadRow extends Omit<ThreadNavigationRow, "target"> {
  /** `pending` is this row's own action; `disabled` is set while any outside thread is importing. */
  target: { kind: "external"; entry: ExternalSessionEntry; pending: ResumableThreadAction | null; disabled: boolean };
}
export type ThreadListRow = ThreadNavigationRow | ResumableThreadRow;
export interface ThreadAgeProps { updatedAt: string; now: number; className?: string; }
/** The row's trailing slot: the age, swapped for the pin control while the row is hovered or focused. */
export interface ThreadAgePinSlotProps {
  updatedAt: string;
  now: number;
  title: string;
  pinned: boolean;
  /** Absent for rows that cannot be pinned, which keep showing their age. */
  onTogglePin: (() => void) | null;
  /** True while an outside thread is importing, when another import cannot start. */
  disabled?: boolean;
}
export interface ThreadAgeValue { label: string; description: string; }

export type ThreadSort = z.infer<typeof threadSortSchema>;
export interface ThreadSortEntry { id: string; title: string; updatedAt: string; }
export interface ThreadSortOption { id: ThreadSort; label: string; }
