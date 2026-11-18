import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local database and its demo data (supabase/seed.sql).
const ADMIN = "ada@example.com";
const OUTSIDER = "outsider@example.com";

function newClient() {
  return createHelpwrenClient({ supabase: browserClient() });
}

describe("settings.getPublic", () => {
  it("reads the public settings with no session", async () => {
    await expect(newClient().settings.getPublic()).resolves.toEqual({
      brand: { name: "Helpwren Demo" },
    });
  });
});

describe("agents.me", () => {
  it("is null when nobody is signed in", async () => {
    await expect(newClient().agents.me()).resolves.toBeNull();
  });
});

describe("signing in", () => {
  let outsiderId: string;

  beforeAll(async () => {
    const { data, error } = await serverClient().auth.admin.createUser({
      email: OUTSIDER,
      email_confirm: true,
    });
    if (error) throw error;
    outsiderId = data.user.id;
  });

  afterAll(async () => {
    await serverClient().auth.admin.deleteUser(outsiderId);
  });

  it("sends a code to a team member", async () => {
    await expect(newClient().auth.sendLoginCode(ADMIN)).resolves.toBeUndefined();
  });

  it("answers the same way for an email nobody has, and creates no account", async () => {
    const email = "nobody@example.com";
    await expect(newClient().auth.sendLoginCode(email)).resolves.toBeUndefined();

    const { data } = await serverClient().auth.admin.listUsers();
    expect(data.users.map((user) => user.email)).not.toContain(email);
  });

  it("signs a team member in with the right code, and out again", async () => {
    const client = newClient();
    const result = await client.auth.verifyLoginCode(ADMIN, await issueLoginCode(ADMIN));

    expect(result).toEqual({
      ok: true,
      agent: { id: expect.any(String) as string, name: "Ada Okafor", email: ADMIN, role: "admin" },
    });
    await expect(client.agents.me()).resolves.toMatchObject({ email: ADMIN });

    await client.auth.signOut();
    await expect(client.agents.me()).resolves.toBeNull();
  });

  it("rejects a wrong code", async () => {
    const client = newClient();
    const code = await issueLoginCode(ADMIN);
    const wrong = code === "000000" ? "111111" : "000000";

    await expect(client.auth.verifyLoginCode(ADMIN, wrong)).resolves.toEqual({
      ok: false,
      reason: "invalid_code",
    });
    await expect(client.agents.me()).resolves.toBeNull();
  });

  it("rejects a code that is not six digits without asking the server", async () => {
    await expect(newClient().auth.verifyLoginCode(ADMIN, "12ab")).resolves.toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("rejects a code that has already been used", async () => {
    const code = await issueLoginCode(ADMIN);
    await newClient().auth.verifyLoginCode(ADMIN, code);

    await expect(newClient().auth.verifyLoginCode(ADMIN, code)).resolves.toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("turns away someone with an account who is not on the team, leaving no session", async () => {
    const supabase = browserClient();
    const client = createHelpwrenClient({ supabase });

    const result = await client.auth.verifyLoginCode(OUTSIDER, await issueLoginCode(OUTSIDER));

    expect(result).toEqual({ ok: false, reason: "not_an_agent" });
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});
