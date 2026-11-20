import type { z } from "zod";
import type { appsReplySchema, appsReplyValueSchema, appsRequestSchema } from "@shared/apps/gateway";
import type { AppBuildStep, AppRenderData, AppSummary } from "@shared/types/apps/apps.types";

export type AppsRequest = z.infer<typeof appsRequestSchema>;
export type AppsReply = z.infer<typeof appsReplySchema>;
export type AppsReplyValue = z.infer<typeof appsReplyValueSchema>;
export interface AppsBridge {
  onInstallRequested(listener: (id: string) => void): () => void;
  request(input: AppsRequest): Promise<AppsReplyValue>;
  /** Called with every app whenever one changes; returns an unsubscribe function. */
  onChanged(listener: (apps: AppSummary[]) => void): () => void;
  /** Called with one app's render data whenever a source loads or fails. */
  onData(listener: (data: AppRenderData) => void): () => void;
  /** Called as a builder thread's tools make progress. */
  onBuildStep(listener: (step: AppBuildStep) => void): () => void;
}
