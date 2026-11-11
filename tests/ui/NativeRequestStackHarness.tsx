import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { NativeRequestStack } from "@/components/app/panels/conversations/NativeRequestStack";
import type { ApprovalRequest, RequestResponse, RuntimeRequest } from "@shared/types/conversation/contracts.types";

function approval(index: number): ApprovalRequest {
  return { id: `request-${index}`, nativeId: `native-${index}`, runId: "run", attemptId: "attempt", kind: "approval", status: "pending",
    title: `Allow command ${index}?`, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 300_000).toISOString(),
    details: { kind: "command", command: `echo request-${index}` },
    options: [{ id: "allow", label: "Allow once", intent: "allow" }, { id: "deny", label: "Decline", intent: "deny" }] };
}

export function NativeRequestStackHarness() {
  const [requests, setRequests] = useState<RuntimeRequest[]>([approval(1), approval(2), approval(3)]);
  const [fail, setFail] = useState(false);
  const [visible, setVisible] = useState(true);
  const [responses, setResponses] = useState<{ requestId: string; response: RequestResponse }[]>([]);
  const sequence = useRef(3);
  return <main className="flex h-screen flex-col bg-background text-foreground">
    <div id="transcript" className="min-h-0 flex-1 overflow-auto p-5">{Array.from({ length: 40 }, (_, index) => <p key={index}>Earlier chat message {index}</p>)}</div>
    <div className="mx-auto w-full max-w-[800px] space-y-3 p-5">
      <NativeRequestStack requests={requests} busy={false} visible={visible} onRespond={async (requestId, response) => {
        await new Promise((resolve) => setTimeout(resolve, 120));
        if (fail) throw new Error("Delivery failed. Try again.");
        setResponses((current) => [...current, { requestId, response }]);
        setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: "responding" } : request));
        await new Promise((resolve) => setTimeout(resolve, 400));
        setRequests((current) => current.filter((request) => request.id !== requestId));
      }} />
      <textarea aria-label="Message Nora" className="h-24 w-full rounded-lg border bg-card p-3" />
      <div className="flex gap-4 text-xs">
        <button id="burst" onClick={() => setRequests((current) => [...current, ...Array.from({ length: 20 }, () => approval(++sequence.current))])}>Burst</button>
        <button id="fail" onClick={() => setFail((current) => !current)}>Toggle failure</button>
        <button id="expire" onClick={() => setRequests((current) => current.slice(1))}>Expire first</button>
        <button id="clear" onClick={() => setRequests([])}>Clear</button>
        <button id="hide" onClick={() => setVisible(false)}>Hide thread</button>
        <button id="show" onClick={() => setVisible(true)}>Show thread</button>
      </div>
      <output id="responses" className="sr-only">{JSON.stringify(responses)}</output>
    </div>
  </main>;
}

const root = document.getElementById("app");
if (!root) throw new Error("Request stack acceptance root is missing");
createRoot(root).render(<NativeRequestStackHarness />);
