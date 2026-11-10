import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import type { WorkspaceReview } from "@shared/types/conversation/review.types";

export type WorkspaceReviewer = (workspace: WorkspaceRef) => Promise<WorkspaceReview>;
