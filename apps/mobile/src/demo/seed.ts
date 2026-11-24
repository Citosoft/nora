import type { Conversation, ConversationRun, RuntimeRequest, TimelineItem } from "@shared/types/conversation/contracts.types";
import type { ConversationView } from "@shared/types/conversation/conversationView.types";
import type { BotDefinition } from "@shared/types/bots/bots.types";
import type { RemoteProject } from "@shared/types/remote-access/runtimeApi.types";

export const demoRuntimeId = "nora-demo-computer";
export const demoProjects: RemoteProject[] = [{ id: "demo-studio", name: "Demo Studio", kind: "repository" }, { id: "demo-personal", name: "Personal", kind: "personal" }];
export const demoProvider = { kind: "claude", instanceId: "demo-claude", model: "claude-opus", reasoning: null, permissionPolicy: "ask" } as const;
export const demoBots: BotDefinition[] = [
  { id: "atlas", name: "Atlas", role: "Coding companion", instructions: "Help build and review the demo project.",
    binding: demoProvider, avatar: { seed: 7, shape: "squircle", palette: "teal", eyes: "dot" }, scope: { kind: "global" }, revision: 1 },
  { id: "nova", name: "Nova", role: "Quality reviewer", instructions: "Review changes and explain test results.",
    binding: demoProvider, avatar: { seed: 23, shape: "flower", palette: "violet", eyes: "oval" }, scope: { kind: "global" }, revision: 1 }
];
export function demoConversation(id: string, title: string, now: string, projectId = "demo-studio"): Conversation {
  return { id, title, workspace: { projectId, environmentId: "demo-desktop", checkoutId: "demo-main", path: "/demo/studio", branch: "demo", access: "write" },
    provider: demoProvider, parentId: null, nativeConversationId: null, archivedAt: null, createdAt: now, updatedAt: now, queuePaused: false };
}
export function demoRun(id: string, conversationId: string, instruction: string, state: ConversationRun["state"], now: string): ConversationRun {
  return { id, conversationId, instruction, state, attemptId: id + "-attempt", nativeTurnId: null, createdAt: now, updatedAt: now, failure: null, usage: null, review: "pending" };
}
export function demoView(conversation: Conversation, runs: ConversationRun[] = [], items: TimelineItem[] = [], requests: RuntimeRequest[] = []): ConversationView {
  const finished = new Set(["completed", "failed", "interrupted"]);
  return { header: { schemaVersion: 1, cursor: 0, conversation, activeRuns: runs.filter(r => !finished.has(r.state)), queuedRuns: [], pendingRequests: requests },
    items, nextBefore: null, runHistory: { runs, nextBefore: null } };
}
export function seedThreads(now: string): Map<string, ConversationView> {
  const chat = demoConversation("demo-welcome", "Explore Nora", now);
  const approval = demoConversation("demo-approval", "Review the release changes", now);
  const question = demoConversation("demo-question", "Plan the next feature", now);
  const completed = demoConversation("demo-completed", "Check the release", now);
  const running = demoConversation("demo-running", "Review accessibility", now);
  const base = { attemptId: "demo-attempt", status: "pending" as const, createdAt: now, expiresAt: new Date(Date.parse(now) + 86_400_000).toISOString() };
  const requests: RuntimeRequest[] = [
    { ...base, id: "demo-approval-request", runId: "demo-approval-run", nativeId: "demo-approval-native", title: "Run the release checks?", kind: "approval",
      details: { kind: "command", command: "npm run check", workingDirectory: "/demo/studio", reason: "Verify the sample changes before release. No command will actually run in demo mode." },
      options: [{ id: "allow", label: "Allow", intent: "allow", scope: "once" }, { id: "deny", label: "Decline", intent: "deny", scope: "once" }] },
    { ...base, id: "demo-question-request", runId: "demo-question-run", nativeId: "demo-question-native", title: "Choose the next feature", kind: "question",
      questions: [{ id: "feature", text: "Which feature should we explore next?", options: ["Offline access", "Notifications"], multiple: false, allowOther: true }] }
  ];
  const message = (id: string, runId: string, text: string): TimelineItem => ({ id, runId, createdAt: now, kind: "message", role: "assistant", text, complete: true });
  return new Map([
    [chat.id, demoView(chat, [], [message("demo-intro", "demo-intro-run", "Welcome to Nora’s offline demo. Try sending a message, starting a chat, talking to a bot, answering requests in your inbox, or changing settings. All responses are simulated; no computer is connected and no code is executed.")])],
    [approval.id, demoView(approval, [demoRun("demo-approval-run", approval.id, "Review the release changes", "awaiting-approval", now)],
      [message("demo-review-message", "demo-approval-run", "The sample changes are ready. May I run the release checks?")], [requests[0]!])],
    [question.id, demoView(question, [demoRun("demo-question-run", question.id, "Plan the next feature", "awaiting-input", now)], [], [requests[1]!])],
    [completed.id, demoView(completed, [demoRun("demo-completed-run", completed.id, "Check the release", "completed", now)],
      [message("demo-completed-message", "demo-completed-run", "The sample release checks passed. This is a simulated result."),
       { id: "demo-tool", runId: "demo-completed-run", createdAt: now, kind: "tool", label: "Run checks", output: "Sample checks: 12 passed", state: "completed", details: { category: "command", input: "npm run check", exitCode: 0 } }])],
    [running.id, demoView(running, [demoRun("demo-running-run", running.id, "Review accessibility", "running", now)],
      [message("demo-running-message", "demo-running-run", "This sample task is running. Try the Stop control to interrupt it.")])]
  ]);
}
