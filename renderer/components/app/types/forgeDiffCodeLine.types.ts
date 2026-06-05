import type { ResolvedTheme } from "@/components/app/types";

export type ForgeDiffCodeLineKind = "added" | "deleted" | "context" | "meta";

export type ForgeDiffCodeLineProps = {
  text: string;
  languageId: string;
  resolvedTheme: ResolvedTheme;
};
