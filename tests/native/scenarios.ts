import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AcceptanceContext } from "./types/acceptance.types";
import { settle, until } from "./observe";

export async function instruction(context: AcceptanceContext, id: string, text: string): Promise<void> {
  await context.host.execute({ kind: "submit", commandId: `submit:${id}`, conversationId: "acceptance", runId: id, instruction: text });
  await settle(context, id);
  const run = context.view.runs.get(id);
  context.checks.push({ name: id, status: run?.state === "completed" ? "passed" : "failed", detail: run?.failure?.code ?? run?.state ?? "missing" });
  if (run?.state !== "completed") throw new Error("Native turn did not complete");
  await until(() => context.view.runs.get(id)?.review !== "pending");
}

export async function startAndEdit(context: AcceptanceContext, workspacePath: string): Promise<string> {
  await instruction(context, "start", "Reply with exactly NORA_NATIVE_START_OK. Do not call tools.");
  const nativeId = context.host.header("acceptance")?.conversation.nativeConversationId;
  if (!nativeId) throw new Error("No native identity was persisted");
  await instruction(context, "follow-up", "What exact marker did you reply with in the previous turn? Reply only with that marker and do not call tools.");
  const recalled = [...context.view.items.values()].some((item) => item.runId === "follow-up" && item.kind === "message"
    && item.role === "assistant" && item.text.includes("NORA_NATIVE_START_OK"));
  context.checks.push({ name: "native-follow-up", status: recalled && context.host.header("acceptance")?.conversation.nativeConversationId === nativeId ? "passed" : "failed", detail: "same-native-session-and-recalled-context" });
  await edit(context, workspacePath);
  context.checks.push({ name: "streaming", status: context.view.streamedRuns.size ? "passed" : "unverified", detail: "partial-assistant-items" });
  return nativeId;
}

export async function edit(context: AcceptanceContext, workspacePath: string): Promise<void> {
  await instruction(context, "edit", "Edit only note.md in this temporary workspace: preserve its existing line and append exactly NORA_NATIVE_EDIT_OK on a new line. Request approval if needed. Do not access other files or run unrelated commands. Then reply DONE.");
  const content = await readFile(join(workspacePath, "note.md"), "utf8");
  const item = [...context.view.items.values()].find((entry) => entry.kind === "review" && entry.runId === "edit");
  const validReview = item?.kind === "review" && item.result.status === "ready" && item.result.scope === "turn"
    && item.result.changes.some((change) => change.path === "note.md" && change.patch?.includes("+NORA_NATIVE_EDIT_OK"));
  context.checks.push({ name: "real-edit-checkpoints", status: content.includes("Pre-existing acceptance note\nNORA_NATIVE_EDIT_OK") && validReview ? "passed" : "failed", detail: "saved-before-after-patch" });
  const approval = [...context.view.requests.values()].some((request) => request.kind === "approval" && request.status === "resolved");
  context.checks.push({ name: "native-approval", status: approval ? "passed" : "unverified", detail: approval ? "confirmed-response" : "runtime-did-not-request-approval" });
}

export async function interrupt(context: AcceptanceContext): Promise<void> {
  await context.host.execute({ kind: "submit", commandId: "submit:interrupt", conversationId: "acceptance", runId: "interrupt",
    instruction: "Produce a numbered list of 10000 distinct words, one per line. Do not call any tools." });
  await until(() => context.view.runs.get("interrupt")?.state === "running" || context.view.runs.get("interrupt")?.state === "failed");
  if (context.view.runs.get("interrupt")?.state === "running") await context.host.execute({ kind: "interrupt", commandId: "stop:interrupt", conversationId: "acceptance", runId: "interrupt" });
  await settle(context, "interrupt");
  context.checks.push({ name: "native-interrupt", status: context.view.runs.get("interrupt")?.state === "interrupted" ? "passed" : "failed", detail: context.view.runs.get("interrupt")?.state ?? "missing" });
}
