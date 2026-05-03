import type { MouseEvent, ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererLinkClickHandler = (href: string) => void;

function buildMarkdownComponents(onLinkClick?: MarkdownRendererLinkClickHandler): Components {
  return {
  h1: ({ children }: { children?: ReactNode }) => <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h1>,
  h2: ({ children }: { children?: ReactNode }) => <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h3: ({ children }: { children?: ReactNode }) => <h3 className="mt-4 text-lg font-semibold text-foreground first:mt-0">{children}</h3>,
  p: ({ children }: { children?: ReactNode }) => <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground first:mt-0">{children}</p>,
  ul: ({ children }: { children?: ReactNode }) => <ul className="mt-3 list-disc space-y-2 pl-6 text-sm leading-7 text-foreground first:mt-0">{children}</ul>,
  ol: ({ children }: { children?: ReactNode }) => <ol className="mt-3 list-decimal space-y-2 pl-6 text-sm leading-7 text-foreground first:mt-0">{children}</ol>,
  li: ({ children }: { children?: ReactNode }) => <li className="pl-1 marker:text-muted-foreground">{children}</li>,
  a: ({ children, href }: { children?: ReactNode; href?: string }) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (!href || !onLinkClick || href.startsWith("#")) {
        return;
      }

      event.preventDefault();
      onLinkClick(href);
    };

    return (
      <a className="text-primary underline underline-offset-4" href={href} onClick={handleClick}>
        {children}
      </a>
    );
  },
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="mt-4 border-l-2 border-border pl-4 italic text-muted-foreground first:mt-0">{children}</blockquote>
  ),
  hr: () => <hr className="mt-4 border-border/60 first:mt-0" />,
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mt-4 overflow-x-auto first:mt-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="border-b border-border/60">{children}</thead>,
  tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: ReactNode }) => <tr className="border-b border-border/40 last:border-b-0">{children}</tr>,
  th: ({ children }: { children?: ReactNode }) => <th className="px-3 py-2 font-medium text-foreground">{children}</th>,
  td: ({ children }: { children?: ReactNode }) => <td className="px-3 py-2 align-top text-foreground">{children}</td>,
  code: ({ children, className }: { children?: ReactNode; className?: string }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-[6px] bg-muted px-4 py-3 font-mono text-[13px] leading-6 text-foreground">
          {children}
        </code>
      );
    }

    return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">{children}</code>;
  },
  pre: ({ children }: { children?: ReactNode }) => <pre className="mt-3 first:mt-0">{children}</pre>,
  input: ({ checked, disabled, type }: { checked?: boolean; disabled?: boolean; type?: string }) => {
    if (type !== "checkbox") {
      return null;
    }

    return <input type="checkbox" checked={checked} disabled={disabled ?? true} readOnly className="mr-2 translate-y-[1px]" />;
  }
  };
}

type MarkdownRendererProps = {
  children: string;
  className?: string;
  onLinkClick?: MarkdownRendererLinkClickHandler;
};

export function MarkdownRenderer({ children, className, onLinkClick }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={buildMarkdownComponents(onLinkClick)}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
