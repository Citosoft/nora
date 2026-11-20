import { useSecretPrompts } from "@/components/app/hooks/useSecretPrompts";
import type { SecretPromptStackProps } from "@/components/app/types/secretPrompts.types";
import { SecretInputCard } from "./SecretInputCard";
import { SecretUseCard } from "./SecretUseCard";

/** Secret prompts waiting on the user for this thread, answered one at a time above the composer. */
export function SecretPromptStack({ conversationId }: SecretPromptStackProps) {
  const { prompts, answer } = useSecretPrompts(conversationId);
  const prompt = prompts[0];
  if (!prompt) return null;
  return <div className="space-y-2" aria-label="Pending secret requests">
    {prompts.length > 1 && <p role="status" className="text-xs text-muted-foreground">{prompts.length} secret requests pending · Respond one at a time</p>}
    {prompt.kind === "input" ? <SecretInputCard key={prompt.id} prompt={prompt} onAnswer={answer} />
      : <SecretUseCard key={prompt.id} prompt={prompt} onAnswer={answer} />}
  </div>;
}
