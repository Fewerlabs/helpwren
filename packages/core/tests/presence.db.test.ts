import { afterAll, describe, expect, it, vi } from "vitest";

import { createHelpwrenClient, type Typist } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local stack, Realtime included, and its demo data (supabase/seed.sql).
const guestIds: string[] = [];

function newClient() {
  return createHelpwrenClient({ supabase: browserClient() });
}

async function signedInAgent(email: string) {
  const client = newClient();
  const result = await client.auth.verifyLoginCode(email, await issueLoginCode(email));
  if (!result.ok) throw new Error(`Could not sign in as ${email}.`);
  return { client, agent: result.agent };
}

async function newGuestWithConversation() {
  const client = newClient();
  const session = await client.sessions.startGuest();
  guestIds.push(session.id);
  const { data, error } = await serverClient().rpc("start_conversation", {
    contact_id: session.id,
    body: "Is anyone there?",
    source: "web",
    contact_name: "Presence Tester",
  });
  if (error) throw error;
  return { client, session, conversationId: data };
}

afterAll(async () => {
  const admin = serverClient();
  await admin.from("conversations").delete().in("contact_id", guestIds);
  await Promise.all(guestIds.map((id) => admin.auth.admin.deleteUser(id)));
});

describe("typing", () => {
  it("tells the visitor who on the team is typing, and that they stopped", async () => {
    const { client: visitor, conversationId } = await newGuestWithConversation();
    const { client: team, agent } = await signedInAgent("sam@example.com");

    const seen: Typist[][] = [];
    const stopVisitor = await visitor.presence
      .typing(conversationId)
      .subscribe((typists) => seen.push(typists));
    const typing = team.presence.typing(conversationId, { name: "Sam" });
    const stopTeam = await typing.subscribe(() => undefined);

    typing.start();
    await vi.waitFor(() => {
      expect(seen.at(-1)).toEqual([{ userId: agent.id, name: "Sam", avatar: undefined }]);
    });
    typing.stop();
    await vi.waitFor(() => {
      expect(seen.at(-1)).toEqual([]);
    });

    await Promise.all([stopVisitor(), stopTeam()]);
  });

  it("tells the team the visitor is typing", async () => {
    const { client: visitor, session, conversationId } = await newGuestWithConversation();
    const { client: team } = await signedInAgent("sam@example.com");

    const seen: Typist[][] = [];
    const stopTeam = await team.presence
      .typing(conversationId)
      .subscribe((typists) => seen.push(typists));
    const typing = visitor.presence.typing(conversationId);
    const stopVisitor = await typing.subscribe(() => undefined);

    typing.start();
    await vi.waitFor(() => {
      expect(seen.at(-1)?.map((typist) => typist.userId)).toEqual([session.id]);
    });

    await Promise.all([stopVisitor(), stopTeam()]);
  });

  it("keeps a visitor out of someone else's conversation", async () => {
    const { conversationId } = await newGuestWithConversation();
    const { client: stranger } = await newGuestWithConversation();

    await expect(
      stranger.presence.typing(conversationId).subscribe(() => undefined),
    ).rejects.toThrow();
  });
});

describe("presence", () => {
  it("counts the team as online for a visitor with no session, while the dashboard is open", async () => {
    const visitor = newClient();
    const { client: team } = await signedInAgent("ada@example.com");

    const counts: number[] = [];
    const stopWatching = await visitor.presence.team.watch((online) => counts.push(online));
    const before = counts.at(-1) ?? 0;

    const leave = await team.presence.team.join();
    await vi.waitFor(() => {
      expect(counts.at(-1)).toBe(before + 1);
    });
    await leave();
    await vi.waitFor(() => {
      expect(counts.at(-1)).toBe(before);
    });

    await stopWatching();
  });

  it("does not let a visitor count themselves as the team", async () => {
    const { client: visitor } = await newGuestWithConversation();
    await expect(visitor.presence.team.join()).rejects.toThrow();
  });

  it("shows which team members have a conversation open", async () => {
    const { conversationId } = await newGuestWithConversation();
    const ada = await signedInAgent("ada@example.com");
    const sam = await signedInAgent("sam@example.com");

    const seen: string[][] = [];
    const stopAda = await ada.client.presence.viewing(conversationId, (ids) => seen.push(ids));
    const stopSam = await sam.client.presence.viewing(conversationId, () => undefined);

    await vi.waitFor(() => {
      expect(seen.at(-1)?.toSorted()).toEqual([ada.agent.id, sam.agent.id].toSorted());
    });

    await Promise.all([stopAda(), stopSam()]);
  });
});
