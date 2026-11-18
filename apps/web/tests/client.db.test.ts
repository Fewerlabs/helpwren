import { createHelpwrenClient, type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";

import { POST as markRead } from "@/app/api/conversations/[id]/read/route";
import { POST as startConversation } from "@/app/api/conversations/route";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";

// The client library and the API routes, working together against the local database. The
// library's `fetch` is wired straight to the route handlers, so no server needs to be running.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const READ_PATH = /^\/api\/conversations\/([^/]+)\/read$/;

const routeFetch: typeof fetch = (input, init) => {
  // The library only ever passes a path.
  if (typeof input !== "string") throw new TypeError("Expected a path.");
  const request = new Request(new URL(input, "http://localhost"), init);
  const { pathname } = new URL(request.url);
  if (pathname === "/api/conversations") return startConversation(request);

  const id = READ_PATH.exec(pathname)?.[1];
  if (id) return markRead(request, { params: Promise.resolve({ id }) });
  return Promise.resolve(new Response(null, { status: 404 }));
};

const guestIds: string[] = [];

async function newGuest() {
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const client = createHelpwrenClient({ supabase, fetch: routeFetch });
  const session = await client.sessions.startGuest();
  guestIds.push(session.id);
  return { client, session };
}

afterAll(async () => {
  await supabaseAdmin.from("conversations").delete().in("contact_id", guestIds);
  await Promise.all(guestIds.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
});

const contact = { name: "Mei Tanaka", phone: "+81312345678" };

describe("the client library through the API", () => {
  it("starts a conversation and hands it back with its contact", async () => {
    const { client, session } = await newGuest();

    const result = await client.conversations.start({
      message: "Is the mobile app out yet?",
      contact,
      page: { url: "https://example.com/apps" },
    });

    expect(result).toMatchObject({
      ok: true,
      conversation: {
        contactId: session.id,
        status: "open",
        lastMessagePreview: "Is the mobile app out yet?",
        context: { url: "https://example.com/apps" },
        contact: { kind: "guest", email: null, ...contact },
      },
    });
    await expect(client.conversations.list()).resolves.toMatchObject({ items: [{}] });
  });

  it("reports that contact details are needed", async () => {
    const { client } = await newGuest();
    await expect(client.conversations.start({ message: "Hello" })).resolves.toEqual({
      ok: false,
      reason: "details_required",
    });
  });

  it("reports the limit on new conversations", async () => {
    const { client } = await newGuest();
    for (let count = 1; count <= 5; count += 1) {
      await client.conversations.start({ message: `Question ${count}`, contact });
    }
    await expect(client.conversations.start({ message: "Question 6" })).resolves.toEqual({
      ok: false,
      reason: "rate_limited",
    });
  });

  it("marks a conversation as read for the contact", async () => {
    const { client, session } = await newGuest();
    const started = await client.conversations.start({ message: "Hello", contact });
    if (!started.ok) throw new Error("The conversation did not start.");
    const { id } = started.conversation;

    const { data: agent } = await supabaseAdmin.from("agents").select("user_id").limit(1).single();
    await supabaseAdmin.from("messages").insert({
      conversation_id: id,
      sender_id: agent?.user_id ?? session.id,
      sender_role: "agent",
      body: "Hi there!",
    });
    await expect(client.conversations.unreadCount("contact")).resolves.toBe(1);

    await client.conversations.markRead(id);
    await expect(client.conversations.unreadCount("contact")).resolves.toBe(0);
  });

  it("throws when asked to mark someone else's conversation as read", async () => {
    const owner = await newGuest();
    const started = await owner.client.conversations.start({ message: "Hello", contact });
    if (!started.ok) throw new Error("The conversation did not start.");

    const other = await newGuest();
    await expect(other.client.conversations.markRead(started.conversation.id)).rejects.toThrow(
      /mark the conversation as read/,
    );
  });
});
