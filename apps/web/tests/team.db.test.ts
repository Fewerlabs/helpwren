import { randomUUID } from "node:crypto";

import { type Agent } from "@helpwren/core";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { changeTeamMember, inviteTeamMember } from "@/features/settings/server/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

// These run against the shared local database. Whoever is signed in to try the app keeps their
// access: the team members changed here are made here, and the demo's Ada and Sam are left alone.
const run = randomUUID().slice(0, 8);
const made: string[] = [];

/** The caller, as the dashboard knows them. These functions trust the caller they are given. */
function caller(role: Agent["role"]): Agent {
  return {
    id: randomUUID(),
    name: `Caller ${run}`,
    email: `caller.${run}@example.test`,
    role,
    photo: undefined,
  };
}
const admin = caller("admin");

/** Puts a new person on the team, and returns their id. */
async function newMember(role: Agent["role"]) {
  const email = `member.${randomUUID().slice(0, 8)}@example.test`;
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  made.push(id);
  const { error } = await supabaseAdmin
    .from("agents")
    .insert({ user_id: id, name: `Member ${run}`, email, role });
  if (error) throw error;
  return { id, email };
}

async function member(email: string) {
  const { data } = await supabaseAdmin
    .from("agents")
    .select("user_id, name, role, active")
    .eq("email", email)
    .maybeSingle();
  return data;
}

afterAll(async () => {
  await Promise.all(made.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
});

describe("inviteTeamMember", () => {
  let invite: { name: string; email: string; role: "agent" };

  beforeEach(() => {
    invite = {
      name: "Kofi Mensah",
      email: `kofi.${randomUUID().slice(0, 8)}@example.test`,
      role: "agent",
    };
  });

  afterEach(async () => {
    const added = await member(invite.email);
    if (added) await supabaseAdmin.auth.admin.deleteUser(added.user_id);
  });

  it("adds someone who can then sign in", async () => {
    await expect(inviteTeamMember(admin, invite)).resolves.toEqual({ ok: true });
    expect(await member(invite.email)).toMatchObject({
      name: "Kofi Mensah",
      role: "agent",
      active: true,
    });
  });

  it("says so when the person is already on the team", async () => {
    await inviteTeamMember(admin, invite);
    await expect(inviteTeamMember(admin, { ...invite, role: "admin" })).resolves.toEqual({
      ok: false,
      reason: "already_member",
    });
    expect(await member(invite.email)).toMatchObject({ role: "agent" });
  });

  it("refuses an agent who is not an admin", async () => {
    await expect(inviteTeamMember(caller("agent"), invite)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await member(invite.email)).toBeNull();
  });
});

describe("changeTeamMember", () => {
  it("lets an admin change a role, deactivate and reactivate", async () => {
    const someone = await newMember("agent");
    await expect(changeTeamMember(admin, someone.id, { role: "admin" })).resolves.toEqual({
      ok: true,
    });
    expect(await member(someone.email)).toMatchObject({ role: "admin" });

    await expect(changeTeamMember(admin, someone.id, { active: false })).resolves.toEqual({
      ok: true,
    });
    expect(await member(someone.email)).toMatchObject({ active: false });

    await expect(changeTeamMember(admin, someone.id, { active: true })).resolves.toEqual({
      ok: true,
    });
    expect(await member(someone.email)).toMatchObject({ active: true });
  });

  it("refuses an agent who is not an admin", async () => {
    const someone = await newMember("admin");
    await expect(changeTeamMember(caller("agent"), someone.id, { role: "agent" })).resolves.toEqual(
      { ok: false, reason: "forbidden" },
    );
    expect(await member(someone.email)).toMatchObject({ role: "admin" });
  });

  it("stops an admin changing their own access", async () => {
    const someone = await newMember("admin");
    const themselves: Agent = { ...admin, id: someone.id, email: someone.email };
    await expect(changeTeamMember(themselves, someone.id, { active: false })).resolves.toEqual({
      ok: false,
      reason: "self",
    });
    expect(await member(someone.email)).toMatchObject({ role: "admin", active: true });
  });

  it("will not leave the team without an admin", async () => {
    // The rule is about the whole team, so for a moment the new admin must be the only active
    // one. Every other active admin is stood down, and stood up again straight after.
    const last = await newMember("admin");
    const { data: others, error } = await supabaseAdmin
      .from("agents")
      .select("user_id")
      .eq("role", "admin")
      .eq("active", true)
      .neq("user_id", last.id);
    if (error) throw error;
    const otherIds = others.map((other) => other.user_id);

    let result: Awaited<ReturnType<typeof changeTeamMember>>;
    try {
      await supabaseAdmin.from("agents").update({ active: false }).in("user_id", otherIds);
      result = await changeTeamMember(admin, last.id, { role: "agent" });
    } finally {
      await supabaseAdmin.from("agents").update({ active: true }).in("user_id", otherIds);
    }

    expect(result).toEqual({ ok: false, reason: "last_admin" });
    expect(await member(last.email)).toMatchObject({ role: "admin" });
  });

  it("says so when the person is not on the team", async () => {
    await expect(changeTeamMember(admin, randomUUID(), { active: false })).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});
