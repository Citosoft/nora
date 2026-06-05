import {
  createIdleVoiceInputLevels,
  sampleVoiceInputLevels,
  VOICE_INPUT_LEVEL_BAR_COUNT
} from "@/components/app/logic/voiceInputLevels";
import { useEffect, useState } from "react";

export function useVoiceInputLevelTracker(isListening: boolean, mediaStream: MediaStream | null): number[] {
  const [levels, setLevels] = useState<number[]>(() => createIdleVoiceInputLevels());

  useEffect(() => {
    if (!isListening || !mediaStream) {
      setLevels(createIdleVoiceInputLevels());
      return;
    }

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);

    let frameId = 0;
    const tick = () => {
      setLevels(sampleVoiceInputLevels(analyser, VOICE_INPUT_LEVEL_BAR_COUNT));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      source.disconnect();
      void audioContext.close();
      setLevels(createIdleVoiceInputLevels());
    };
  }, [isListening, mediaStream]);

  return levels;
}
