type VoiceInputLevelTrackerProps = {
  levels: number[];
};

const MIN_BAR_HEIGHT_PX = 4;
const MAX_BAR_HEIGHT_PX = 28;

export const VoiceInputLevelTracker = ({ levels }: VoiceInputLevelTrackerProps) => (
  <div
    className="flex h-8 min-w-0 flex-1 items-end justify-center gap-[3px] px-2"
    role="status"
    aria-live="polite"
    aria-label="Listening for voice input"
  >
    {levels.map((level, index) => (
      <span
        key={index}
        className="w-[3px] shrink-0 rounded-full bg-primary transition-[height] duration-75 ease-out will-change-[height]"
        style={{ height: `${MIN_BAR_HEIGHT_PX + level * (MAX_BAR_HEIGHT_PX - MIN_BAR_HEIGHT_PX)}px` }}
      />
    ))}
    <span className="sr-only">Listening</span>
  </div>
);
