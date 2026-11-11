import type { NativeConversationView } from "@/components/app/types/nativeConversation.types";
import type { ComposerKeyAction, ComposerKeyInput, PromptSuggestion } from "@/components/app/types/composerInput.types";
import type { ProviderCapabilities } from "@shared/types/provider/capabilities.types";

export function selectPromptSuggestion(view: NativeConversationView | null, capabilities: ProviderCapabilities | null): PromptSuggestion | null {
  if (!view || !capabilities?.promptSuggestions || view.header.conversation.archivedAt
    || view.header.activeRuns.length || view.header.queuedRuns.length || view.header.pendingRequests.length) return null;
  const latest = view.runHistory.runs.at(-1);
  return latest?.state === "completed" && latest.promptSuggestion ? { runId: latest.id, text: latest.promptSuggestion } : null;
}

export function visiblePromptSuggestion(suggestion: PromptSuggestion | null, value: string, disabled: boolean, dismissedRunId: string | null): PromptSuggestion | null {
  return !disabled && value.length === 0 && suggestion?.runId !== dismissedRunId ? suggestion : null;
}

export function composerKeyAction(input: ComposerKeyInput): ComposerKeyAction {
  if (input.composing) return null;
  if (input.key === "Enter" && !input.shiftKey) return "submit";
  if (input.shiftKey || input.altKey || input.ctrlKey || input.metaKey) return null;
  if (input.hasSuggestion && input.key === "Tab") return "accept-suggestion";
  if (input.hasSuggestion && input.key === "Escape") return "dismiss-suggestion";
  return null;
}
