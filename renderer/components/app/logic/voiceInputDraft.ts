/** Appends dictated text to a composer draft, separated from existing text by a single space. */
export function appendVoiceTranscript(draft: string, transcript: string): string {
  const spoken = transcript.trim();
  if (!spoken) return draft;
  const existing = draft.trimEnd();
  return existing ? `${existing} ${spoken}` : spoken;
}
