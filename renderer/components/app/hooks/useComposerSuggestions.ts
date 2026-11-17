import { isCompletedComposerMention } from "@/components/app/logic/composerContent";
import { createElement, useCallback, useState } from "react";
import { activeComposerToken, matchMentions } from "@/components/app/logic/composerTokens";
import { formatIssueReference, issueReference } from "@/components/app/logic/forge-items/issueReference";
import { matchWorkspaceIssues } from "@/components/app/logic/forge-items/issueSuggestions";
import { ForgeProviderIcon } from "@/components/app/views/ForgeProviderIcon";
import { useThreadRead } from "./useThreadRead";
import type { ComposerSuggestionOption, ComposerSuggestionsInput } from "@/components/app/types/composerInput.types";

export function useComposerSuggestions({ value, caret, disabled, mentions, issueSource }: ComposerSuggestionsInput) {
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision((current) => current + 1), []);
  const issue = !disabled && issueSource ? activeComposerToken(value, caret, "#") : null;
  const botCandidate = !disabled && mentions?.length ? activeComposerToken(value, caret, "@") : null;
  const bot = botCandidate && mentions && !isCompletedComposerMention(value, caret, botCandidate.start, mentions) ? botCandidate : null;
  const token = issue && (!bot || issue.start > bot.start) ? issue : bot;
  const projectId = token?.trigger === "#" ? issueSource?.projectId : null;
  const identity = projectId ?? "";
  const state = useThreadRead(projectId && issueSource ? async () => ({ projectId, items: await issueSource.read() }) : null,
    identity, String(revision), "Workspace issues could not be loaded.");
  let options: ComposerSuggestionOption[] = [];
  let message: string | undefined;
  let loading = false;
  if (token?.trigger === "#") {
    if (state.status === "ready" && state.value.projectId === projectId) {
      options = matchWorkspaceIssues(state.value.items, token.query).map((item) => {
        const reference = issueReference(item);
        return { id: item.id, name: `#${item.number}`, detail: item.title, insertText: formatIssueReference(reference),
          icon: createElement(ForgeProviderIcon, { provider: reference.provider, className: "size-3.5 shrink-0" }) };
      });
      message = state.value.items.length ? "No matching issues. Try a number or title." : "No open issues in this workspace.";
    } else if (state.status === "failed") message = state.message;
    else { loading = true; message = "Loading workspace issues…"; }
  } else if (token && mentions) options = matchMentions(mentions, token.query);
  return { token, options, message, loading, retry: state.status === "failed" ? retry : undefined,
    label: token?.trigger === "#" ? "Open workspace issues" : "Mention a bot" };
}
