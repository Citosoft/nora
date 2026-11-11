export type MarkdownRendererLinkClickHandler = (href: string) => void;
export interface MarkdownRendererProps {
  children: string;
  className?: string;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
