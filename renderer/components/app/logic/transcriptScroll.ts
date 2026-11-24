/** Room left above a message scrolled to the top of a transcript, so it does not sit flush against the edge. */
const TOP_GAP = 24;

/** The transcript element carrying `attribute` set to `value`, or null when that part of the transcript is not rendered. */
export function findTranscriptElement(scroller: HTMLElement, attribute: string, value: string): HTMLElement | null {
  return Array.from(scroller.querySelectorAll<HTMLElement>(`[${attribute}]`)).find((element) => element.getAttribute(attribute) === value) ?? null;
}

/** Scrolls a transcript so `target` sits near its top, smoothly unless the user prefers reduced motion. */
export function scrollTranscriptTo(scroller: HTMLElement, target: HTMLElement): void {
  scroller.scrollTo({ top: target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - scroller.clientTop + scroller.scrollTop - TOP_GAP,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
}
