import { defineConfig } from "vitest/config";

const sharedDir = new URL("../../shared/", import.meta.url).pathname;
const sourceDir = new URL("./src/", import.meta.url).pathname;
const zodEntry = new URL("./node_modules/zod/index.js", import.meta.url).pathname;

export default defineConfig({
  resolve: {
    // Mirrors tsconfig `paths` and metro.config.js: shared contracts resolve, and their `zod` import binds to this
    // package's copy rather than walking up to the repository root.
    alias: [
      { find: /^@shared\/(.*)$/, replacement: `${sharedDir}$1` },
      { find: /^@\/(.*)$/, replacement: `${sourceDir}$1` },
      { find: /^zod$/, replacement: zodEntry }
    ]
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"]
  }
});
