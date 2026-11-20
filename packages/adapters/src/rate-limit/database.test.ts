import { describe, expect, it, vi } from "vitest";

import { createDatabaseRateLimit } from "./database";

describe("createDatabaseRateLimit", () => {
  it("asks the database and passes on its answer", async () => {
    const call = vi.fn().mockResolvedValue({ data: false, error: null });
    const store = createDatabaseRateLimit(call);
    expect(await store.hit("ip:abc", { limit: 5, windowSeconds: 60 })).toBe(false);
    expect(call).toHaveBeenCalledWith({ key: "ip:abc", max_hits: 5, window_seconds: 60 });
  });

  it("throws when the database fails, rather than letting everyone through", async () => {
    const store = createDatabaseRateLimit(() =>
      Promise.resolve({ data: null, error: new Error("down") }),
    );
    await expect(store.hit("k", { limit: 1, windowSeconds: 1 })).rejects.toThrow("down");
  });
});
