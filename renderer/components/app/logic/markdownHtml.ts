import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { PluggableList } from "unified";

// Parse HTML before sanitizing so provider comments cannot inject active content.
// The GitHub-style schema supports picture sources used by deployment badges.
export const markdownHtmlPlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, {
    ...defaultSchema,
    protocols: {
      ...defaultSchema.protocols,
      srcSet: ["http", "https"]
    }
  }]
];
