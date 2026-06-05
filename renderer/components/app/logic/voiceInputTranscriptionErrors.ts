export function isEmptyVoiceInputTranscriptionError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("no audio was captured")
    || normalized.includes("returned no transcript")
    || normalized.includes("returned no text")
    || normalized.includes("silent or too short");
}

export function logEmptyVoiceInputTranscription(message: string): void {
  console.info("[nora] Voice input skipped:", message);
}

export function reportVoiceInputTranscriptionError(error: unknown): void {
  const message = error instanceof Error ? error.message : "Unknown transcription error.";
  if (isEmptyVoiceInputTranscriptionError(message)) {
    logEmptyVoiceInputTranscription(message);
    return;
  }

  window.alert(`Voice input failed: ${message}`);
}
