import { formatHomepageLabel, parsePackageJsonHomepageUrl, resolveHomepageFaviconUrl } from "@/components/app/logic/projectHomepage";
import { productFaviconUrl } from "@/components/app/logic/productIcon";
import assert from "node:assert/strict";
import test from "node:test";

test("parsePackageJsonHomepageUrl reads and normalizes the homepage field", () => {
  assert.equal(
    parsePackageJsonHomepageUrl(JSON.stringify({ name: "nora", homepage: "https://www.withnora.run" })),
    "https://www.withnora.run/"
  );
  assert.equal(parsePackageJsonHomepageUrl(JSON.stringify({ homepage: " www.withnora.run " })), "https://www.withnora.run/");
});

test("parsePackageJsonHomepageUrl returns null when homepage is missing or not a web URL", () => {
  assert.equal(parsePackageJsonHomepageUrl(JSON.stringify({ name: "nora" })), null);
  assert.equal(parsePackageJsonHomepageUrl(JSON.stringify({ homepage: 42 })), null);
  assert.equal(parsePackageJsonHomepageUrl(JSON.stringify({ homepage: "" })), null);
  assert.equal(parsePackageJsonHomepageUrl(JSON.stringify({ homepage: "ftp://example.com" })), null);
  assert.equal(parsePackageJsonHomepageUrl("[]"), null);
  assert.equal(parsePackageJsonHomepageUrl("{ not json"), null);
});

test("resolveHomepageFaviconUrl maps a homepage URL to its host's favicon", () => {
  assert.equal(resolveHomepageFaviconUrl("https://www.withnora.run/docs?ref=1"), productFaviconUrl("www.withnora.run"));
  assert.equal(resolveHomepageFaviconUrl("http://Example.COM"), productFaviconUrl("example.com"));
});

test("resolveHomepageFaviconUrl rejects non-public hosts", () => {
  assert.equal(resolveHomepageFaviconUrl("http://localhost:3000"), null);
  assert.equal(resolveHomepageFaviconUrl("http://127.0.0.1:8080"), null);
  assert.equal(resolveHomepageFaviconUrl("http://[::1]:8080"), null);
});

test("formatHomepageLabel drops the protocol and trailing slash", () => {
  assert.equal(formatHomepageLabel("https://www.withnora.run/"), "www.withnora.run");
  assert.equal(formatHomepageLabel("https://example.com/docs/?a=1"), "example.com/docs/?a=1");
  assert.equal(formatHomepageLabel("http://localhost:3000/app/"), "localhost:3000/app");
});
