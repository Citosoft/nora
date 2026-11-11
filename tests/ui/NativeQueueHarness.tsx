import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NativeQueue } from "@/components/app/panels/conversations/NativeQueue";
import type { ConversationCommand, ConversationRun } from "@shared/types/conversation/contracts.types";

const initialRuns: ConversationRun[] = ["Review the changes and run the focused tests", "Update the release notes", "Explain the result"].map((instruction, index) => ({
  id: `queued-${index}`, conversationId: "queue", instruction, state: "queued", attemptId: `attempt-${index}`, nativeTurnId: null,
  createdAt: "2026-11-10T10:00:00.000Z", updatedAt: "2026-11-10T10:00:00.000Z", failure: null, usage: null, review: "pending"
}));

export function NativeQueueHarness() {
  const [runs, setRuns] = useState(initialRuns);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [supportsSteering, setSupportsSteering] = useState(false);
  const [lastCommand, setLastCommand] = useState<ConversationCommand | null>(null);
  const execute = async (command: ConversationCommand): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (fail) throw new Error("Queue update failed. Try again.");
    setLastCommand(command);
    switch (command.kind) {
      case "edit-queued": setRuns((current) => current.map((run) => run.id === command.runId ? { ...run, instruction: command.instruction } : run)); break;
      case "remove-queued": setRuns((current) => current.filter((run) => run.id !== command.runId)); break;
      case "steer-queued": setRuns((current) => current.filter((run) => run.id !== command.runId)); break;
      case "continue-queue": setPaused(false); break;
      default: throw new Error("Unexpected queue command");
    }
  };
  return <main className="h-screen bg-background p-6 text-foreground"><div className="mx-auto max-w-2xl space-y-4 pt-36">
    <div><NativeQueue conversationId="queue" runs={runs} paused={paused} busy={busy} execute={execute} steerTarget={supportsSteering ? "active" : null} /><form className="rounded-lg border bg-card p-3"><textarea aria-label="Chat input" className="min-h-24 w-full bg-transparent" placeholder="Queue your next instruction…" /></form></div>
    <div className="flex gap-4 text-xs"><button id="pause" onClick={() => setPaused(true)}>Pause</button><button id="busy" onClick={() => setBusy((current) => !current)}>Busy</button><button id="fail" onClick={() => setFail((current) => !current)}>Fail</button></div>
    <button id="reset" onClick={() => setRuns(initialRuns)}>Reset queue</button><button id="steering" onClick={() => setSupportsSteering((current) => !current)}>Toggle steering support</button>
    <output id="last-command" className="sr-only">{JSON.stringify(lastCommand)}</output>
  </div></main>;
}
const root = document.getElementById("app");
if (!root) throw new Error("Queue acceptance root is missing");
createRoot(root).render(<NativeQueueHarness />);
