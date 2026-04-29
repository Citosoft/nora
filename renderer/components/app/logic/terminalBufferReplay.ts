export function shouldApplyTerminalBufferReplay(
  liveEventCountAtRequestStart: number,
  currentLiveEventCount: number
): boolean {
  return currentLiveEventCount === liveEventCountAtRequestStart;
}
