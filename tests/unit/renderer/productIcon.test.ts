import {
  productFaviconUrl,
  resolveProductIconDomain,
  resolveProductIconSources
} from "@/components/app/logic/productIcon";
import assert from "node:assert/strict";
import test from "node:test";

test("product icons resolve packaged assets before their live fallback", () => {
  assert.deepEqual(resolveProductIconSources(productFaviconUrl("nextjs.org")), {
    localUrl: "./product-icons/nextjs.org.png",
    remoteUrl: "https://www.google.com/s2/favicons?domain=nextjs.org&sz=64"
  });
});

test("non-Google images remain remote-only", () => {
  assert.deepEqual(resolveProductIconSources("https://example.com/icon.png"), {
    localUrl: null,
    remoteUrl: "https://example.com/icon.png"
  });
});

test("product icon domains reject malformed and unrelated URLs", () => {
  assert.equal(resolveProductIconDomain("not a url"), null);
  assert.equal(resolveProductIconDomain("https://www.google.com/other?domain=nextjs.org"), null);
  assert.equal(resolveProductIconDomain("https://www.google.com/s2/favicons?domain=../nextjs.org"), null);
});
