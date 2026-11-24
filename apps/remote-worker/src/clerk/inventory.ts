import { createClerkClient } from "@clerk/backend";
import { UpstreamError } from "../errors/upstreamError";
import type { AccountDirectory } from "../types/cleanup.types";
import { parseDirectory } from "./directoryStore";

/** Finish the complete account inventory before treating any tunnel as an orphan. Fail closed on API failures. */
export function createDirectoryInventory(secretKey: string): () => Promise<readonly AccountDirectory[]> {
  const clerk = createClerkClient({ secretKey });
  return async () => {
    const accounts: AccountDirectory[] = [];
    let expectedCount: number | null = null;
    try {
      for (let offset = 0; ; offset += 100) {
        const page = await clerk.users.getUserList({ limit: 100, offset, orderBy: "+created_at" });
        expectedCount ??= page.totalCount;
        if (page.totalCount !== expectedCount) throw new Error("Account inventory changed; retry next run");
        accounts.push(...page.data.map((user) => ({ userId: user.id, directory: parseDirectory(user.privateMetadata) })));
        if (accounts.length >= page.totalCount) {
          if (new Set(accounts.map((account) => account.userId)).size !== page.totalCount) throw new Error("Incomplete account inventory");
          return accounts;
        }
        if (page.data.length === 0) throw new Error("Incomplete account inventory");
      }
    } catch {
      throw new UpstreamError("clerk", null, "Account inventory failed");
    }
  };
}
