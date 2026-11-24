import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDirectoryInventory } from "../src/clerk/inventory";
import { UpstreamError } from "../src/errors/upstreamError";

const { getUserList } = vi.hoisted(() => ({ getUserList: vi.fn() }));
vi.mock("@clerk/backend", () => ({ createClerkClient: () => ({ users: { getUserList } }) }));
beforeEach(() => getUserList.mockReset());

const user = (id: string) => ({ id, privateMetadata: {} });

describe("cleanup account inventory", () => {
  it("paginates all accounts and normalizes their directory metadata", async () => {
    getUserList.mockResolvedValueOnce({ data: Array.from({ length: 100 }, (_, i) => user(String(i))), totalCount: 101 })
      .mockResolvedValueOnce({ data: [user("100")], totalCount: 101 });
    const accounts = await createDirectoryInventory("secret")();
    expect(accounts).toHaveLength(101);
    expect(accounts[100]).toEqual({ userId: "100", directory: { entries: [], invalidKeys: [] } });
    expect(getUserList.mock.calls.map(([params]) => params.offset)).toEqual([0, 100]);
  });

  it.each(["failed", "incomplete", "changed", "duplicate"]) ("fails closed for %s inventories", async (mode) => {
    getUserList.mockResolvedValueOnce({ data: [user("1")], totalCount: 2 });
    if (mode === "failed") getUserList.mockRejectedValueOnce(new Error("secret SDK payload"));
    if (mode === "incomplete") getUserList.mockResolvedValueOnce({ data: [], totalCount: 2 });
    if (mode === "changed") getUserList.mockResolvedValueOnce({ data: [user("2")], totalCount: 3 });
    if (mode === "duplicate") getUserList.mockResolvedValueOnce({ data: [user("1")], totalCount: 2 });
    await expect(createDirectoryInventory("secret")()).rejects.toBeInstanceOf(UpstreamError);
  });
});
