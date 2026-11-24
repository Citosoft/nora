import { VoiceInputContext } from "@/components/app/context/voiceInputContext";
import { useVoiceInputLevelTracker } from "@/components/app/hooks/useVoiceInputLevelTracker";
import { convertRecordedAudioBlobToWav } from "@/components/app/logic/recordedAudioWav";
import { logEmptyVoiceInputTranscription, voiceInputFailureMessage } from "@/components/app/logic/voiceInputTranscriptionErrors";
import type { VoiceInputControl, VoiceInputOptions, VoiceInputPhase } from "@/components/app/types/voiceInput.types";
import { useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

const UNSUPPORTED_REASON = "Voice input is not supported in this environment.";
const MICROPHONE_DENIED = "Allow microphone access for Nora to use voice input.";
const RECORDING_FAILED = "Voice recording failed. Check your microphone and try again.";

function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

/** Records from the microphone and transcribes through the dictation provider chosen in Settings → Voice. */
export function useVoiceInput({ disabled, onTranscript }: VoiceInputOptions): VoiceInputControl {
  const system = useContext(VoiceInputContext);
  const [phase, setPhase] = useState<VoiceInputPhase>(() => isRecordingSupported() ? { kind: "checking" } : { kind: "unavailable", reason: UNSUPPORTED_REASON });
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const discard = useRef(false);
  const mounted = useRef(true);
  const deliver = useRef(onTranscript);
  useLayoutEffect(() => { deliver.current = onTranscript; }, [onTranscript]);
  const levels = useVoiceInputLevelTracker(phase.kind === "listening", phase.kind === "listening" ? phase.stream : null);

  // Readiness follows settings changes and returning to the app (for example after adding an API key).
  useEffect(() => {
    if (!isRecordingSupported()) return;
    let cancelled = false;
    const refresh = (): void => {
      void system.getVoiceInputReadiness().then((readiness) => {
        if (cancelled) return;
        setPhase((current) => {
          if (current.kind === "listening" || current.kind === "transcribing") return current;
          return readiness.state === "ready" ? { kind: "idle" } : { kind: "unavailable", reason: readiness.reason };
        });
      }, () => { if (!cancelled) setPhase({ kind: "unavailable", reason: "Voice input settings could not be read." }); });
    };
    refresh();
    const unsubscribe = system.onAppSettingsChanged(refresh);
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; unsubscribe(); window.removeEventListener("focus", refresh); };
  }, [system]);

  // Set on every mount, not just the first: StrictMode remounts effects after running their cleanup.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      discard.current = true;
      recorder.current?.stop();
    };
  }, []);

  const transcribe = useCallback(async (chunks: Blob[], mimeType: string): Promise<void> => {
    if (!chunks.length) { logEmptyVoiceInputTranscription("No audio was captured."); setPhase({ kind: "idle" }); return; }
    setPhase({ kind: "transcribing" });
    try {
      const audioData = await convertRecordedAudioBlobToWav(new Blob(chunks, { type: mimeType }));
      const transcript = await system.transcribeVoiceInput({ audioData, mimeType: "audio/wav" });
      if (mounted.current) deliver.current(transcript);
    } catch (failure) {
      if (mounted.current) setError(voiceInputFailureMessage(failure));
    } finally {
      if (mounted.current) setPhase({ kind: "idle" });
    }
  }, [system]);

  const start = useCallback(async (): Promise<void> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(MICROPHONE_DENIED);
      return;
    }
    if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return; }
    const next = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    discard.current = false;
    next.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
    next.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      if (discard.current) { if (mounted.current) setPhase({ kind: "idle" }); return; }
      void transcribe(chunks, next.mimeType || "audio/webm");
    };
    next.onerror = () => {
      discard.current = true;
      next.stop();
      setError(RECORDING_FAILED);
    };
    recorder.current = next;
    next.start();
    setPhase({ kind: "listening", stream });
  }, [transcribe]);

  const cancel = useCallback((): void => {
    if (!recorder.current) return;
    discard.current = true;
    recorder.current.stop();
  }, []);

  const toggle = useCallback((): void => {
    if (recorder.current) { recorder.current.stop(); return; }
    if (disabled || phase.kind !== "idle") return;
    setError(null);
    void start();
  }, [disabled, phase.kind, start]);

  // Escape abandons a recording without transcribing it.
  useEffect(() => {
    if (phase.kind !== "listening") return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      cancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancel, phase.kind]);

  // A composer that becomes disabled mid-recording (thread settled, chat closed) drops the take.
  useEffect(() => { if (disabled) cancel(); }, [cancel, disabled]);

  return { phase, levels, error, disabled: disabled || (phase.kind !== "idle" && phase.kind !== "listening"), toggle, cancel };
}
