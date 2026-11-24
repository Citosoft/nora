import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VoiceInputButtonProps, VoiceInputPhase } from "@/components/app/types/voiceInput.types";

function voiceInputLabel(phase: VoiceInputPhase): string {
  switch (phase.kind) {
    case "checking": return "Checking voice input";
    case "unavailable": return phase.reason;
    case "idle": return "Start voice input";
    case "listening": return "Stop and transcribe (Esc to cancel)";
    case "transcribing": return "Transcribing voice input";
  }
}

/** Composer mic toggle: shows live input levels while recording and a spinner while transcribing. */
export function VoiceInputButton({ voice, className }: VoiceInputButtonProps) {
  const { phase, levels } = voice;
  const listening = phase.kind === "listening";
  const label = voiceInputLabel(phase);
  return <>
    <Button type="button" variant={listening ? "secondary" : "ghost"} size={listening ? "sm" : "icon"}
      className={cn("shrink-0 text-muted-foreground", listening ? "h-8 gap-2 rounded-full px-3 text-foreground" : "size-8 rounded-full", className)}
      disabled={voice.disabled} aria-pressed={listening} aria-label={label} tooltip={label} onClick={voice.toggle}>
      {listening ? <>
        <span aria-hidden="true" className="flex h-4 items-center gap-px">
          {levels.map((level, index) => <span key={index} className="w-0.5 rounded-full bg-current" style={{ height: `${Math.round(level * 100)}%` }} />)}
        </span>
        <Square className="size-3 fill-current" aria-hidden="true" />
      </> : phase.kind === "transcribing"
        ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        : <Mic className="size-4" aria-hidden="true" />}
    </Button>
    <span role="status" className="sr-only">{listening ? "Listening" : phase.kind === "transcribing" ? "Transcribing" : ""}</span>
  </>;
}
