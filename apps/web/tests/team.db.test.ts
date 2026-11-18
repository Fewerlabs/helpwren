import { type Agent } from "@helpwren/core";
import { afterEach, describe, expect, it } from "vitest";

import { changeTeamMember, inviteTeamMember } from "@/features/settings/server/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

// These run against the local database and its demo data, where Ada is the only admin.
const ada: Agent = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "Ada Okafor",
  email: "ada@example.com",
  role: "admin",
};
const sam: Agent = {
  id: "a0000000-0000-4000-8000-000000000002",
  name: "Sam Rivera",
  email: "sam@example.com",
  role: "agent",
};
const NEW_EMAIL = "kofi.team-test@example.com";

async function member(email: string) {
  const { data } = await supabaseAdmin
    .from("agents")
    .select("user_id, name, role, active")
    .eq("email", email)
    .maybeSingle();
  return data;
}

afterEach(async () => {
  const added = await member(NEW_EMAIL);
  if (added) await supabaseAdmin.auth.admin.deleteUser(added.user_id);
  await supabaseAdmin.from("agents").update({ role: "agent", active: true }).eq("user_id", sam.id);
});

describe("inviteTeamMember", () => {
  const invite = { name: "Kofi Mensah", email: NEW_EMAIL, role: "agent" } as const;

  it("adds someone who can then sign in", async () => {
    await expect(inviteTeamMember(ada, invite)).resolves.toEqual({ ok: true });
    expect(await member(NEW_EMAIL)).toMatchObject({
      name: "Kofi Mensah",
      role: "agent",
      active: true,
    });
  });

  it("says so when the person is already on the team", async () => {
    await inviteTeamMember(ada, invite);
    await expect(inviteTeamMember(ada, { ...invite, role: "admin" })).resolves.toEqual({
      ok: false,
      reason: "already_member",
    });
    expect(await member(NEW_EMAIL)).toMatchObject({ role: "agent" });
  });

  it("refuses an agent who is not an admin", async () => {
    await expect(inviteTeamMember(sam, invite)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(await member(NEW_EMAIL)).toBeNull();
  });
});

describe("changeTeamMember", () => {
  it("lets an admin change a role, deactivate and reactivate", async () => {
    await expect(changeTeamMember(ada, sam.id, { role: "admin" })).resolves.toEqual({ ok: true });
    expect(await member(sam.email)).toMatchObject({ role: "admin" });

    await expect(changeTeamMember(ada, sam.id, { active: false })).resolves.toEqual({ ok: true });
    expect(await member(sam.email)).toMatchObject({ active: false });

    await expect(changeTeamMember(ada, sam.id, { active: true })).resolves.toEqual({ ok: true });
  });

  it("refuses an agent who is not an admin", async () => {
    await expect(changeTeamMember(sam, ada.id, { role: "agent" })).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("stops an admin changing their own access", async () => {
    await expect(changeTeamMember(ada, ada.id, { active: false })).resolves.toEqual({
      ok: false,
      reason: "self",
    });
    expect(await member(ada.email)).toMatchObject({ role: "admin", active: true });
  });

  it("will not leave the team without an admin", async () => {
    // Make Sam the only active admin, then have another admin try to demote him.
    await changeTeamMember(ada, sam.id, { role: "admin" });
    await supabaseAdmin.from("agents").update({ active: false }).eq("user_id", ada.id);
    const anotherAdmin: Agent = { ...ada, id: "a0000000-0000-4000-8000-0000000000ff" };

    await expect(changeTeamMember(anotherAdmin, sam.id, { role: "agent" })).resolves.toEqual({
      ok: false,
      reason: "last_admin",
    });
    expect(await member(sam.email)).toMatchObject({ role: "admin" });

    await supabaseAdmin.from("agents").update({ active: true }).eq("user_id", ada.id);
  });

  it("says so when the person is not on the team", async () => {
    await expect(
      changeTeamMember(ada, "a0000000-0000-4000-8000-0000000000ee", { active: false }),
    ).resolves.toEqual({ ok: false, reason: "not_found" });
  });
});
