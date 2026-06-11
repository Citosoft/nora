export interface BrowserElementTarget {
  pageUrl: string;
  pageTitle: string;
  selector: string;
  selectorFallbacks: string[];
  tagName: string;
  textPreview: string;
  htmlSnippet: string;
  attributes: Record<string, string>;
}

export interface BrowserAnnotation {
  id: string;
  target: BrowserElementTarget;
  body: string;
  createdAt: string;
}
