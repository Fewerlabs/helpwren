import { createHelpwrenClient, type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it, vi } from "vitest";

import { getCaller } from "@/lib/api/caller";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionForUser, type UserSession } from "@/lib/supabase/user-session";

// A session made on the server for one of the host product's users, used the way the chat
// frame will use it: loaded into a browser client, then left to the access rules.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const run = crypto.randomUUID();
const userIds = new Set<string>();

async function signIn(externalId: string): Promise<UserSession> {
  const session = await sessionForUser(`${run}:${externalId}`);
  userIds.add(session.userId);
  return session;
}

/** A client holding the session, as the chat frame does after `setSession`. */
async function browserWith(session: UserSession) {
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) throw error;
  return { supabase, client: createHelpwrenClient({ supabase }) };
}

async function startConversation(contactId: string, body: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: contactId,
    body,
    source: "web",
    contact_name: "Amara Okafor",
  });
  if (error) throw error;
  return data;
}

afterAll(async () => {
  const ids = [...userIds];
  await supabaseAdmin.from("conversations").delete().in("contact_id", ids);
  const removed = await Promise.all(ids.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
  const failed = removed.filter(({ error }) => error);
  if (failed.length > 0) throw new Error(`Left ${String(failed.length)} test users behind.`);
});

describe("a session for an identified user", () => {
  it("is the same user on every device, and a different one for another id", async () => {
    const [phone, laptop, someoneElse] = [
      await signIn("user-1"),
      await signIn("user-1"),
      await signIn("user-2"),
    ];

    expect(laptop.userId).toBe(phone.userId);
    expect(someoneElse.userId).not.toBe(phone.userId);
  });

  it("is not a guest session, and the API accepts it", async () => {
    const session = await signIn("user-1");
    const { client } = await browserWith(session);

    await expect(client.sessions.current()).resolves.toEqual({
      id: session.userId,
      isGuest: false,
    });

    const request = new Request("http://localhost/api", {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    await expect(getCaller(request)).resolves.toEqual({
      id: session.userId,
      isAgent: false,
      isGuest: false,
    });
  });

  it("reads its own conversations and nobody else's", async () => {
    const [mine, theirs] = [await signIn("user-1"), await signIn("user-2")];
    const myConversation = await startConversation(mine.userId, "Where is my order?");
    await startConversation(theirs.userId, "Can I change my booking?");

    const { client } = await browserWith(mine);
    const { items } = await client.conversations.list();

    expect(items.map((conversation) => conversation.id)).toEqual([myConversation]);
  });

  it("hears its own conversation live", async () => {
    const session = await signIn("user-1");
    const conversationId = await startConversation(session.userId, "Is anyone there?");
    const { supabase, client } = await browserWith(session);

    const heard = new Promise<string>((resolve) => {
      void client.messages
        .subscribe(conversationId, (message) => {
          resolve(message.body);
        })
        .then(() =>
          supabaseAdmin.from("messages").insert({
            conversation_id: conversationId,
            sender_id: session.userId,
            sender_role: "agent",
            body: "Yes, hello.",
          }),
        );
    });

    await expect(heard).resolves.toBe("Yes, hello.");
    await supabase.removeAllChannels();
  });

  it("can be renewed without the server", async () => {
    const session = await signIn("user-1");
    const { supabase } = await browserWith(session);

    const { data, error } = await supabase.auth.refreshSession();

    expect(error).toBeNull();
    expect(data.session?.user.id).toBe(session.userId);
    expect(data.session?.refresh_token).not.toBe(session.refreshToken);
  });

  it("signs the same new user in from several tabs at the same moment", async () => {
    const tabs = Array.from({ length: 5 }, () => signIn("user-3"));
    const sessions = await Promise.all(tabs);

    expect(new Set(sessions.map((session) => session.userId)).size).toBe(1);
    expect(new Set(sessions.map((session) => session.refreshToken)).size).toBe(5);
  });

  it("leaves the server's own client acting as the server", async () => {
    await signIn("user-1");

    const { data } = await supabaseAdmin.auth.getSession();
    expect(data.session).toBeNull();
  });
});
