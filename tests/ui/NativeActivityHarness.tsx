import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NativeRequest } from "@/components/app/panels/conversations/NativeRequest";
import { NativeTimeline } from "@/components/app/panels/conversations/NativeTimeline";
import type { ApprovalRequest, ConversationRun, RequestResponse, ToolActivity, TimelineItem } from "@shared/types/conversation/contracts.types";

const base = { runId: "run", createdAt: new Date().toISOString() };
const instruction: TimelineItem = { ...base, id: "instruction", kind: "message", role: "user", text: "Check the project", complete: true,
  createdAt: new Date(Date.now() - 65_000).toISOString() };
const initialRun: ConversationRun = { id: "run", conversationId: "activity", instruction: "Check the project", state: "running", attemptId: "attempt",
  nativeTurnId: null, createdAt: new Date(Date.now() - 600_000).toISOString(), updatedAt: base.createdAt, failure: null, usage: null, review: "pending" };
const tools: ToolActivity[] = [
  { ...base, id: "command", kind: "tool", label: "Run command", output: "42 tests passed", state: "completed", details: { category: "command", input: "npm test", detail: "/workspace/nora", exitCode: 0, durationMs: 1250 } },
  { ...base, id: "mcp", kind: "tool", label: "Search documentation", output: "Searching the connected knowledge base…", state: "running", details: { category: "integration", detail: "Team documents", input: '{ "query": "API reference" }' } },
  { ...base, id: "failed", kind: "tool", label: "Fetch page", output: "The server could not be reached.", state: "failed", details: { category: "search", input: "https://example.com" } }
];
const initial: ApprovalRequest = { ...base, id: "approval", nativeId: "native", attemptId: "attempt", kind: "approval", status: "pending",
  expiresAt: new Date(Date.now() + 300_000).toISOString(), title: "Allow this command?",
  details: { kind: "command", command: "npm install", workingDirectory: "/workspace/nora", reason: "Install the dependencies needed to run the project." },
  options: [
    { id: "accept", label: "Allow once", intent: "allow", scope: "once", description: "Allow only this action." },
    { id: "acceptForSession", label: "Allow for this session", intent: "allow", scope: "session", description: "Also allow matching requests for the rest of this session." },
    { id: "decline", label: "Decline", intent: "deny", description: "Decline this action; the agent may continue." },
    { id: "cancel", label: "Stop task", intent: "cancel", description: "Decline this action and interrupt the current task." }
  ] };

export function NativeActivityHarness() {
  const [request, setRequest] = useState(initial);
  const [fail, setFail] = useState(false);
  const [responses, setResponses] = useState<RequestResponse[]>([]);
  const [activity, setActivity] = useState(tools);
  const [run, setRun] = useState(initialRun);
  return <main className="min-h-screen bg-background p-6 text-foreground"><div className="mx-auto max-w-2xl space-y-4">
    <NativeTimeline items={[instruction, ...activity]} runs={[run]} />
    <NativeRequest request={request} busy={false} onRespond={async (response) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (fail) throw new Error("Connection unavailable. Try again.");
      setResponses((current) => [...current, response]);
      setRequest((current) => ({ ...current, status: "responding" }));
    }} />
    <div className="flex flex-wrap gap-4 text-xs">
      <button id="next-tool" onClick={() => setActivity((current) => [...current.map((item) => item.state === "running" ? { ...item, state: "completed" as const } : item),
        { ...base, id: "next", kind: "tool", label: "Read project files", state: "running", output: "Reading…" }])}>Next tool</button>
      <button id="finish-tools" onClick={() => {
        setActivity((current) => current.map((item) => item.state === "running" ? { ...item, state: "completed" } : item));
        setRun((current) => ({ ...current, state: "completed", updatedAt: new Date().toISOString() }));
      }}>Finish tools</button>
      <button id="fail" onClick={() => setFail((current) => !current)}>Toggle failure</button>
      <button id="network" onClick={() => setRequest({ ...initial, id: "network", title: "Allow network access?", details: { kind: "network", target: "https://api.example.com", reason: "Fetch documentation." } })}>Network request</button>
      <button id="files" onClick={() => setRequest({ ...initial, id: "files", title: "Allow file changes?", details: { kind: "files", paths: ["src/main.ts", "src/app.tsx"], reason: "Apply the requested fix." } })}>File request</button>
      <button id="expire" onClick={() => setRequest((current) => ({ ...current, status: "expired" }))}>Expire</button>
    </div>
    <output id="responses" className="sr-only">{JSON.stringify(responses)}</output>
  </div></main>;
}

const root = document.getElementById("app");
if (!root) throw new Error("Activity acceptance root is missing");
createRoot(root).render(<NativeActivityHarness />);
