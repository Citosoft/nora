import { noraWorkspaceClient } from "@/components/app/clients/noraWorkspaceClient";
import {
  buildForgeReviewInstruction,
  createForgeReviewHandoffRelativePath
} from "@/components/app/logic/forgeReviewHandoff";
import type { ForgeReviewCommentSelection } from "@/components/app/types/forgeReviewHandoff.types";
import type { ForgeWorkItemDetail } from "@shared/appTypes";

export async function prepareLoopRunReviewHandoff(input: {
  projectId: string;
  detail: ForgeWorkItemDetail;
  selections: ForgeReviewCommentSelection[];
}): Promise<string> {
  const content = buildForgeReviewInstruction(input.detail, input.selections);
  if (!content.trim()) {
    throw new Error("Selected review comments did not produce a handoff file.");
  }

  const relativePath = createForgeReviewHandoffRelativePath(input.detail);
  await noraWorkspaceClient.writeWorkspaceFile({
    projectId: input.projectId,
    path: relativePath,
    content
  });
  return relativePath;
}
