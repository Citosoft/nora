import type { ComposerSuggestionOption } from "./composerInput.types";

export type MarkdownRendererLinkClickHandler = (href: string) => void;
export interface MarkdownRendererProps {
  children: string;
  className?: string;
  allowHtml?: boolean;
  showLinkIcons?: boolean;
  mentions?: readonly ComposerSuggestionOption[];
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
