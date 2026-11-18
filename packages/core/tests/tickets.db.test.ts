import { afterAll, describe, expect, it } from "vitest";

import { createHelpwrenClient, type Note } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local database and its demo data (supabase/seed.sql).
const guestIds: string[] = [];

function newClient() {
  return createHelpwrenClient({ supabase: browserClient() });
}

async function signedInAgent(email = "sam@example.com") {
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
    body: "My order arrived damaged.",
    source: "web",
    contact_name: "Ticket Tester",
  });
  if (error) throw error;
  return { client, session, conversationId: data };
}

afterAll(async () => {
  const admin = serverClient();
  await admin.from("conversations").delete().in("contact_id", guestIds);
  await Promise.all(guestIds.map((id) => admin.auth.admin.deleteUser(id)));
});

describe("changing a conversation", () => {
  it("lets a team member assign it, set its priority and resolve it", async () => {
    const { client, agent } = await signedInAgent();
    const { conversationId } = await newGuestWithConversation();

    const result = await client.conversations.update(conversationId, {
      assigneeId: agent.id,
      priority: "high",
      status: "resolved",
    });

    expect(result).toMatchObject({
      ok: true,
      conversation: { assigneeId: agent.id, priority: "high", status: "resolved", type: "chat" },
    });
  });

  it("can leave it assigned to nobody again", async () => {
    const { client, agent } = await signedInAgent();
    const { conversationId } = await newGuestWithConversation();
    await client.conversations.update(conversationId, { assigneeId: agent.id });

    await expect(
      client.conversations.update(conversationId, { assigneeId: null }),
    ).resolves.toMatchObject({ ok: true, conversation: { assigneeId: null } });
  });

  it("changes nothing for the contact, who finds nothing to change", async () => {
    const { client, conversationId } = await newGuestWithConversation();

    await expect(
      client.conversations.update(conversationId, { status: "closed", priority: "high" }),
    ).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(client.conversations.get(conversationId)).resolves.toMatchObject({
      status: "open",
      priority: "normal",
    });
  });
});

describe("tickets", () => {
  it("turns a conversation into a ticket with a number and a subject, for good", async () => {
    const { client } = await signedInAgent();
    const first = await newGuestWithConversation();
    const second = await newGuestWithConversation();

    const ticket = await client.conversations.convertToTicket(
      first.conversationId,
      "  Damaged order  ",
    );
    if (!ticket.ok) throw new Error("The conversation did not become a ticket.");
    expect(ticket.conversation).toMatchObject({ type: "ticket", subject: "Damaged order" });
    const number = ticket.conversation.ticketNumber ?? 0;
    expect(number).toBeGreaterThanOrEqual(1000);

    const next = await client.conversations.convertToTicket(second.conversationId, "Another");
    expect(next).toMatchObject({ ok: true, conversation: { ticketNumber: number + 1 } });

    // Converting again keeps the number it already has.
    await expect(
      client.conversations.convertToTicket(first.conversationId, "Renamed"),
    ).resolves.toMatchObject({
      ok: true,
      conversation: { ticketNumber: number, subject: "Renamed" },
    });
  });

  it("lists and counts by type and by assignee", async () => {
    const { client, agent } = await signedInAgent();
    const { conversationId } = await newGuestWithConversation();
    const before = await client.conversations.count({ type: "ticket" });
    const mineBefore = await client.conversations.count({ assigneeId: agent.id });

    await client.conversations.convertToTicket(conversationId, "Refund");
    await client.conversations.update(conversationId, { assigneeId: agent.id });

    await expect(client.conversations.count({ type: "ticket" })).resolves.toBe(before + 1);
    await expect(client.conversations.count({ assigneeId: agent.id })).resolves.toBe(
      mineBefore + 1,
    );
    const mine = await client.conversations.list({ assigneeId: agent.id, type: "ticket" });
    expect(mine.items.map((item) => item.id)).toContain(conversationId);
    const unassigned = await client.conversations.list({ assigneeId: null, limit: 100 });
    expect(unassigned.items.map((item) => item.id)).not.toContain(conversationId);
  });

  it("lets the contact see their ticket's number and status", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    await client.conversations.convertToTicket(guest.conversationId, "Refund");

    await expect(guest.client.conversations.get(guest.conversationId)).resolves.toMatchObject({
      type: "ticket",
      subject: "Refund",
      status: "open",
    });
  });
});

describe("internal notes", () => {
  it("are written and read by the team, in order", async () => {
    const { client, agent } = await signedInAgent();
    const { conversationId } = await newGuestWithConversation();

    const note = await client.notes.add(conversationId, "  Checked: courier confirmed damage.  ");
    expect(note).toMatchObject({
      conversationId,
      authorId: agent.id,
      body: "Checked: courier confirmed damage.",
    });
    await client.notes.add(conversationId, "Refund approved.");

    const notes = await client.notes.list(conversationId);
    expect(notes.map((item) => item.body)).toEqual([
      "Checked: courier confirmed damage.",
      "Refund approved.",
    ]);
  });

  it("are invisible to the contact, who cannot write one either", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    await client.notes.add(guest.conversationId, "Customer has asked twice.");

    await expect(guest.client.notes.list(guest.conversationId)).resolves.toEqual([]);
    await expect(guest.client.notes.add(guest.conversationId, "Sneaky")).rejects.toThrow();
    // And a note never shows up among the conversation's messages.
    const messages = await guest.client.messages.list(guest.conversationId);
    expect(messages.items.map((message) => message.body)).toEqual(["My order arrived damaged."]);
  });

  it("reach other team members live, and never the contact", async () => {
    const { client } = await signedInAgent();
    const other = await signedInAgent("ada@example.com");
    const guest = await newGuestWithConversation();

    const seen: Note[] = [];
    const stop = await other.client.notes.subscribe(guest.conversationId, (note) =>
      seen.push(note),
    );
    await expect(
      guest.client.notes.subscribe(guest.conversationId, () => undefined),
    ).rejects.toThrow(/live updates/);

    await client.notes.add(guest.conversationId, "Taking this one.");
    await expect.poll(() => seen.length, { timeout: 15_000 }).toBe(1);
    expect(seen[0]?.body).toBe("Taking this one.");

    await stop();
  });
});
