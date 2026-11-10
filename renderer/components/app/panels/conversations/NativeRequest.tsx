import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NativeRequestProps } from "@/components/app/types/nativePanels.types";

export function NativeRequest({ request, busy, onRespond }: NativeRequestProps) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const disabled = busy || request.status !== "pending" || Date.parse(request.expiresAt) <= Date.now();
  return <section className="space-y-3 rounded-lg border p-4" aria-label="Agent request">
    <h2 className="font-medium">{request.title}</h2>
    {request.kind === "approval" ? <div className="flex flex-wrap gap-2">{request.options.map((option) => <Button key={option.id} disabled={disabled}
      onClick={() => void onRespond({ kind: "approval", optionId: option.id })}>{option.label}</Button>)}</div>
      : <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (!disabled) void onRespond({ kind: "question", answers }); }}>
        {request.questions.map((question) => <fieldset key={question.id} disabled={disabled} className="space-y-2"><legend className="text-sm">{question.text}</legend>
          {question.options.length ? question.options.map((option) => <label key={option} className="flex items-center gap-2 text-sm">
            <input type={question.multiple ? "checkbox" : "radio"} name={`${request.id}-${question.id}`} checked={answers[question.id]?.includes(option) ?? false}
              onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: question.multiple
                ? event.target.checked ? [...(current[question.id] ?? []), option] : (current[question.id] ?? []).filter((entry) => entry !== option) : [option] }))} />{option}</label>)
            : <Input aria-label={question.text} value={answers[question.id]?.[0] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: [event.target.value] }))} />}
        </fieldset>)}
        <Button type="submit" disabled={disabled || request.questions.some((question) => !answers[question.id]?.some((value) => value.trim()))}>Send answers</Button>
      </form>}
    {disabled && <p className="text-xs text-muted-foreground">{request.status === "responding" ? "Delivering response…" : "Request is no longer answerable."}</p>}
  </section>;
}
