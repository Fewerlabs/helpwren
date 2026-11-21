import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";
import {
  keepSettings,
  newAccount,
  newAgent,
  removeAccounts,
  runMarker,
  uniqueEmail,
} from "./support/test-data";

// These run against the local database and its demo data (supabase/seed.sql).
const PUBLIC_SETTINGS = [
  "brand",
  "widget",
  "chat_page",
  "help_center",
  "tickets",
  "guest_details",
  "visitors",
];
const OUTSIDER = uniqueEmail("outsider");

function newClient() {
  return createHelpwrenClient({ supabase: browserClient() });
}

describe("settings.getPublic", () => {
  // Whatever someone trying the app has set is put back afterwards.
  const brand = `Brand ${runMarker()}`;
  let restore: () => Promise<void> = () => Promise.resolve();

  beforeAll(async () => {
    restore = await keepSettings(PUBLIC_SETTINGS);
    const admin = serverClient();
    await admin
      .from("settings")
      .delete()
      .in("key", ["widget", "chat_page", "help_center", "tickets"]);
    const { error } = await admin.from("settings").upsert([
      { key: "brand", value: { name: brand }, is_public: true },
      { key: "guest_details", value: "email_or_phone", is_public: true },
      { key: "visitors", value: { tracking: true, liveList: true }, is_public: true },
    ]);
    if (error) throw error;
  });

  afterAll(async () => {
    await restore();
  });

  it("reads the public settings with no session, with defaults for what is not set", async () => {
    await expect(newClient().settings.getPublic()).resolves.toEqual({
      brand: { name: brand },
      widget: { position: "right", offsetX: 20, offsetY: 20, launcher: "chat", quickReplies: [] },
      chatPage: { headerStyle: "brand" },
      helpCenter: { headerStyle: "brand", headerLinks: [], footerLinks: [], showChat: true },
      tickets: { fromChat: true },
      guestDetails: "email_or_phone",
      visitors: { tracking: true, liveList: true },
      spam: { captcha: "off" },
    });
  });
});

describe("agents.me", () => {
  it("is null when nobody is signed in", async () => {
    await expect(newClient().agents.me()).resolves.toBeNull();
  });
});

describe("signing in", () => {
  // A team member of these tests' own: each new code replaces the last, so signing in as
  // someone from the demo data would race anyone else signing in as them.
  const name = `Admin ${runMarker()}`;
  let adminEmail = "";
  const made: string[] = [];

  beforeAll(async () => {
    made.push(await newAccount(OUTSIDER));
    const admin = await newAgent(name, "admin");
    made.push(admin.id);
    adminEmail = admin.email;
  });

  afterAll(async () => {
    await removeAccounts(made);
  });

  it("sends a code to a team member", async () => {
    await expect(newClient().auth.sendLoginCode(adminEmail)).resolves.toBeUndefined();
  });

  it("answers the same way for an email nobody has, and creates no account", async () => {
    const email = uniqueEmail("nobody");
    await expect(newClient().auth.sendLoginCode(email)).resolves.toBeUndefined();

    const { data } = await serverClient().auth.admin.listUsers({ perPage: 10_000 });
    expect(data.users.map((user) => user.email)).not.toContain(email);
  });

  it("signs a team member in with the right code, and out again", async () => {
    const client = newClient();
    const result = await client.auth.verifyLoginCode(adminEmail, await issueLoginCode(adminEmail));

    expect(result).toEqual({
      ok: true,
      agent: { id: expect.any(String) as string, name, email: adminEmail, role: "admin" },
    });
    await expect(client.agents.me()).resolves.toMatchObject({ email: adminEmail });

    await client.auth.signOut();
    await expect(client.agents.me()).resolves.toBeNull();
  });

  it("rejects a wrong code", async () => {
    const client = newClient();
    const code = await issueLoginCode(adminEmail);
    const wrong = code === "000000" ? "111111" : "000000";

    await expect(client.auth.verifyLoginCode(adminEmail, wrong)).resolves.toEqual({
      ok: false,
      reason: "invalid_code",
    });
    await expect(client.agents.me()).resolves.toBeNull();
  });

  it("rejects a code that is not six digits without asking the server", async () => {
    await expect(newClient().auth.verifyLoginCode(adminEmail, "12ab")).resolves.toEqual({
      ok: false,
      reason: "invalid_code",
    });
  });

  it("rejects a code that has already been used", async () => {
    const code = await issueLoginCode(adminEmail);
    await newClient().auth.verifyLoginCode(adminEmail, code);

    await expect(newClient().auth.verifyLoginCode(adminEmail, code)).resolves.toEqual({
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

describe("signing in with a password", () => {
  const PASSWORD = `pass-${runMarker()}`;
  let adminEmail = "";
  let adminId = "";
  const made: string[] = [];

  beforeAll(async () => {
    const outsiderId = await newAccount(uniqueEmail("password-outsider"));
    made.push(outsiderId);
    const admin = await newAgent(`Admin ${runMarker()}`, "admin");
    made.push(admin.id);
    adminEmail = admin.email;
    adminId = admin.id;
    const { error } = await serverClient().auth.admin.updateUserById(adminId, {
      password: PASSWORD,
    });
    if (error) throw error;
  });

  afterAll(async () => {
    await removeAccounts(made);
  });

  it("signs a team member in with the right password", async () => {
    const client = newClient();
    const result = await client.auth.signInWithPassword(adminEmail, PASSWORD);
    expect(result).toMatchObject({ ok: true, agent: { email: adminEmail, role: "admin" } });
    await expect(client.agents.me()).resolves.toMatchObject({ email: adminEmail });
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await expect(newClient().auth.signInWithPassword(adminEmail, "not-the-one")).resolves.toEqual({
      ok: false,
      reason: "invalid_credentials",
    });
    await expect(
      newClient().auth.signInWithPassword(uniqueEmail("nobody"), PASSWORD),
    ).resolves.toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("turns away someone with a password who is not on the team, leaving no session", async () => {
    const email = uniqueEmail("password-only");
    const id = await newAccount(email);
    made.push(id);
    await serverClient().auth.admin.updateUserById(id, { password: PASSWORD });
    const supabase = browserClient();
    const client = createHelpwrenClient({ supabase });

    await expect(client.auth.signInWithPassword(email, PASSWORD)).resolves.toEqual({
      ok: false,
      reason: "not_an_agent",
    });
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });

  it("lets a signed-in team member change their own password", async () => {
    const client = newClient();
    await client.auth.signInWithPassword(adminEmail, PASSWORD);
    const next = `${PASSWORD}-new`;

    await expect(client.auth.setPassword("short")).resolves.toEqual({ ok: false, reason: "weak" });
    await expect(client.auth.setPassword(next)).resolves.toEqual({ ok: true });
    await expect(newClient().auth.signInWithPassword(adminEmail, next)).resolves.toMatchObject({
      ok: true,
    });
    await serverClient().auth.admin.updateUserById(adminId, { password: PASSWORD });
  });
});
