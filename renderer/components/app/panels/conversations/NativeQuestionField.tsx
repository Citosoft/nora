import { useId } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { selectQuestionOption, setOtherQuestionAnswer } from "@/components/app/logic/nativeQuestionAnswers";
import type { NativeQuestionFieldProps } from "@/components/app/types/nativeQuestions.types";

export function NativeQuestionField({ question, answers, disabled, onChange }: NativeQuestionFieldProps) {
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const otherAnswer = answers.find((answer) => !question.options.includes(answer));
  return <fieldset disabled={disabled} aria-describedby={hintId} className="min-w-0 space-y-2">
    <legend className="text-sm font-medium leading-relaxed">{question.text}</legend>
    <p id={hintId} className="text-xs text-muted-foreground">
      {question.options.length ? question.multiple ? "Select all that apply." : "Select one option." : "Enter your answer."}
    </p>
    {question.options.length ? <div className="space-y-2">{question.options.map((option) => {
      const selected = answers.includes(option);
      return <label key={option} className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
        selected ? "border-primary/60 bg-primary/5" : "border-border hover:bg-accent/50",
        disabled && "cursor-not-allowed opacity-60"
      )}>
        <input type={question.multiple ? "checkbox" : "radio"} name={fieldId} value={option} checked={selected}
          className="mt-0.5 size-4 shrink-0 accent-primary" aria-describedby={hintId}
          onChange={(event) => onChange(selectQuestionOption(question, answers, option, event.target.checked))} />
        <span className="min-w-0 whitespace-pre-wrap break-words">{option}</span>
      </label>;
    })}
      {question.allowOther && <div className="space-y-2 rounded-md border p-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type={question.multiple ? "checkbox" : "radio"} name={fieldId} checked={otherAnswer !== undefined}
            className="size-4 accent-primary" onChange={(event) => onChange(event.target.checked
              ? setOtherQuestionAnswer(question, answers, "") : answers.filter((answer) => question.options.includes(answer)))} />
          Other
        </label>
        {otherAnswer !== undefined && <Input aria-label={`Other answer: ${question.text}`} placeholder="Your answer…" value={otherAnswer}
          onChange={(event) => onChange(setOtherQuestionAnswer(question, answers, event.target.value))} />}
      </div>}
    </div> : <Input aria-label={question.text} aria-describedby={hintId} placeholder="Your answer…"
      value={answers[0] ?? ""} onChange={(event) => onChange([event.target.value])} />}
  </fieldset>;
}
