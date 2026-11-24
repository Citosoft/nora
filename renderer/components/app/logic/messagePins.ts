/** Marks each transcript message with its item ID, so a pin can find it. */
export const MESSAGE_ID_ATTRIBUTE = "data-message-id";
/** Styles a message while it is briefly highlighted after a jump. */
export const MESSAGE_REVEAL_CLASS_NAME = "rounded-lg transition-colors duration-500 data-[pin-revealed=true]:bg-accent/50";
const REVEAL_HIGHLIGHT_MS = 1600;

/** Briefly highlights a message the user jumped to, so it stands out from its neighbours. */
export function revealTranscriptMessage(element: HTMLElement): void {
  element.dataset.pinRevealed = "true";
  window.setTimeout(() => { delete element.dataset.pinRevealed; }, REVEAL_HIGHLIGHT_MS);
}
