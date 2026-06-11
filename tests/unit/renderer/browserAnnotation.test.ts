import {
  buildBrowserAnnotationKey,
  buildBrowserReviewPrompt,
  groupBrowserAnnotationsByUrl,
  sortBrowserAnnotations
} from "@/components/app/logic/browserAnnotation";
import type { BrowserAnnotation } from "@shared/appTypes";
import assert from "node:assert/strict";
import test from "node:test";

const sampleTarget = {
  pageUrl: "https://example.com/app",
  pageTitle: "Example App",
  selector: "button.submit",
  selectorFallbacks: ["button.primary"],
  tagName: "BUTTON",
  textPreview: "Submit form",
  htmlSnippet: '<button class="submit">Submit form</button>',
  attributes: { class: "submit" }
};

test("buildBrowserAnnotationKey combines page url and selector", () => {
  assert.equal(
    buildBrowserAnnotationKey(sampleTarget),
    "https://example.com/app::button.submit"
  );
});

test("buildBrowserReviewPrompt groups comments by page url with element context", () => {
  const annotations: BrowserAnnotation[] = [
    {
      id: "a",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: sampleTarget,
      body: "Make this button more prominent."
    },
    {
      id: "b",
      createdAt: "2026-06-03T12:01:00.000Z",
      target: {
        ...sampleTarget,
        pageUrl: "https://example.com/settings",
        pageTitle: "Settings",
        selector: "h1",
        tagName: "H1",
        textPreview: "Settings",
        htmlSnippet: "<h1>Settings</h1>",
        attributes: {}
      },
      body: "Update the heading copy."
    }
  ];

  const prompt = buildBrowserReviewPrompt(annotations);
  assert.match(prompt, /Please address the following review comments from pages I inspected in the browser/);
  assert.match(prompt, /## https:\/\/example\.com\/app/);
  assert.match(prompt, /Page title: Example App/);
  assert.match(prompt, /### button\.submit/);
  assert.match(prompt, /Make this button more prominent\./);
  assert.match(prompt, /## https:\/\/example\.com\/settings/);
  assert.match(prompt, /Update the heading copy\./);
});

test("sortBrowserAnnotations orders by url then selector", () => {
  const annotations: BrowserAnnotation[] = [
    {
      id: "b",
      createdAt: "2026-06-03T12:01:00.000Z",
      target: { ...sampleTarget, selector: "h1" },
      body: "second selector"
    },
    {
      id: "a",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: { ...sampleTarget, pageUrl: "https://example.com/a" },
      body: "first url"
    }
  ];

  const sorted = sortBrowserAnnotations(annotations);
  assert.equal(sorted[0]?.target.pageUrl, "https://example.com/a");
  assert.equal(sorted[1]?.target.selector, "h1");
});

test("groupBrowserAnnotationsByUrl groups annotations under their page url", () => {
  const annotations: BrowserAnnotation[] = [
    {
      id: "a",
      createdAt: "2026-06-03T12:00:00.000Z",
      target: sampleTarget,
      body: "one"
    },
    {
      id: "b",
      createdAt: "2026-06-03T12:01:00.000Z",
      target: { ...sampleTarget, selector: "nav" },
      body: "two"
    }
  ];

  const grouped = groupBrowserAnnotationsByUrl(annotations);
  assert.equal(grouped.get(sampleTarget.pageUrl)?.length, 2);
});
