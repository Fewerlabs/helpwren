import { SignJWT, UnsecuredJWT } from "jose";
import { describe, expect, it } from "vitest";

import { signedToken, type SigningKey } from "./signed-token";

const current: SigningKey = { id: "k2", secret: "current-secret-current-secret-current" };
const previous: SigningKey = { id: "k1", secret: "previous-secret-previous-secret-prev" };
const config = { keys: [current, previous] };

interface Options {
  key?: SigningKey;
  kid?: string | null;
  expiresIn?: string | null;
  alg?: string;
}

function sign(claims: Record<string, unknown>, options: Options = {}) {
  const key = options.key ?? current;
  const kid = options.kid === undefined ? key.id : options.kid;
  const jwt = new SignJWT(claims).setProtectedHeader({
    alg: options.alg ?? "HS256",
    ...(kid === null ? {} : { kid }),
  });
  if (options.expiresIn !== null) jwt.setExpirationTime(options.expiresIn ?? "5m");
  return jwt.sign(new TextEncoder().encode(key.secret));
}

describe("the signed token adapter", () => {
  it("reads who the token says the visitor is", async () => {
    const token = await sign({
      sub: "user-42",
      name: "Ada Obi",
      email: "ada@example.com",
      org: { id: "acme", name: "Acme" },
      audience: "business",
      attributes: { plan: "pro", seats: 3, trial: false },
    });

    await expect(signedToken.verify(token, config)).resolves.toEqual({
      externalId: "user-42",
      name: "Ada Obi",
      email: "ada@example.com",
      org: { id: "acme", name: "Acme" },
      audience: "business",
      attributes: { plan: "pro", seats: 3, trial: false },
    });
  });

  it("needs nothing but an id, and takes it from `user_id` too", async () => {
    const token = await sign({ user_id: 42 });
    await expect(signedToken.verify(token, config)).resolves.toEqual({
      externalId: "42",
      attributes: {},
    });
  });

  it("accepts the key being replaced, and a token that does not name its key", async () => {
    const old = await sign({ sub: "user-42" }, { key: previous });
    const unnamed = await sign({ sub: "user-42" }, { key: previous, kid: null });

    await expect(signedToken.verify(old, config)).resolves.toMatchObject({ externalId: "user-42" });
    await expect(signedToken.verify(unnamed, config)).resolves.toMatchObject({
      externalId: "user-42",
    });
  });

  it("turns away a token signed with another secret", async () => {
    const stranger = { id: "k2", secret: "someone-elses-secret-someone-elses-secret" };
    const token = await sign({ sub: "user-42" }, { key: stranger });

    await expect(signedToken.verify(token, config)).rejects.toMatchObject({ reason: "rejected" });
  });

  it("turns away a token that names a key this install does not have", async () => {
    const token = await sign({ sub: "user-42" }, { kid: "k9" });
    await expect(signedToken.verify(token, config)).rejects.toMatchObject({ reason: "rejected" });
  });

  it("turns away a token whose contents were changed after signing", async () => {
    const token = await sign({ sub: "user-42" });
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "user-1", exp: 9_999_999_999 })).toString(
      "base64url",
    );

    await expect(
      signedToken.verify(`${header}.${forged}.${signature}`, config),
    ).rejects.toMatchObject({ reason: "rejected" });
  });

  it("turns away a token with no signature at all", async () => {
    const token = new UnsecuredJWT({ sub: "user-42" }).setExpirationTime("5m").encode();
    await expect(signedToken.verify(token, config)).rejects.toMatchObject({ reason: "rejected" });
  });

  it("turns away another signing method, even with the right secret", async () => {
    const token = await sign({ sub: "user-42" }, { alg: "HS512" });
    await expect(signedToken.verify(token, config)).rejects.toMatchObject({ reason: "rejected" });
  });

  it("says when a token has expired, so the page can fetch a fresh one", async () => {
    const token = await sign({ sub: "user-42" }, { expiresIn: "-10m" });
    await expect(signedToken.verify(token, config)).rejects.toMatchObject({ reason: "expired" });
  });

  it("turns away a token that never expires, or not for a long time", async () => {
    const forever = await sign({ sub: "user-42" }, { expiresIn: null });
    const months = await sign({ sub: "user-42" }, { expiresIn: "90d" });

    await expect(signedToken.verify(forever, config)).rejects.toMatchObject({ reason: "rejected" });
    await expect(signedToken.verify(months, config)).rejects.toMatchObject({ reason: "rejected" });
  });

  it("turns away a token that says nothing usable about who it is for", async () => {
    const nobody = await sign({ name: "Ada Obi" });
    const badEmail = await sign({ sub: "user-42", email: "not an email" });
    const nested = await sign({ sub: "user-42", attributes: { plan: { tier: "pro" } } });

    for (const token of [nobody, badEmail, nested, "not-a-token"]) {
      await expect(signedToken.verify(token, config)).rejects.toMatchObject({ reason: "rejected" });
    }
  });
});
