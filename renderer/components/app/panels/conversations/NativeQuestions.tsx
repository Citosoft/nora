import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { areQuestionAnswersComplete } from "@shared/conversations/questionAnswers";
import type { NativeQuestionsProps, QuestionAnswers } from "@/components/app/types/nativeQuestions.types";
import { NativeQuestionField } from "./NativeQuestionField";

export function NativeQuestions({ request, disabled, onRespond }: NativeQuestionsProps) {
  const [answers, setAnswers] = useState<QuestionAnswers>({});
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const complete = areQuestionAnswersComplete(request.questions, answers);
  const locked = disabled || sending;
  return <form className="space-y-3" aria-label="Answer agent questions" aria-busy={sending}
    onSubmit={async (event) => {
      event.preventDefault();
      if (locked || submitting.current || !complete || Date.parse(request.expiresAt) <= Date.now()) return;
      submitting.current = true;
      setSending(true);
      try { await onRespond({ kind: "question", answers }); }
      finally { submitting.current = false; setSending(false); }
    }}>
    <div className="max-h-[45vh] space-y-5 overflow-y-auto p-1">
      {request.questions.map((question) => <NativeQuestionField key={question.id} question={question}
        answers={answers[question.id] ?? []} disabled={locked}
        onChange={(values) => setAnswers((current) => ({ ...current, [question.id]: values }))} />)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">{complete ? "Ready to send." : "Answer every question to continue."}</p>
      <Button type="submit" disabled={locked || !complete}>{sending || request.status === "responding" ? "Sending answers…" : "Send answers"}</Button>
    </div>
  </form>;
}
