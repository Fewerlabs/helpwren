import { afterEach, describe, expect, it, vi } from "vitest";

import { profileEndpoint, profileEndpointConfigSchema } from "./profile-endpoint";

const URL = "https://api.example.com/auth/me";

// The shape of a real product's answer: wrapped, with the name in two fields.
const profile = {
  status: "success",
  data: {
    id: "user-42",
    firstName: "Ada",
    lastName: "Obi",
    email: "ada@example.com",
    type: "Business",
    plan: "pro",
    seats: 3,
    business: { id: "acme", name: "Acme" },
    settings: { theme: "dark" },
  },
};

const config = profileEndpointConfigSchema.parse({
  url: URL,
  fields: {
    id: "data.id",
    name: ["data.firstName", "data.lastName"],
    email: "data.email",
    orgId: "data.business.id",
    orgName: "data.business.name",
    audience: "data.type",
  },
  audiences: { Business: "business", Customer: "customer" },
  attributes: { plan: "data.plan", seats: "data.seats", theme: "data.settings" },
});

function answerWith(body: unknown, status = 200) {
  const send = vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  vi.stubGlobal("fetch", send);
  return send;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the profile endpoint adapter", () => {
  it("asks the host product whose token it is, and reads the answer through the mapping", async () => {
    const send = answerWith(profile);

    await expect(profileEndpoint.verify("users-own-token", config)).resolves.toEqual({
      externalId: "user-42",
      name: "Ada Obi",
      email: "ada@example.com",
      org: { id: "acme", name: "Acme" },
      audience: "business",
      // A value that is not plain, like an object, is left out.
      attributes: { plan: "pro", seats: 3 },
    });
    expect(send).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        headers: { authorization: "Bearer users-own-token", accept: "application/json" },
        redirect: "error",
      }),
    );
  });

  it("needs only an id, and takes a number for one", async () => {
    answerWith({ id: 42 });
    const minimal = profileEndpointConfigSchema.parse({ url: URL, fields: { id: "id" } });

    await expect(profileEndpoint.verify("token", minimal)).resolves.toEqual({
      externalId: "42",
      attributes: {},
    });
  });

  it("leaves out what the answer does not have, and an email it cannot use", async () => {
    answerWith({ data: { id: "user-42", lastName: "Obi", email: "not-an-email", type: "Staff" } });

    await expect(profileEndpoint.verify("token", config)).resolves.toEqual({
      externalId: "user-42",
      name: "Obi",
      // Not in the list of audiences, so it is used as it is.
      audience: "Staff",
      attributes: {},
    });
  });

  it("says a token the product does not accept may have expired, so the page fetches another", async () => {
    answerWith({ message: "Access token expired" }, 401);
    await expect(profileEndpoint.verify("token", config)).rejects.toMatchObject({
      reason: "expired",
    });
  });

  it("turns away a user the product refuses", async () => {
    answerWith({}, 403);
    await expect(profileEndpoint.verify("token", config)).rejects.toMatchObject({
      reason: "rejected",
    });
  });

  it("says the product is unavailable when it fails, is unreachable or answers with nonsense", async () => {
    answerWith({}, 500);
    await expect(profileEndpoint.verify("token", config)).rejects.toMatchObject({
      reason: "unavailable",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("fetch failed"))),
    );
    await expect(profileEndpoint.verify("token", config)).rejects.toMatchObject({
      reason: "unavailable",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response("<html>Sign in</html>"))),
    );
    await expect(profileEndpoint.verify("token", config)).rejects.toMatchObject({
      reason: "unavailable",
    });
  });

  it("blames the mapping, not the visitor, when the answer has no id where it was told to look", async () => {
    answerWith({ user: { id: "user-42" } });
    await expect(profileEndpoint.verify("token", config)).rejects.toMatchObject({
      reason: "unavailable",
      message: expect.stringContaining("data.id") as string,
    });
  });

  it("does not walk into what an answer inherits", async () => {
    answerWith({ id: "user-42" });
    const sneaky = profileEndpointConfigSchema.parse({
      url: URL,
      fields: { id: "id" },
      attributes: { leak: "constructor.name" },
    });

    await expect(profileEndpoint.verify("token", sneaky)).resolves.toMatchObject({
      attributes: {},
    });
  });

  it("only sends a user's token over HTTPS, or to this machine", () => {
    const withUrl = (url: string) =>
      profileEndpointConfigSchema.safeParse({ url, fields: { id: "id" } }).success;

    expect(withUrl("https://api.example.com/me")).toBe(true);
    expect(withUrl("http://localhost:4000/me")).toBe(true);
    expect(withUrl("http://api.example.com/me")).toBe(false);
    expect(withUrl("ftp://api.example.com/me")).toBe(false);
  });
});
