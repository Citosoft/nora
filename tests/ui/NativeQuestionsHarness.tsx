import { useState } from "react";
import { createRoot } from "react-dom/client";
import { NativeRequest } from "@/components/app/panels/conversations/NativeRequest";
import type { RequestResponse } from "@shared/types/conversation/contracts.types";
import type { QuestionRequest } from "@/components/app/types/nativeQuestions.types";

const initialRequest: QuestionRequest = {
  kind: "question", id: "request", nativeId: "native", runId: "run", attemptId: "attempt", title: "Nora needs your input",
  status: "pending", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
  questions: [
    { id: "pet", text: "Do you prefer dogs or cats?", options: ["Dogs", "Cats"], multiple: false, allowOther: true },
    { id: "activities", text: "Which activities do you enjoy?", options: ["Walking", "Reading", "Cooking"], multiple: true },
    { id: "details", text: "Anything else to consider?", options: [], multiple: false }
  ]
};

export function NativeQuestionsHarness() {
  const [request, setRequest] = useState(initialRequest);
  const [busy, setBusy] = useState(false);
  const [responses, setResponses] = useState<RequestResponse[]>([]);
  return <main className="min-h-screen bg-background p-8 text-foreground">
    <div className="mx-auto max-w-2xl"><NativeRequest request={request} busy={busy} onRespond={async (response) => {
      setResponses((current) => [...current, response]);
      setRequest((current) => ({ ...current, status: "responding" }));
    }} /></div>
    <div className="mt-8 flex gap-4">
      <button id="busy" onClick={() => setBusy((current) => !current)}>Toggle busy</button>
      <button id="reset" onClick={() => setRequest({ ...initialRequest, id: "next-request" })}>New question</button>
      <button id="expire" onClick={() => setRequest((current) => ({ ...current, status: "expired" }))}>Expire</button>
    </div>
    <output id="responses" className="sr-only">{JSON.stringify(responses)}</output>
  </main>;
}

const root = document.getElementById("app");
if (!root) throw new Error("Question acceptance root is missing");
createRoot(root).render(<NativeQuestionsHarness />);
