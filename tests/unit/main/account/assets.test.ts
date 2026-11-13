import assert from "node:assert/strict";
import { test } from "node:test";
import { ACCOUNT_ORIGIN, accountAssetPath } from "@main/account/assets";

test("app origin serves built renderer assets", () => {
  assert.equal(accountAssetPath(`${ACCOUNT_ORIGIN}/`), "index.html");
  assert.equal(accountAssetPath(`${ACCOUNT_ORIGIN}/bundle.js`), "bundle.js");
  assert.equal(accountAssetPath(`${ACCOUNT_ORIGIN}/product-icons/github.svg`), "product-icons/github.svg");
  assert.equal(accountAssetPath(`${ACCOUNT_ORIGIN}/product-icons/react.dev.png`), "product-icons/react.dev.png");
  assert.equal(accountAssetPath(`${ACCOUNT_ORIGIN}/fonts/Inter-Variable.woff2`), "fonts/Inter-Variable.woff2");
});
test("app origin refuses filesystem paths, runtime configuration and foreign origins", () => {
  for (const path of ["/account.js", "/index.html", "/../main/main.js", "/%2e%2e/main/main.js", "/fonts/%2fetc%2fpasswd", "/fonts/%2e%2e/%2e%2e/main/main.js", "/account-config.json"]) {
    assert.equal(accountAssetPath(`${ACCOUNT_ORIGIN}${path}`), null, path);
  }
  for (const url of ["file:///etc/passwd", "https://renderer/account.js", "nora-account://other/account.js", "nora-account://user@renderer/account.js", "invalid"]) {
    assert.equal(accountAssetPath(url), null, url);
  }
});
