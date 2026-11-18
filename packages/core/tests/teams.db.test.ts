import { afterAll, describe, expect, it } from "vitest";

import { createHelpwrenClient } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local database and its demo data, where Ada is an admin and Sam is not.
const SAM = "a0000000-0000-4000-8000-000000000002";
const TICKET = "d0000000-0000-4000-8000-000000000003";
const NAME = "Billing (test)";

async function signedIn(email: string) {
  const client = createHelpwrenClient({ supabase: browserClient() });
  const result = await client.auth.verifyLoginCode(email, await issueLoginCode(email));
  if (!result.ok) throw new Error(`Could not sign in as ${email}.`);
  return client;
}

afterAll(async () => {
  await serverClient().from("teams").delete().like("name", "%(test)");
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

    await expect(admin.teams.rename(made.team.id, "Accounts (test)")).resolves.toEqual({
      ok: true,
    });
    await expect(admin.teams.remove(made.team.id)).resolves.toEqual({ ok: true });
    await expect(admin.teams.remove(made.team.id)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("lets any agent give a conversation to a team, and only admins change teams", async () => {
    const admin = await signedIn("ada@example.com");
    const made = await admin.teams.create("Support (test)");
    if (!made.ok) throw new Error(`The team was refused: ${made.reason}`);

    const agent = await signedIn("sam@example.com");
    await expect(agent.teams.create("Rogue (test)")).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    await expect(agent.teams.rename(made.team.id, "Hijacked (test)")).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
    await expect(agent.teams.setMembers(made.team.id, [SAM])).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });

    await expect(
      agent.conversations.update(TICKET, { teamId: made.team.id }),
    ).resolves.toMatchObject({ ok: true, conversation: { teamId: made.team.id } });
    await expect(agent.conversations.get(TICKET)).resolves.toMatchObject({
      teamId: made.team.id,
    });
    const inTeam = await agent.conversations.list({ teams: [made.team.id] });
    expect(inTeam.items.map((item) => item.id)).toEqual([TICKET]);
    const events = await agent.events.list(TICKET);
    expect(events.at(-1)).toMatchObject({
      kind: "team_changed",
      data: { to: made.team.id, name: "Support (test)" },
    });

    // Removing the team leaves the conversation with none.
    await admin.teams.remove(made.team.id);
    await expect(agent.conversations.get(TICKET)).resolves.toMatchObject({ teamId: null });
  });
});
