import { installationIdSchema } from "@shared/remote-access/directory";
import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("shared contract resolution", () => {
  it("binds the shared schemas to this package's zod copy", () => {
    // zod 4's `instanceof` is trait-based and passes across copies, so compare the stamped version instead: the
    // repository root may carry a different zod, which ../../shared would pick up without the alias.
    expect(installationIdSchema._zod.version).toEqual(z.core.version);
    expect(z.string()._zod.version).toEqual(z.core.version);
  });
});
