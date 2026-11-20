import { afterAll, describe, expect, it } from "vitest";

import { serverClient } from "./support/local-supabase";
import { newClient, removeAccounts, runMarker, signIn } from "./support/test-data";

// These run against the shared local database, where Ada (from the demo data) is an admin and
// Sam is not. Team names carry this run's marker, and the ticket is one made here.
const SAM = "a0000000-0000-4000-8000-000000000002";
const run = runMarker();
const NAME = `Billing ${run}`;
const guestIds: string[] = [];

/** A ticket from a new guest, for the team to be given. */
async function newTicket() {
  const guest = await newClient().sessions.startGuest();
  guestIds.push(guest.id);
  const { data, error } = await serverClient().rpc("start_conversation", {
    contact_id: guest.id,
    body: "The invoice is wrong.",
    source: "web",
    contact_name: `Teams ${run}`,
    ticket_subject: `Wrong invoice ${run}`,
  });
  if (error) throw error;
  return data;
}

async function signedIn(email: string) {
  return (await signIn(email)).client;
}

afterAll(async () => {
  await serverClient().from("teams").delete().like("name", `%${run}`);
  await removeAccounts(guestIds);
});

describe("teams", () => {
  it("lets an admin make a team, choose who is in it, rename it and remove it", async () => {
    const admin = await signedIn("ada@example.com");

    const made = await admin.teams.create(`  ${NAME} `);
    if (!made.ok) throw new Error(`The team was refused: ${made.reason}`);
    expect(made.team).toMatchObject({ name: NAME, memberIds: [] });
    await expect(admin.teams.create(NAME.toUpperCase())).resolves.toEqual({
      ok: false,
      reason: "name_taken",
    });

    await expect(admin.teams.setMembers(made.team.id, [SAM])).resolves.toEqual({ ok: true });
    expect((await admin.teams.list()).find((team) => team.id === made.team.id)?.memberIds).toEqual([
      SAM,
    ]);
    await expect(admin.teams.setMembers(made.team.id, [])).resolves.toEqual({ ok: true });

    await expect(admin.teams.rename(made.team.id, `Accounts ${run}`)).resolves.toEqual({
      ok: true,
    });
    await expect(admin.teams.remove(made.team.id)).resolves.toEqual({ ok: true });
    await expect(admin.teams.remove(made.team.id)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("lets any agent give a conversation to a team, and only admins change teams", async () => {
    const ticket = await newTicket();
    const admin = await signedIn("ada@example.com");
    const made = await admin.teams.create(`Support ${run}`);
    if (!made.ok) throw new Error(`The team was refused: ${made.reason}`);

    const agent = await signedIn("sam@example.com");
    await expect(agent.teams.create(`Rogue ${run}`)).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    await expect(agent.teams.rename(made.team.id, `Hijacked ${run}`)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    await expect(agent.teams.setMembers(made.team.id, [SAM])).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });

    await expect(
      agent.conversations.update(ticket, { teamId: made.team.id }),
    ).resolves.toMatchObject({ ok: true, conversation: { teamId: made.team.id } });
    await expect(agent.conversations.get(ticket)).resolves.toMatchObject({
      teamId: made.team.id,
    });
    const inTeam = await agent.conversations.list({ teams: [made.team.id] });
    expect(inTeam.items.map((item) => item.id)).toEqual([ticket]);
    const events = await agent.events.list(ticket);
    expect(events.at(-1)).toMatchObject({
      kind: "team_changed",
      data: { to: made.team.id, name: `Support ${run}` },
    });

    // Removing the team leaves the conversation with none.
    await admin.teams.remove(made.team.id);
    await expect(agent.conversations.get(ticket)).resolves.toMatchObject({ teamId: null });
  });
});
