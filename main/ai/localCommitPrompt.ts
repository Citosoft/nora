import type { ChangeEntry } from "@shared/appTypes";
import type { LocalTextGenerationRequest } from "@main/types/localTextGeneration.types";

const MAX_LOCAL_TOP_FILES = 10;

const LOCAL_COMMIT_SYSTEM_PROMPT =
  "You write git commit subject lines. Output ONLY the subject (max 72 chars). Use imperative mood. No quotes. Summarize the main feature or fix, not individual file names.";

export function buildLocalCommitMessageRequest(changes: ChangeEntry[]): LocalTextGenerationRequest {
  return {
    system: LOCAL_COMMIT_SYSTEM_PROMPT,
    user: buildCompactLocalCommitUserPrompt(changes)
  };
}

function buildCompactLocalCommitUserPrompt(changes: ChangeEntry[]): string {
  if (changes.length === 0) {
    return "Write one git commit subject for these changes.";
  }

  const sorted = [...changes].sort(
    (left, right) => right.additions + right.deletions - (left.additions + left.deletions)
  );
  const totalAdditions = changes.reduce((sum, change) => sum + change.additions, 0);
  const totalDeletions = changes.reduce((sum, change) => sum + change.deletions, 0);
  const topChanges = sorted.slice(0, MAX_LOCAL_TOP_FILES);
  const remainingCount = sorted.length - topChanges.length;
  const themes = inferChangeThemes(sorted);

  const lines = [
    "Write one git commit subject for this work.",
    "",
    `${changes.length} file${changes.length === 1 ? "" : "s"} changed (+${totalAdditions}/-${totalDeletions}).`
  ];

  if (themes.length > 0) {
    lines.push(`Themes: ${themes.join(", ")}.`);
  }

  lines.push("", "Primary files:");
  for (const change of topChanges) {
    lines.push(`* ${change.path} (${change.status}, +${change.additions}/-${change.deletions})`);
  }
  if (remainingCount > 0) {
    lines.push(`* plus ${remainingCount} more file${remainingCount === 1 ? "" : "s"}`);
  }

  if (changes.length === 1) {
    const diffSummary = summarizeSingleFileDiff(changes[0].diff);
    if (diffSummary) {
      lines.push("", "Change summary:", diffSummary);
    }
  }

  return lines.join("\n");
}

function inferChangeThemes(changes: ChangeEntry[]): string[] {
  const paths = changes.map((change) => change.path).join(" ").toLowerCase();
  const themes: string[] = [];

  if (/local(ai|text|llama)|commitmessage|aisettings|localai/.test(paths)) {
    themes.push("local AI");
  }
  if (/voice|whisper|dictation|transcription/.test(paths)) {
    themes.push("voice");
  }
  if (/settings|preferences/.test(paths)) {
    themes.push("settings");
  }
  if (/terminal|agent/.test(paths)) {
    themes.push("agents");
  }
  if (/worktree|workspace|session/.test(paths)) {
    themes.push("workspace");
  }
  if (/forge|github|gitlab/.test(paths)) {
    themes.push("integrations");
  }
  if (/test|spec/.test(paths)) {
    themes.push("tests");
  }

  return themes.slice(0, 4);
}

function summarizeSingleFileDiff(diff: string): string {
  const samples = extractMeaningfulAddedLines(diff, 4);
  if (samples.length === 0) {
    return "";
  }
  return samples.map((line) => `- ${line}`).join("\n");
}

function extractMeaningfulAddedLines(diff: string, maxLines: number): string[] {
  const samples: string[] = [];

  for (const line of diff.split("\n")) {
    if (!line.startsWith("+") || line.startsWith("+++")) {
      continue;
    }

    const trimmed = line.slice(1).trim();
    if (!trimmed || isLowSignalDiffLine(trimmed)) {
      continue;
    }

    samples.push(trimmed.slice(0, 100));
    if (samples.length >= maxLines) {
      break;
    }
  }

  return samples;
}

function isLowSignalDiffLine(line: string): boolean {
  if (/^import\s/.test(line) || /^export\s+type\s/.test(line)) {
    return true;
  }
  if (/^\/\/|^\/\*|^\*/.test(line)) {
    return true;
  }
  if (/^[{}();]+$/.test(line)) {
    return true;
  }
  return false;
}
