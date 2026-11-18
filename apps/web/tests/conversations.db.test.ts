import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { POST as markRead } from "@/app/api/conversations/[id]/read/route";
import { POST as startConversation } from "@/app/api/conversations/route";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, removePeople, signInAgent, type Person } from "./support/people";

// A request with no bearer token falls back to the session in its cookies. There is no request
// scope here, so the cookie store is an empty stand-in: these callers have no cookies.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

// These call the route handlers directly, against the local database and its demo data. The
// demo install asks guests for a name and an email or phone number.
const created: Person[] = [];
async function guest() {
  const person = await newGuest();
  created.push(person);
  return person;
}

function start(person: Person | null, body: unknown) {
  return startConversation(
    new Request("http://localhost/api/conversations", {
      method: "POST",
      headers: { ...person?.headers, "user-agent": "vitest" },
      body: JSON.stringify(body),
    }),
  );
}

function read(person: Person | null, id: string) {
  return markRead(
    new Request(`http://localhost/api/conversations/${id}/read`, {
      method: "POST",
      headers: { ...person?.headers },
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function errorCode(response: Response) {
  const body = (await response.json()) as { error: { code: string } };
  return [response.status, body.error.code];
}

async function conversationId(response: Response) {
  expect(response.status).toBe(201);
  const body = (await response.json()) as { conversationId: string };
  return body.conversationId;
}

const details = { name: "Priya Nair", email: "priya@example.org" };

async function setGuestDetails(value: string) {
  await supabaseAdmin.from("settings").update({ value }).eq("key", "guest_details");
}

afterEach(async () => {
  await setGuestDetails("email_or_phone");
});

afterAll(async () => {
  await removePeople(created);
});

describe("POST /api/conversations", () => {
  it("starts a conversation for a guest, with details and context filled in", async () => {
    const person = await guest();
    const id = await conversationId(
      await start(person, {
        message: "Do you ship abroad?",
        contact: details,
        page: { url: "https://example.com/pricing", title: "Pricing" },
      }),
    );

    const { data } = await supabaseAdmin
      .from("conversations")
      .select("source, context, unread_for_agents, contact:contacts(kind, verified, name, email)")
      .eq("id", id)
      .single();
    expect(data).toEqual({
      source: "web",
      context: { url: "https://example.com/pricing", title: "Pricing", userAgent: "vitest" },
      unread_for_agents: 1,
      contact: { kind: "guest", verified: false, ...details },
    });
  });

  it("accepts a phone number in place of an email", async () => {
    const response = await start(await guest(), {
      message: "Call me back, please.",
      contact: { name: "Jonas Berg", phone: "+447700900123" },
    });
    expect(response.status).toBe(201);
  });

  it("asks for details the first time, and not again afterwards", async () => {
    const person = await guest();
    await expect(errorCode(await start(person, { message: "Hello" }))).resolves.toEqual([
      422,
      "details_required",
    ]);
    await expect(
      errorCode(await start(person, { message: "Hello", contact: { name: "No Contact" } })),
    ).resolves.toEqual([422, "details_required"]);

    await conversationId(await start(person, { message: "Hello", contact: details }));
    await conversationId(await start(person, { message: "One more thing" }));
  });

  it("follows the install's setting for what guests are asked", async () => {
    await setGuestDetails("phone");
    await expect(
      errorCode(await start(await guest(), { message: "Hello", contact: details })),
    ).resolves.toEqual([422, "details_required"]);

    await setGuestDetails("none");
    await conversationId(await start(await guest(), { message: "Hello" }));
  });

  it("refuses a request with no session", async () => {
    await expect(errorCode(await start(null, { message: "Hello" }))).resolves.toEqual([
      401,
      "unauthorized",
    ]);
  });

  it("refuses a session that has been made up", async () => {
    const forged = { id: "", headers: { authorization: "Bearer not.a.token" } };
    await expect(errorCode(await start(forged, { message: "Hello" }))).resolves.toEqual([
      401,
      "unauthorized",
    ]);
  });

  it("refuses a team member", async () => {
    const agent = await signInAgent("sam@example.com");
    await expect(
      errorCode(await start(agent, { message: "Hello", contact: details })),
    ).resolves.toEqual([403, "forbidden"]);
  });

  it.each([
    ["no message", { contact: details }],
    ["a malformed phone number", { message: "Hello", contact: { name: "A", phone: "0801" } }],
    ["a source this install does not have", { message: "Hello", contact: details, source: "fax" }],
    ["a body that is not JSON", undefined],
  ])("rejects %s", async (_, body) => {
    await expect(errorCode(await start(await guest(), body))).resolves.toEqual([
      400,
      "invalid_request",
    ]);
  });

  it("limits how many conversations one person starts", async () => {
    const person = await guest();
    for (let count = 1; count <= 5; count += 1) {
      await conversationId(await start(person, { message: `Question ${count}`, contact: details }));
    }
    await expect(errorCode(await start(person, { message: "Question 6" }))).resolves.toEqual([
      429,
      "rate_limited",
    ]);
  });
});

describe("POST /api/conversations/{id}/read", () => {
  async function unread(id: string) {
    const { data } = await supabaseAdmin
      .from("conversations")
      .select("unread_for_agents, unread_for_contact")
      .eq("id", id)
      .single();
    return data;
  }

  it("clears each side's count separately", async () => {
    const person = await guest();
    const agent = await signInAgent("sam@example.com");
    const id = await conversationId(await start(person, { message: "Hello", contact: details }));
    await supabaseAdmin
      .from("messages")
      .insert({ conversation_id: id, sender_id: agent.id, sender_role: "agent", body: "Hi!" });
    expect(await unread(id)).toEqual({ unread_for_agents: 1, unread_for_contact: 1 });

    expect((await read(person, id)).status).toBe(204);
    expect(await unread(id)).toEqual({ unread_for_agents: 1, unread_for_contact: 0 });

    expect((await read(agent, id)).status).toBe(204);
    expect(await unread(id)).toEqual({ unread_for_agents: 0, unread_for_contact: 0 });
  });

  it("gives another guest the same answer as for a conversation that does not exist", async () => {
    const owner = await guest();
    const id = await conversationId(await start(owner, { message: "Hello", contact: details }));
    const other = await guest();

    await expect(errorCode(await read(other, id))).resolves.toEqual([404, "not_found"]);
    await expect(
      errorCode(await read(other, "00000000-0000-4000-8000-000000000000")),
    ).resolves.toEqual([404, "not_found"]);
    await expect(errorCode(await read(other, "not-an-id"))).resolves.toEqual([404, "not_found"]);
    expect(await unread(id)).toMatchObject({ unread_for_agents: 1 });
  });

  it("refuses a request with no session", async () => {
    await expect(
      errorCode(await read(null, "00000000-0000-4000-8000-000000000000")),
    ).resolves.toEqual([401, "unauthorized"]);
  });
});
