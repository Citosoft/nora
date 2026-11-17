import type { TimelineItem } from "@shared/types/conversation/contracts.types";

export type TimelineIdentity = Pick<TimelineItem, "id" | "runId" | "createdAt">;
