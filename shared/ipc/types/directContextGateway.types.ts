import type { z } from "zod";
import type { directContextModelRequestSchema, directContextPreviewSchema, directContextReplySchema, directContextRequestSchema,
  directContextSectionSchema, directContextTargetOptionSchema, directContextTargetSchema } from "@shared/bots/direct/contextGateway";

export type DirectContextTarget = z.infer<typeof directContextTargetSchema>;
export type DirectContextRequest = z.infer<typeof directContextRequestSchema>;
export type DirectContextSection = z.infer<typeof directContextSectionSchema>;
export type DirectContextModelRequest = z.infer<typeof directContextModelRequestSchema>;
export type DirectContextTargetOption = z.infer<typeof directContextTargetOptionSchema>;
export type DirectContextPreview = z.infer<typeof directContextPreviewSchema>;
export type DirectContextReply = z.infer<typeof directContextReplySchema>;
export interface DirectContextBridge {
  /** What the next message in a direct chat would send to the router and the work thread. */
  preview(input: DirectContextRequest): Promise<DirectContextPreview>;
}
