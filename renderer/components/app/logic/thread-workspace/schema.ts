import { z } from "zod";
import { createConversationCommandSchema, submitConversationCommandSchema, providerBindingSchema, conversationSourceSchema } from "@shared/conversations/contracts";
import { roleSelectionSchema } from "@shared/personalization/contracts";

const id = z.string().min(1).max(512);
export const nativeDraftIntentSchema = z.object({ create: createConversationCommandSchema.nullable(), submit: submitConversationCommandSchema }).strict()
  .refine((value) => !value.create || value.create.conversationId === value.submit.conversationId, "Instruction identity does not match its thread");
export const threadTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("draft") }).strict(),
  z.object({ kind: z.literal("thread"), conversationId: id }).strict()
]);
export const threadDocumentSchema = z.object({
  id, workspaceId: id, source: conversationSourceSchema.optional(), target: threadTargetSchema, role: roleSelectionSchema.nullable(),
  text: z.string().max(2_000_000), provider: providerBindingSchema.nullable(),
  pending: nativeDraftIntentSchema.nullable(), updatedAt: z.string().datetime()
}).strict();
export const threadLayoutSchema = z.object({ version: z.literal(1), environmentId: id,
  focusedWorkspaceId: id.nullable(), activeId: id.nullable(), documents: z.array(threadDocumentSchema).max(500),
  openIds: z.array(id).max(500), pinnedThreadIds: z.array(id).max(10_000)
}).strict().superRefine((layout, context) => {
  const documents = new Map(layout.documents.map((document) => [document.id, document]));
  const threadIds = layout.documents.flatMap((document) => document.target.kind === "thread" ? [document.target.conversationId]
    : document.pending ? [document.pending.submit.conversationId] : []);
  if (documents.size !== layout.documents.length || new Set(layout.openIds).size !== layout.openIds.length
    || new Set(threadIds).size !== threadIds.length
    || new Set(layout.pinnedThreadIds).size !== layout.pinnedThreadIds.length || layout.openIds.some((key) => !documents.has(key))
    || (layout.activeId && (!layout.openIds.includes(layout.activeId) || documents.get(layout.activeId)?.workspaceId !== layout.focusedWorkspaceId))) {
    context.addIssue({ code: "custom", message: "Thread view references are inconsistent" });
  }
  for (const document of layout.documents) {
    const intent = document.pending;
    if ((document.target.kind === "draft" && !document.role)
      || (intent && document.target.kind === "thread" && (intent.create || intent.submit.conversationId !== document.target.conversationId))
      || (intent && document.target.kind === "draft" && (!intent.create || intent.create.workspace.projectId !== document.workspaceId
        || intent.create.workspace.environmentId !== layout.environmentId))) {
      context.addIssue({ code: "custom", message: "Pending instruction does not belong to its saved draft" });
    }
  }
});
