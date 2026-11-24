import type { ComposerEditorHandle } from "./composerEditor.types";
import type { RefObject } from "react";
import type { SystemGateway } from "@shared/ipc/types/systemGateway.types";

/** One composer's dictation lifecycle; `unavailable` carries what the user must set up first. */
export type VoiceInputPhase =
  | { kind: "checking" }
  | { kind: "unavailable"; reason: string }
  | { kind: "idle" }
  | { kind: "listening"; stream: MediaStream }
  | { kind: "transcribing" };

export interface VoiceInputOptions {
  disabled: boolean;
  /** Receives the transcript of a finished recording; callers merge it into their own draft. */
  onTranscript(transcript: string): void;
}

export interface VoiceInputControl {
  phase: VoiceInputPhase;
  levels: number[];
  error: string | null;
  disabled: boolean;
  toggle(): void;
  cancel(): void;
}

export interface VoiceInputButtonProps {
  voice: VoiceInputControl;
  className?: string;
}

export interface ComposerVoiceInputOptions {
  value: string;
  disabled: boolean;
  inputRef: RefObject<ComposerEditorHandle | null>;
  onChange(text: string): void;
}

/** The desktop calls dictation needs; fixture windows without the desktop bridge supply their own. */
export type VoiceInputPort = Pick<SystemGateway, "getVoiceInputReadiness" | "onAppSettingsChanged" | "transcribeVoiceInput">;
