function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number(decimal)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

export function normalizeGitlabCommentBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed.includes("<") && !trimmed.includes("&")) {
    return body;
  }

  const withMarkdownHints = trimmed
    .replace(/\r\n/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_match, codeContent: string) => `\`${codeContent}\``)
    .replace(
      /<a[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
      (_match, _quote: string, href: string, text: string) => `${text} (${href})`
    )
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(withMarkdownHints)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
