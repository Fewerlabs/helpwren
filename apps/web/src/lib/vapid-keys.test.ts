import { describe, expect, it, vi } from "vitest";

import { loadOrCreateVapidKeys, type VapidKeyPair, type VapidKeyStore } from "./vapid-keys";

function memoryStore(initial?: unknown) {
  let value = initial;
  const store: VapidKeyStore = {
    read: () => Promise.resolve(value),
    addIfMissing: vi.fn((keys: VapidKeyPair) => {
      value ??= keys;
      return Promise.resolve();
    }),
  };
  return store;
}

const made = { publicKey: "made-public", privateKey: "made-private" };
const noEnv = { publicKey: undefined, privateKey: undefined };

describe("loadOrCreateVapidKeys", () => {
  it("makes and keeps a pair the first time", async () => {
    const store = memoryStore();
    const generate = vi.fn(() => made);

    await expect(loadOrCreateVapidKeys({ store, fromEnv: noEnv, generate })).resolves.toEqual(made);
    expect(generate).toHaveBeenCalledOnce();
    await expect(store.read()).resolves.toEqual(made);
  });

  it("uses the kept pair after that", async () => {
    const kept = { publicKey: "kept-public", privateKey: "kept-private" };
    const generate = vi.fn(() => made);

    await expect(
      loadOrCreateVapidKeys({ store: memoryStore(kept), fromEnv: noEnv, generate }),
    ).resolves.toEqual(kept);
    expect(generate).not.toHaveBeenCalled();
  });

  it("takes whichever pair was kept first when two servers make one at once", async () => {
    const other = { publicKey: "other-public", privateKey: "other-private" };
    let reads = 0;
    const store: VapidKeyStore = {
      // Empty on the first look; by the second, another server has kept its pair.
      read: () => Promise.resolve(reads++ === 0 ? undefined : other),
      addIfMissing: () => Promise.resolve(),
    };

    await expect(
      loadOrCreateVapidKeys({ store, fromEnv: noEnv, generate: () => made }),
    ).resolves.toEqual(other);
  });

  it("prefers keys from the environment", async () => {
    const store = memoryStore();
    const fromEnv = { publicKey: "env-public", privateKey: "env-private" };

    await expect(loadOrCreateVapidKeys({ store, fromEnv, generate: () => made })).resolves.toEqual(
      fromEnv,
    );
    expect(store.addIfMissing).not.toHaveBeenCalled();
  });

  it("ignores half a pair in the environment", async () => {
    const fromEnv = { publicKey: "env-public", privateKey: undefined };

    await expect(
      loadOrCreateVapidKeys({ store: memoryStore(), fromEnv, generate: () => made }),
    ).resolves.toEqual(made);
  });

  it("says so when what is kept is not a pair, rather than changing keys behind it", async () => {
    await expect(
      loadOrCreateVapidKeys({
        store: memoryStore("damaged"),
        fromEnv: noEnv,
        generate: () => made,
      }),
    ).rejects.toThrow("could not be kept");
  });
});
