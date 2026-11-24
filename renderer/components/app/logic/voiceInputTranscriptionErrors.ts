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

/** The message to show for a failed transcription, or null when the recording was just empty or silent. */
export function voiceInputFailureMessage(error: unknown): string | null {
  const message = error instanceof Error ? error.message : "Unknown transcription error.";
  if (isEmptyVoiceInputTranscriptionError(message)) {
    logEmptyVoiceInputTranscription(message);
    return null;
  }
  // Electron prefixes errors thrown by IPC handlers with the channel; users only need the cause.
  return `Voice input failed: ${message.replace(/^Error invoking remote method '[^']+': (Error: )?/, "")}`;
}
