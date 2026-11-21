import { randomInt, randomUUID } from "node:crypto";

import { type Agent } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { findOpenInvite, listInvitedMembers } from "@/features/invites";
import { acceptInvite } from "@/features/invites/actions";
import { hashInviteToken } from "@/features/invites/token";
import { inviteTeamMember, reinviteTeamMember } from "@/features/settings/server/invites";
import { changeTeamMember } from "@/features/settings/server/team";
import { installSettings } from "@/lib/api/install-settings";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerUrl } from "@/lib/supabase/server-url";

// A Server Action reads the request's cookies and headers. Here they are stand-ins: a cookie
// store that keeps what is set, so a test can see a session was started, and a network of the
// test's own, so counts left by other runs do not carry over.
const cookieJar = new Map<string, string>();
let network = "";
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
      set: (name: string, value: string) => cookieJar.set(name, value),
    }),
  headers: () => Promise.resolve(new Headers({ "x-forwarded-for": network })),
}));

// Email goes through a stand-in, so the test does not depend on how the shared stack is set up.
const mail = vi.hoisted(() => ({
  ready: true,
  sent: [] as { to: string; subject: string; text: string }[],
}));
vi.mock("@/lib/email", () => ({
  getEmail: () => Promise.resolve({ adapter: mail.ready ? { name: "Test", send: vi.fn() } : null }),
  sendEmail: (message: { to: string; subject: string; text: string }) => {
    mail.sent.push(message);
    return Promise.resolve({ ok: true });
  },
}));

const run = randomUUID().slice(0, 8);
const made: string[] = [];
let admin: Agent;

/** Whether this email and password sign in to Supabase Auth. */
async function signsIn(email: string, password: string): Promise<boolean> {
  const client = createClient(supabaseServerUrl, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

/** Adds someone with the method given, and returns who they are and what the admin was given. */
async function invite(method: "email" | "link" | "password") {
  const email = `invitee.${randomUUID().slice(0, 8)}@example.test`;
  const result = await inviteTeamMember(admin, {
    name: `Invitee ${run}`,
    email,
    role: "agent",
    method,
  });
  const { data } = await supabaseAdmin.from("agents").select("user_id").eq("email", email);
  for (const row of data ?? []) made.push(row.user_id);
  return { email, id: data?.[0]?.user_id ?? "", result };
}

function tokenOf(link: string): string {
  return new URL(link).pathname.split("/").at(-1) ?? "";
}

/** The link from a result that should have given one. */
function linkFrom(result: Awaited<ReturnType<typeof inviteTeamMember>>): string {
  if (!result.ok || result.delivery.kind !== "link") throw new Error("No link was given.");
  return result.delivery.link;
}

const password = { password: "chosen-password-1", confirm: "chosen-password-1" };

beforeAll(async () => {
  // The admin is a real team member, as the invites they make name them.
  const email = `inviter.${run}@example.test`;
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  made.push(created.data.user.id);
  const name = `Inviter ${run}`;
  const { error } = await supabaseAdmin
    .from("agents")
    .insert({ user_id: created.data.user.id, name, email, role: "admin" });
  if (error) throw error;
  admin = { id: created.data.user.id, name, email, role: "admin", photo: undefined };
});

beforeEach(() => {
  cookieJar.clear();
  network = `198.51.${String(randomInt(0, 255))}.${String(randomInt(1, 254))}`;
  mail.ready = true;
  mail.sent.length = 0;
});

afterAll(async () => {
  await Promise.all(made.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
});

describe("inviting", () => {
  it("emails a link that opens the invite, and stores only its hash", async () => {
    const { email, id, result } = await invite("email");
    expect(result).toEqual({ ok: true, delivery: { kind: "emailed" } });

    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]).toMatchObject({
      to: email,
      subject: `Inviter ${run} invited you to ${(await installSettings()).brand.name}'s support team`,
    });
    const link = /https?:\/\/\S+\/invite\/[A-Za-z0-9_-]{43}/.exec(mail.sent[0]?.text ?? "")?.[0];
    expect(link).toBeDefined();
    const token = tokenOf(link ?? "");
    await expect(findOpenInvite(token)).resolves.toEqual({
      agentId: id,
      name: `Invitee ${run}`,
      email,
    });

    const { data } = await supabaseAdmin.from("agent_invites").select("*").eq("agent_id", id);
    expect(data).toHaveLength(1);
    expect(data?.[0]?.token_hash).toBe(hashInviteToken(token));
    expect(JSON.stringify(data)).not.toContain(token);
  });

  it("will not email without a provider, and adds nobody", async () => {
    mail.ready = false;
    const { id, result } = await invite("email");
    expect(result).toEqual({ ok: false, reason: "email_unavailable" });
    expect(id).toBe("");
  });

  it("gives a temporary password that signs in at once and must be changed", async () => {
    const { email, id, result } = await invite("password");
    if (!result.ok || result.delivery.kind !== "password") throw new Error("No password.");
    expect(result.delivery.password).toMatch(/^([a-z]+-){4}\d{2}$/);

    expect(await signsIn(email, result.delivery.password)).toBe(true);
    const { data } = await supabaseAdmin.auth.admin.getUserById(id);
    expect(data.user?.app_metadata.must_change_password).toBe(true);
  });

  it("marks who has not signed in yet", async () => {
    const { email, id, result } = await invite("password");
    expect(await listInvitedMembers()).toContain(id);
    if (!result.ok || result.delivery.kind !== "password") throw new Error("No password.");
    await signsIn(email, result.delivery.password);
    expect(await listInvitedMembers()).not.toContain(id);
  });

  it("makes a new link that replaces the old one", async () => {
    const { id, result } = await invite("link");
    const first = tokenOf(linkFrom(result));
    const again = await reinviteTeamMember(admin, id, "link");
    const second = tokenOf(linkFrom(again));

    expect(second).not.toBe(first);
    await expect(findOpenInvite(first)).resolves.toBeNull();
    await expect(findOpenInvite(second)).resolves.not.toBeNull();
  });

  it("takes back unused links when the member is deactivated", async () => {
    const { id, result } = await invite("link");
    const token = tokenOf(linkFrom(result));
    await expect(changeTeamMember(admin, id, { active: false })).resolves.toEqual({ ok: true });
    await expect(findOpenInvite(token)).resolves.toBeNull();
  });

  it("says so when the person is already on the team, and changes nothing", async () => {
    const { email, id } = await invite("link");
    await expect(
      inviteTeamMember(admin, { name: "Again", email, role: "admin", method: "link" }),
    ).resolves.toEqual({ ok: false, reason: "already_member" });
    const { data } = await supabaseAdmin.from("agents").select("role").eq("user_id", id).single();
    expect(data?.role).toBe("agent");
  });

  it("refuses an agent who is not an admin", async () => {
    const agent: Agent = { ...admin, role: "agent" };
    const email = `nobody.${randomUUID().slice(0, 8)}@example.test`;
    await expect(
      inviteTeamMember(agent, { name: "Nobody", email, role: "agent", method: "link" }),
    ).resolves.toEqual({ ok: false, reason: "forbidden" });
    const { id } = await invite("link");
    await expect(reinviteTeamMember(agent, id, "link")).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });
});

describe("acceptInvite", () => {
  it("sets the password, uses the link up and signs them in", async () => {
    const { email, result } = await invite("link");
    const token = tokenOf(linkFrom(result));

    // On success the action redirects to the dashboard, which Next does by throwing.
    await expect(acceptInvite(token, password)).rejects.toThrow("NEXT_REDIRECT");
    expect([...cookieJar.keys()].some((name) => name.includes("auth-token"))).toBe(true);
    expect(await signsIn(email, password.password)).toBe(true);

    await expect(findOpenInvite(token)).resolves.toBeNull();
    await expect(acceptInvite(token, password)).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("refuses a link that is out of date, or unknown, and sets nothing", async () => {
    const { email, result } = await invite("link");
    const token = tokenOf(linkFrom(result));
    await supabaseAdmin
      .from("agent_invites")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("token_hash", hashInviteToken(token));

    await expect(acceptInvite(token, password)).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
    await expect(acceptInvite("A".repeat(43), password)).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
    await expect(acceptInvite("not a token", password)).resolves.toEqual({
      ok: false,
      reason: "expired",
    });
    expect(await signsIn(email, password.password)).toBe(false);
    expect(cookieJar.size).toBe(0);
  });

  it("refuses passwords that do not match, and keeps the link", async () => {
    const { result } = await invite("link");
    const token = tokenOf(linkFrom(result));
    await expect(acceptInvite(token, { ...password, confirm: "something-else" })).resolves.toEqual({
      ok: false,
      reason: "invalid",
    });
    await expect(findOpenInvite(token)).resolves.not.toBeNull();
  });
});
