import type { OnboardingSlide } from "@/types/onboarding.types";
import { NORA_RELAY_NAME } from "@shared/remote-access/constants";
import { pixelGlyphs } from "@/visuals/pixelGlyphs";

/** The welcome pages, in order; the sign-in page always follows the last one. */
export const onboardingSlides: readonly OnboardingSlide[] = Object.freeze([
  {
    id: "chat",
    glyph: pixelGlyphs.chat,
    eyebrow: "Chat",
    title: "Your agents, in your pocket",
    body: "Start a chat, follow every step as it happens and pick up any thread you left on your computer."
  },
  {
    id: "approve",
    glyph: pixelGlyphs.approve,
    eyebrow: "Approve",
    title: "Say yes from anywhere",
    body: "When an agent needs a decision, it lands in your inbox. Approve, answer or redirect it in a tap."
  },
  {
    id: "computer",
    glyph: pixelGlyphs.computer,
    eyebrow: "Private by design",
    title: "Your computer does the work",
    body: `Agents run on your own computer with your files and tools. ${NORA_RELAY_NAME} links your phone to it securely.`
  }
]);

export const signInGlyph = pixelGlyphs.mark;
