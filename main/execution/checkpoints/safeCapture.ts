import type { CheckpointCapture, TurnCheckpoints } from "@main/types/execution/checkpoints.types";
import type { WorkspaceRef } from "@shared/types/conversation/contracts.types";
import { checkpointCaptureSchema } from "./schema";

export async function safeCapture(checkpoints: TurnCheckpoints, workspace: WorkspaceRef): Promise<CheckpointCapture> {
  try { return checkpointCaptureSchema.parse(await checkpoints.capture(workspace)); }
  catch { return { status: "unavailable", reason: "capture-failed" }; }
}
