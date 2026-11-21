import { randomUUID } from "node:crypto";

import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  removeSubscriptionAs,
  saveSubscriptionAs,
} from "@/features/notifications/server/subscriptions";
import { getVapidPublicKey, processAgentPushQueue, type PushTarget } from "@/lib/agent-push";
import { type AgentPushPayload } from "@/lib/agent-push-payload";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServerUrl } from "@/lib/supabase/server-url";

import { newGuest, removePeople, signInAgent, type Person } from "./support/people";

// Team members' browsers subscribing to pushes, and the pushes sent when a contact writes,
// against the shared local database. The push service is a stand-in that records what it was
// given, so nothing leaves this machine. Everything made here has this run's id in it.
const run = randomUUID().slice(0, 8);
const madeAgents: string[] = [];
const guests: Person[] = [];

const endpoint = (name: string) => `https://push.example.test/${run}/${name}`;
const subscription = (name: string) => ({
  endpoint: endpoint(name),
  keys: { p256dh: `p256dh-${name}`, auth: `auth-${name}` },
});

/** A new team member, signed in, with a Supabase client that acts as them. */
async function newMember(name: string) {
  const email = `${name}.${run}@example.test`;
  const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  const id = created.data.user.id;
  madeAgents.push(id);
  const inserted = await supabaseAdmin
    .from("agents")
    .insert({ user_id: id, name: `${name} ${run}`, email, role: "agent" });
  if (inserted.error) throw inserted.error;
  const person = await signInAgent(email);
  const client = createClient<Database>(
    supabaseServerUrl,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: person.headers },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return { id, client };
}

async function subscriptionRow(name: string) {
  const { data } = await supabaseAdmin
    .from("agent_push_subscriptions")
    .select("agent_id, notify_about, last_used_at")
    .eq("endpoint", endpoint(name))
    .maybeSingle();
  return data;
}

/** A guest's new conversation, which queues a push for the team. */
async function newConversation(contactName: string, body: string) {
  const guest = await newGuest();
  guests.push(guest);
  const { data, error } = await supabaseAdmin.rpc("start_conversation", {
    contact_id: guest.id,
    body,
    source: "web",
    contact_name: contactName,
  });
  if (error) throw error;
  return data;
}

/** A push service that accepts everything, except the browsers it is told are gone. */
function fakePush(gone: readonly string[] = []) {
  const sent: { target: PushTarget; payload: AgentPushPayload }[] = [];
  const send = (target: PushTarget, payload: AgentPushPayload) => {
    sent.push({ target, payload });
    return Promise.resolve(gone.includes(target.endpoint) ? ("gone" as const) : ("sent" as const));
  };
  // Only what this run sent: the shared database may hold other browsers.
  const to = (name: string) => sent.filter(({ target }) => target.endpoint === endpoint(name));
  return { send, to };
}

let ada: Awaited<ReturnType<typeof newMember>>;
let sam: Awaited<ReturnType<typeof newMember>>;

beforeAll(async () => {
  [ada, sam] = await Promise.all([newMember("ada"), newMember("sam")]);
});

afterAll(async () => {
  await supabaseAdmin
    .from("agent_push_subscriptions")
    .delete()
    .like("endpoint", `https://push.example.test/${run}/%`);
  await removePeople(guests);
  await Promise.all(madeAgents.map((id) => supabaseAdmin.auth.admin.deleteUser(id)));
});

describe("subscribing", () => {
  it("keeps a team member's browser, and forgets it when they turn notifications off", async () => {
    await expect(
      saveSubscriptionAs(ada.client, ada.id, subscription("ada-laptop"), "all", "Laptop"),
    ).resolves.toEqual({ ok: true });
    expect(await subscriptionRow("ada-laptop")).toMatchObject({
      agent_id: ada.id,
      notify_about: "all",
    });

    await expect(removeSubscriptionAs(ada.client, endpoint("ada-laptop"))).resolves.toEqual({
      ok: true,
    });
    expect(await subscriptionRow("ada-laptop")).toBeNull();
  });

  it("refuses something that is not a browser's subscription", async () => {
    const plain = { ...subscription("plain"), endpoint: "http://push.example.test/plain" };
    await expect(saveSubscriptionAs(ada.client, ada.id, plain, "all", null)).resolves.toEqual({
      ok: false,
      reason: "invalid",
    });
    await expect(
      saveSubscriptionAs(ada.client, ada.id, subscription("odd"), "some", null),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
  });

  it("does not let one team member remove another's browser", async () => {
    await saveSubscriptionAs(ada.client, ada.id, subscription("ada-phone"), "all", null);
    await removeSubscriptionAs(sam.client, endpoint("ada-phone"));
    expect(await subscriptionRow("ada-phone")).toMatchObject({ agent_id: ada.id });
  });

  it("makes the install's VAPID keys once and keeps them", async () => {
    const first = await getVapidPublicKey();
    expect(first).toMatch(/^[A-Za-z0-9_-]{80,}$/);
    await expect(getVapidPublicKey()).resolves.toBe(first);
  });
});

describe("sending", () => {
  it("tells each team member about the conversations their Notify me about includes", async () => {
    await saveSubscriptionAs(ada.client, ada.id, subscription("ada-phone"), "all", null);
    await saveSubscriptionAs(sam.client, sam.id, subscription("sam-phone"), "mine", null);

    const unassigned = await newConversation(`Priya ${run}`, "Where is my order?");
    const adas = await newConversation(`Lee ${run}`, `Hello again ${"and again ".repeat(30)}`);
    const assigned = await supabaseAdmin
      .from("conversations")
      .update({ assignee_id: ada.id })
      .eq("id", adas);
    if (assigned.error) throw assigned.error;

    const push = fakePush();
    await processAgentPushQueue(push.send);

    expect(push.to("ada-phone").map(({ payload }) => payload.tag)).toEqual(
      expect.arrayContaining([unassigned, adas]),
    );
    // Sam hears about unassigned conversations and their own, not Ada's.
    expect(push.to("sam-phone").map(({ payload }) => payload.tag)).toEqual([unassigned]);

    const payload = push.to("ada-phone").find((sent) => sent.payload.tag === unassigned)?.payload;
    expect(payload).toEqual({
      title: `Priya ${run}`,
      body: "Where is my order?",
      url: `/dashboard/inbox?view=all&c=${unassigned}`,
      tag: unassigned,
    });
    const long = push.to("ada-phone").find((sent) => sent.payload.tag === adas)?.payload;
    expect(long?.body.length).toBeLessThanOrEqual(100);
    expect((await subscriptionRow("ada-phone"))?.last_used_at).not.toBeNull();
  });

  it("sends one push for a conversation however many messages came, and none twice", async () => {
    const conversation = await newConversation(`Kim ${run}`, "One");
    const guest = guests.at(-1);
    if (!guest) throw new Error("No guest.");
    const more = await supabaseAdmin.from("messages").insert([
      { conversation_id: conversation, sender_id: guest.id, sender_role: "guest", body: "Two" },
      { conversation_id: conversation, sender_id: guest.id, sender_role: "guest", body: "Three" },
    ]);
    if (more.error) throw more.error;

    const push = fakePush();
    await processAgentPushQueue(push.send);
    const sent = push.to("ada-phone").filter(({ payload }) => payload.tag === conversation);
    expect(sent).toHaveLength(1);

    const again = fakePush();
    await processAgentPushQueue(again.send);
    expect(again.to("ada-phone")).toHaveLength(0);
  });

  it("forgets a browser the push service says is gone", async () => {
    await saveSubscriptionAs(ada.client, ada.id, subscription("ada-old-tablet"), "all", null);
    await newConversation(`Noor ${run}`, "Anyone there?");

    const push = fakePush([endpoint("ada-old-tablet")]);
    const result = await processAgentPushQueue(push.send);

    expect(push.to("ada-old-tablet")).toHaveLength(1);
    expect(result.removedSubscriptions).toBeGreaterThanOrEqual(1);
    expect(await subscriptionRow("ada-old-tablet")).toBeNull();
    // The other browser still got it.
    expect(push.to("ada-phone")).toHaveLength(1);
  });
});
