import { afterAll, describe, expect, it } from "vitest";

import { createHelpwrenClient, type Message } from "../src";
import { browserClient, issueLoginCode, serverClient } from "./support/local-supabase";

// These run against the local database and its demo data (supabase/seed.sql). Starting a
// conversation through the API is tested in apps/web, where the API lives; here the server's
// part is played by calling the database function directly.
const AGENT = "sam@example.com";
const guestIds: string[] = [];

function newClient() {
  return createHelpwrenClient({ supabase: browserClient() });
}

async function newGuest() {
  const client = newClient();
  const session = await client.sessions.startGuest();
  guestIds.push(session.id);
  return { client, session };
}

async function signedInAgent() {
  const client = newClient();
  const result = await client.auth.verifyLoginCode(AGENT, await issueLoginCode(AGENT));
  if (!result.ok) throw new Error(`Could not sign in as ${AGENT}.`);
  return { client, agent: result.agent };
}

async function startConversation(contactId: string, body = "Hello") {
  const { data, error } = await serverClient().rpc("start_conversation", {
    contact_id: contactId,
    body,
    source: "web",
    contact_name: "Test Guest",
    contact_email: "guest@example.org",
  });
  if (error) throw error;
  return data;
}

/** Collects what a subscription delivers, and waits until it has delivered enough. */
function collector<Item>() {
  const items: Item[] = [];
  return {
    items,
    add: (item: Item) => items.push(item),
    async waitFor(count: number) {
      // Generous, because the first live message after the stack starts can take seconds.
      await expect.poll(() => items.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(count);
    },
  };
}

afterAll(async () => {
  const admin = serverClient();
  // The files these tests uploaded go with the conversations they were in.
  const { data: conversations } = await admin
    .from("conversations")
    .select("id")
    .in("contact_id", guestIds);
  for (const { id } of conversations ?? []) {
    const { data: files } = await admin.storage.from("attachments").list(id);
    if (files?.length) {
      await admin.storage.from("attachments").remove(files.map((file) => `${id}/${file.name}`));
    }
  }
  await admin.from("conversations").delete().in("contact_id", guestIds);
  await Promise.all(guestIds.map((id) => admin.auth.admin.deleteUser(id)));
});

describe("sessions", () => {
  it("has no session until one is started", async () => {
    await expect(newClient().sessions.current()).resolves.toBeNull();
  });

  it("starts a guest session, and keeps it when asked again", async () => {
    const { client, session } = await newGuest();
    expect(session.isGuest).toBe(true);

    await expect(client.sessions.startGuest()).resolves.toEqual(session);
    await expect(client.sessions.current()).resolves.toEqual(session);
  });

  it("does not replace a team member's session with a guest one", async () => {
    const { client, agent } = await signedInAgent();
    await expect(client.sessions.startGuest()).resolves.toEqual({ id: agent.id, isGuest: false });
  });
});

describe("conversations", () => {
  it("gives a guest their own conversations and nobody else's", async () => {
    const { client, session } = await newGuest();
    const other = await newGuest();
    const id = await startConversation(session.id, "Do you ship abroad?");
    const othersId = await startConversation(other.session.id);

    const { items, nextCursor } = await client.conversations.list();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id,
      contactId: session.id,
      status: "open",
      source: "web",
      lastMessagePreview: "Do you ship abroad?",
      unreadForAgents: 1,
      unreadForContact: 0,
      contact: { kind: "guest", verified: false, name: "Test Guest", email: "guest@example.org" },
    });
    expect(nextCursor).toBeUndefined();

    await expect(client.conversations.get(id)).resolves.toMatchObject({ id });
    await expect(client.conversations.get(othersId)).resolves.toBeNull();
  });

  it("gives a team member every conversation, a page at a time, newest first", async () => {
    const { client } = await signedInAgent();
    const { session } = await newGuest();
    const newest = await startConversation(session.id);

    const first = await client.conversations.list({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.items[0]?.id).toBe(newest);
    expect(first.nextCursor).toBeDefined();

    const second = await client.conversations.list({ limit: 2, cursor: first.nextCursor });
    expect(second.items.length).toBeGreaterThan(0);
    const firstIds = first.items.map((item) => item.id);
    expect(second.items.every((item) => !firstIds.includes(item.id))).toBe(true);
  });

  it("filters by status", async () => {
    const { client } = await signedInAgent();

    const resolved = await client.conversations.list({ status: ["resolved"] });
    expect(resolved.items.length).toBeGreaterThan(0);
    expect(resolved.items.every((item) => item.status === "resolved")).toBe(true);

    const active = await client.conversations.list({ status: ["open", "pending"] });
    expect(active.items.some((item) => item.status === "resolved")).toBe(false);
  });

  it("counts conversations that match a filter", async () => {
    const { client } = await signedInAgent();

    const all = await client.conversations.list({ limit: 100 });
    await expect(client.conversations.count()).resolves.toBe(all.items.length);
    await expect(client.conversations.count({ status: ["closed"] })).resolves.toBe(0);
    expect(await client.conversations.count({ status: ["resolved"] })).toBeGreaterThan(0);
  });

  it("counts unread messages for each side", async () => {
    const { client, session } = await newGuest();
    const agent = await signedInAgent();
    const id = await startConversation(session.id);
    const before = await agent.client.conversations.unreadCount("agents");

    await expect(client.conversations.unreadCount("contact")).resolves.toBe(0);
    await agent.client.messages.send(id, "Hi!");
    await agent.client.messages.send(id, "How can I help?");
    await expect(client.conversations.unreadCount("contact")).resolves.toBe(2);

    await client.messages.send(id, "One more thing");
    await expect(agent.client.conversations.unreadCount("agents")).resolves.toBe(before + 1);
  });
});

describe("messages", () => {
  it("sends as whoever is signed in, and lists in the order sent", async () => {
    const { client, session } = await newGuest();
    const agent = await signedInAgent();
    const id = await startConversation(session.id, "First");

    const reply = await agent.client.messages.send(id, "  Second  ");
    expect(reply).toMatchObject({
      ok: true,
      message: {
        conversationId: id,
        senderId: agent.agent.id,
        senderRole: "agent",
        body: "Second",
      },
    });
    await expect(client.messages.send(id, "Third")).resolves.toMatchObject({
      ok: true,
      message: { senderId: session.id, senderRole: "guest" },
    });

    const { items, nextCursor } = await client.messages.list(id);
    expect(items.map((message) => message.body)).toEqual(["First", "Second", "Third"]);
    expect(nextCursor).toBeUndefined();
  });

  it("loads older messages a page at a time", async () => {
    const { client, session } = await newGuest();
    const id = await startConversation(session.id, "1");
    for (const body of ["2", "3", "4", "5"]) await client.messages.send(id, body);

    const latest = await client.messages.list(id, { limit: 2 });
    expect(latest.items.map((message) => message.body)).toEqual(["4", "5"]);

    const older = await client.messages.list(id, { limit: 2, cursor: latest.nextCursor });
    expect(older.items.map((message) => message.body)).toEqual(["2", "3"]);

    const oldest = await client.messages.list(id, { limit: 2, cursor: older.nextCursor });
    expect(oldest.items.map((message) => message.body)).toEqual(["1"]);
    expect(oldest.nextCursor).toBeUndefined();
  });

  it("rejects an empty message before it is sent", async () => {
    const { client, session } = await newGuest();
    const id = await startConversation(session.id);
    await expect(client.messages.send(id, "   ")).rejects.toThrow();
  });

  it("says so when a guest writes too fast", async () => {
    const { client, session } = await newGuest();
    const id = await startConversation(session.id);
    // The conversation's first message counts towards the limit of 20 a minute.
    for (let count = 2; count <= 20; count += 1) await client.messages.send(id, `Message ${count}`);

    await expect(client.messages.send(id, "One too many")).resolves.toEqual({
      ok: false,
      reason: "rate_limited",
    });
  });
});

describe("attachments", () => {
  // The smallest PNG there is: one transparent pixel.
  const pixel = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    ),
    (character) => character.charCodeAt(0),
  );
  const png = () => new Blob([pixel], { type: "image/png" });

  it("sends a file with a message, and lets both sides open it", async () => {
    const guest = await newGuest();
    const conversationId = await startConversation(guest.session.id);

    const uploaded = await guest.client.attachments.upload(conversationId, png(), "my screen.png");
    if (!uploaded.ok) throw new Error(`The upload was refused: ${uploaded.reason}`);
    const sent = await guest.client.messages.send(conversationId, "", [uploaded.attachment]);
    if (!sent.ok) throw new Error("The message was refused.");

    expect(sent.message.body).toBe("");
    expect(sent.message.attachments).toEqual([
      {
        path: uploaded.attachment.path,
        name: "my screen.png",
        type: "image/png",
        size: pixel.length,
      },
    ]);

    // The team reads the same message and gets a link that works.
    const { client: agent } = await signedInAgent();
    const { items } = await agent.messages.list(conversationId);
    expect(items.at(-1)?.attachments[0]?.name).toBe("my screen.png");
    const links = await agent.attachments.urls([uploaded.attachment.path]);
    const opened = await fetch(links[uploaded.attachment.path] ?? "");
    expect(opened.status).toBe(200);
    expect(opened.headers.get("content-type")).toBe("image/png");

    const conversation = await agent.conversations.get(conversationId);
    expect(conversation?.lastMessagePreview).toBe("Sent a file: my screen.png");
  });

  it("keeps a conversation's files from everyone outside it", async () => {
    const owner = await newGuest();
    const conversationId = await startConversation(owner.session.id);
    const uploaded = await owner.client.attachments.upload(conversationId, png(), "private.png");
    if (!uploaded.ok) throw new Error(`The upload was refused: ${uploaded.reason}`);

    const stranger = await newGuest();
    await expect(stranger.client.attachments.urls([uploaded.attachment.path])).resolves.toEqual({});
    await expect(
      stranger.client.attachments.upload(conversationId, png(), "planted.png"),
    ).resolves.toEqual({ ok: false, reason: "forbidden" });
  });

  it("refuses a file that is too large or of a kind it does not take", async () => {
    const guest = await newGuest();
    const conversationId = await startConversation(guest.session.id);

    await expect(
      guest.client.attachments.upload(
        conversationId,
        new Blob(["<script>"], { type: "text/html" }),
        "page.html",
      ),
    ).resolves.toEqual({ ok: false, reason: "unsupported" });
    await expect(
      guest.client.attachments.upload(
        conversationId,
        new Blob([new Uint8Array(10 * 1024 * 1024 + 1)], { type: "image/png" }),
        "huge.png",
      ),
    ).resolves.toEqual({ ok: false, reason: "too_large" });
  });
});

describe("live updates", () => {
  it("delivers each new message to both sides of a conversation", async () => {
    const { client, session } = await newGuest();
    const agent = await signedInAgent();
    const id = await startConversation(session.id);

    const guestSaw = collector<Message>();
    const agentSaw = collector<Message>();
    const stopGuest = await client.messages.subscribe(id, guestSaw.add);
    const stopAgent = await agent.client.messages.subscribe(id, agentSaw.add);

    await agent.client.messages.send(id, "Hi, how can I help?");
    await client.messages.send(id, "My order has not arrived.");
    await guestSaw.waitFor(2);
    await agentSaw.waitFor(2);

    const bodies = ["Hi, how can I help?", "My order has not arrived."];
    expect(guestSaw.items.map((message) => message.body)).toEqual(bodies);
    expect(agentSaw.items.map((message) => message.body)).toEqual(bodies);
    expect(guestSaw.items[0]).toMatchObject({ senderRole: "agent", conversationId: id });

    await stopGuest();
    await stopAgent();
  });

  it("lets two parts of a screen listen to the same conversation, and stop separately", async () => {
    const { client, session } = await newGuest();
    const id = await startConversation(session.id);

    const first = collector<Message>();
    const second = collector<Message>();
    const stopFirst = await client.messages.subscribe(id, first.add);
    const stopSecond = await client.messages.subscribe(id, second.add);

    await client.messages.send(id, "Both hear this");
    await first.waitFor(1);
    await second.waitFor(1);

    await stopFirst();
    await client.messages.send(id, "Only the second hears this");
    await second.waitFor(2);
    expect(first.items).toHaveLength(1);

    await stopSecond();
  });

  it("refuses to let a guest listen to someone else's conversation", async () => {
    const owner = await newGuest();
    const other = await newGuest();
    const id = await startConversation(owner.session.id);

    await expect(other.client.messages.subscribe(id, () => undefined)).rejects.toThrow(
      /live updates/,
    );
  });

  it("tells a contact and the team when a conversation changes", async () => {
    const { client, session } = await newGuest();
    const agent = await signedInAgent();
    const id = await startConversation(session.id);

    const contactSaw = collector<{ id: string; unreadForContact: number }>();
    const inboxSaw = collector<{ id: string; lastMessagePreview: string | null }>();
    const stopContact = await client.conversations.subscribe(
      { contactId: session.id },
      contactSaw.add,
    );
    const stopInbox = await agent.client.conversations.subscribe({ inbox: true }, inboxSaw.add);

    await agent.client.messages.send(id, "We are looking into it.");
    await contactSaw.waitFor(1);
    await inboxSaw.waitFor(1);

    expect(contactSaw.items.at(-1)).toMatchObject({ id, unreadForContact: 1 });
    expect(inboxSaw.items.at(-1)).toMatchObject({
      id,
      lastMessagePreview: "We are looking into it.",
    });

    await stopContact();
    await stopInbox();
  });

  it("keeps the inbox and other contacts' changes private", async () => {
    const guest = await newGuest();
    const other = await newGuest();

    await expect(
      guest.client.conversations.subscribe({ inbox: true }, () => undefined),
    ).rejects.toThrow(/live updates/);
    await expect(
      guest.client.conversations.subscribe({ contactId: other.session.id }, () => undefined),
    ).rejects.toThrow(/live updates/);
  });
});
