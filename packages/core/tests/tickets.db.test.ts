import { afterAll, describe, expect, it } from "vitest";

import { createHelpwrenClient, type Note } from "../src";
import { browserClient, serverClient } from "./support/local-supabase";
import { runMarker, signIn } from "./support/test-data";

// These run against the local database and its demo data (supabase/seed.sql).
const guestIds: string[] = [];

function newClient() {
  return createHelpwrenClient({ supabase: browserClient() });
}

const signedInAgent = (email = "sam@example.com") => signIn(email);

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

    // Numbers only go up. Another run may take the very next one, so this is later, not +1.
    const next = await client.conversations.convertToTicket(second.conversationId, "Another");
    if (!next.ok) throw new Error("The conversation did not become a ticket.");
    expect(next.conversation.ticketNumber).toBeGreaterThan(number);

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
    const { session, conversationId } = await newGuestWithConversation();
    // Counted within this guest's conversations, which nothing else touches.
    const contactId = session.id;
    await expect(client.conversations.count({ contactId, type: "ticket" })).resolves.toBe(0);
    await expect(client.conversations.count({ contactId, assigneeId: agent.id })).resolves.toBe(0);

    await client.conversations.convertToTicket(conversationId, "Refund");
    await client.conversations.update(conversationId, { assigneeId: agent.id });

    await expect(client.conversations.count({ contactId, type: "ticket" })).resolves.toBe(1);
    await expect(client.conversations.count({ contactId, type: "chat" })).resolves.toBe(0);
    await expect(client.conversations.count({ contactId, assigneeId: agent.id })).resolves.toBe(1);
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

describe("filtering and searching tickets", () => {
  it("filters by priority and by several assignees, including nobody", async () => {
    const { client, agent } = await signedInAgent();
    const mine = await newGuestWithConversation();
    const nobodys = await newGuestWithConversation();
    await client.conversations.convertToTicket(mine.conversationId, "Mine and urgent");
    await client.conversations.update(mine.conversationId, {
      assigneeId: agent.id,
      priority: "high",
    });
    await client.conversations.convertToTicket(nobodys.conversationId, "Nobody's yet");

    const ids = async (filter: Parameters<typeof client.conversations.list>[0]) =>
      (await client.conversations.list({ type: "ticket", limit: 100, ...filter })).items.map(
        (item) => item.id,
      );

    expect(await ids({ priority: ["high"] })).toContain(mine.conversationId);
    expect(await ids({ priority: ["high"] })).not.toContain(nobodys.conversationId);
    expect(await ids({ assignees: [agent.id] })).toContain(mine.conversationId);
    expect(await ids({ assignees: [agent.id] })).not.toContain(nobodys.conversationId);
    expect(await ids({ assignees: [null] })).toContain(nobodys.conversationId);
    expect(await ids({ assignees: [null] })).not.toContain(mine.conversationId);
    const either = await ids({ assignees: [agent.id, null] });
    expect(either).toContain(mine.conversationId);
    expect(either).toContain(nobodys.conversationId);
    await expect(
      client.conversations.count({ type: "ticket", assignees: [agent.id], priority: ["high"] }),
    ).resolves.toBeGreaterThan(0);
  });

  it("rejects an assignee that is not an id, before it reaches the database", async () => {
    const { client } = await signedInAgent();
    await expect(
      client.conversations.list({ assignees: ["x),status.eq.closed,("] }),
    ).rejects.toThrow();
  });

  it("searches within a filter, and finds a ticket by its number", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    const subject = `Lost parcel ${runMarker()}`;
    const ticket = await client.conversations.convertToTicket(guest.conversationId, subject);
    if (!ticket.ok) throw new Error("The conversation did not become a ticket.");
    const number = String(ticket.conversation.ticketNumber);

    const byNumber = await client.conversations.search(`#${number}`);
    expect(byNumber.map((item) => item.id)).toEqual([guest.conversationId]);

    const openTickets = await client.conversations.search(subject, {
      type: "ticket",
      status: ["open"],
    });
    expect(openTickets.map((item) => item.id)).toContain(guest.conversationId);
    const resolvedTickets = await client.conversations.search(subject, {
      type: "ticket",
      status: ["resolved"],
    });
    expect(resolvedTickets).toEqual([]);
  });

  it("pages through every match of a search, filtering before it pages", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    // A word no other conversation has, on more tickets than the inbox's short list holds.
    const word = `zebracrossing${Date.now()}`;
    const start = Date.parse("2020-01-01T00:00:00Z");
    const { error } = await serverClient()
      .from("conversations")
      .insert(
        Array.from({ length: 60 }, (_, index) => ({
          contact_id: guest.session.id,
          type: "ticket",
          subject: `${word} ${index}`,
          source: "web",
          // A third of them resolved, to check the filter narrows the count.
          status: index % 3 === 0 ? "resolved" : "open",
          last_message_at: new Date(start + index * 60_000).toISOString(),
        })),
      );
    if (error) throw error;

    const second = await client.conversations.list({
      search: ` ${word} `,
      type: "ticket",
      page: 2,
      limit: 25,
    });
    expect(second.total).toBe(60);
    // Most recently active first: the second page holds numbers 34 down to 10.
    expect(second.items.map((item) => item.subject)).toEqual(
      Array.from({ length: 25 }, (_, index) => `${word} ${34 - index}`),
    );

    const open = await client.conversations.list({
      search: word,
      type: "ticket",
      status: ["open"],
      page: 2,
      limit: 25,
    });
    expect(open.total).toBe(40);
    expect(open.items).toHaveLength(15);
    expect(open.items.every((item) => item.status === "open")).toBe(true);

    // The inbox's short list stays short.
    await expect(client.conversations.search(word)).resolves.toHaveLength(50);
    await expect(client.conversations.search(word, {}, { limit: 5 })).resolves.toHaveLength(5);
  });
});

describe("activity", () => {
  it("records what the team did, and shows the contact only where their request stands", async () => {
    const { client, agent } = await signedInAgent();
    const guest = await newGuestWithConversation();
    const id = guest.conversationId;

    await client.conversations.convertToTicket(id, "Damaged order");
    await client.conversations.update(id, { assigneeId: agent.id, priority: "high" });
    await client.conversations.update(id, { status: "resolved" });

    const forTeam = await client.events.list(id);
    expect(forTeam.map((event) => event.kind).sort()).toEqual([
      "assigned",
      "priority_changed",
      "status_changed",
      "ticket_created",
    ]);
    expect(forTeam.every((event) => event.actorId === agent.id)).toBe(true);
    expect(forTeam.find((event) => event.kind === "ticket_created")).toMatchObject({
      data: { subject: "Damaged order" },
    });

    const forContact = await guest.client.events.list(id);
    expect(forContact.map((event) => event.kind).sort()).toEqual([
      "status_changed",
      "ticket_created",
    ]);
  });

  it("arrives live: everything for the team, and only their own part for the contact", async () => {
    const { client, agent } = await signedInAgent();
    const guest = await newGuestWithConversation();
    const id = guest.conversationId;

    const teamSaw: string[] = [];
    const contactSaw: string[] = [];
    const other = await signedInAgent("ada@example.com");
    const stopTeam = await other.client.events.subscribe(id, (event) => teamSaw.push(event.kind), {
      team: true,
    });
    const stopContact = await guest.client.events.subscribe(id, (event) =>
      contactSaw.push(event.kind),
    );
    await expect(
      guest.client.events.subscribe(id, () => undefined, { team: true }),
    ).rejects.toThrow(/live updates/);

    await client.conversations.update(id, { assigneeId: agent.id });
    await client.conversations.update(id, { status: "resolved" });

    await expect
      .poll(() => [...teamSaw].sort(), { timeout: 15_000 })
      .toEqual(["assigned", "status_changed"]);
    await expect.poll(() => contactSaw, { timeout: 15_000 }).toEqual(["status_changed"]);

    await stopTeam();
    await stopContact();
  });
});

describe("ratings", () => {
  it("lets the contact rate a resolved conversation once, and the team read it", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    const id = guest.conversationId;

    await expect(guest.client.ratings.submit(id, 5)).resolves.toEqual({
      ok: false,
      reason: "not_resolved",
    });
    await expect(guest.client.ratings.get(id)).resolves.toBeNull();

    await client.conversations.update(id, { status: "resolved" });
    await expect(
      guest.client.ratings.submit(id, 4, "  Fast and friendly.  "),
    ).resolves.toMatchObject({
      ok: true,
      rating: { score: 4, comment: "Fast and friendly." },
    });
    await expect(guest.client.ratings.submit(id, 1)).resolves.toEqual({
      ok: false,
      reason: "already_rated",
    });

    await expect(client.ratings.get(id)).resolves.toMatchObject({ score: 4 });
    const events = await client.events.list(id);
    expect(events.at(-1)).toMatchObject({ kind: "rated", data: { score: 4 } });
  });

  it("stores no comment when none is given, and rejects a score out of range", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    await client.conversations.update(guest.conversationId, { status: "resolved" });

    await expect(guest.client.ratings.submit(guest.conversationId, 6)).rejects.toThrow();
    await expect(guest.client.ratings.submit(guest.conversationId, 3)).resolves.toMatchObject({
      ok: true,
      rating: { score: 3, comment: null },
    });
  });

  it("refuses a rating from anyone but the contact", async () => {
    const { client } = await signedInAgent();
    const guest = await newGuestWithConversation();
    const other = await newGuestWithConversation();
    await client.conversations.update(guest.conversationId, { status: "resolved" });

    await expect(other.client.ratings.submit(guest.conversationId, 1)).resolves.toEqual({
      ok: false,
      reason: "not_resolved",
    });
    await expect(client.ratings.submit(guest.conversationId, 5)).resolves.toEqual({
      ok: false,
      reason: "not_resolved",
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
