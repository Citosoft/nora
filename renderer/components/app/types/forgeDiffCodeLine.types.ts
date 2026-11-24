import type { ResolvedTheme } from "@/components/app/types";
import type { DiffLineTone } from "./diffLine.types";

export type ForgeDiffCodeLineProps = {
  text: string;
  tone: DiffLineTone;
  languageId: string;
  resolvedTheme: ResolvedTheme;
};
