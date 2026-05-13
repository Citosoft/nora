import type { UiFontId } from "@/components/app/types";

export type UiFontOption = {
  id: UiFontId;
  label: string;
  family: string;
};

export const UI_FONT_OPTIONS: readonly UiFontOption[] = [
  { id: "inter", label: "Inter", family: "\"Inter\"" },
  { id: "geist", label: "Geist", family: "\"Geist\"" },
  { id: "manrope", label: "Manrope", family: "\"Manrope\"" },
  { id: "dm-sans", label: "DM Sans", family: "\"DM Sans\"" },
  { id: "space-grotesk", label: "Space Grotesk", family: "\"Space Grotesk\"" },
  { id: "outfit", label: "Outfit", family: "\"Outfit\"" },
  { id: "plus-jakarta-sans", label: "Plus Jakarta Sans", family: "\"Plus Jakarta Sans\"" }
] as const;

const UI_FONT_FAMILIES: Record<UiFontId, string> = UI_FONT_OPTIONS.reduce<Record<UiFontId, string>>(
  (result, option) => ({
    ...result,
    [option.id]: option.family
  }),
  {} as Record<UiFontId, string>
);

export function isUiFontId(value: string): value is UiFontId {
  return value in UI_FONT_FAMILIES;
}

export function getUiFontFamily(uiFontId: UiFontId): string {
  return UI_FONT_FAMILIES[uiFontId];
}
