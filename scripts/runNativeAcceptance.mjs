import { cp } from "node:fs/promises";

if (process.env.NORA_NATIVE_LIVE !== "1") {
  throw new Error("Set NORA_NATIVE_LIVE=1 to enable potentially billable native acceptance");
}
await cp(new URL("../package.json", import.meta.url), new URL("../dist-native/package.json", import.meta.url));
await import("../dist-native/tests/native/run.js");
