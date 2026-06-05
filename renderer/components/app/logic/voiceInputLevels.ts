export const VOICE_INPUT_LEVEL_BAR_COUNT = 24;

export function createIdleVoiceInputLevels(barCount = VOICE_INPUT_LEVEL_BAR_COUNT): number[] {
  return Array.from({ length: barCount }, () => 0.12);
}

export function sampleVoiceInputLevels(analyser: AnalyserNode, barCount = VOICE_INPUT_LEVEL_BAR_COUNT): number[] {
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);

  if (frequencyData.length === 0 || barCount <= 0) {
    return createIdleVoiceInputLevels(barCount);
  }

  const binSize = Math.max(1, Math.floor(frequencyData.length / barCount));
  const levels: number[] = [];

  for (let barIndex = 0; barIndex < barCount; barIndex += 1) {
    const start = barIndex * binSize;
    const end = Math.min(frequencyData.length, start + binSize);
    let sum = 0;
    for (let binIndex = start; binIndex < end; binIndex += 1) {
      sum += frequencyData[binIndex] ?? 0;
    }
    const average = sum / Math.max(1, end - start) / 255;
    levels.push(clampVoiceInputLevel(average * 2.4));
  }

  return levels;
}

function clampVoiceInputLevel(value: number): number {
  return Math.max(0.08, Math.min(1, value));
}
