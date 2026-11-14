export type MarkdownRendererLinkClickHandler = (href: string) => void;
export interface MarkdownRendererProps {
  children: string;
  className?: string;
  allowHtml?: boolean;
  onLinkClick?: MarkdownRendererLinkClickHandler;
}
