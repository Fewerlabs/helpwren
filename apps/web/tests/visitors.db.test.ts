import { type Database } from "@helpwren/core";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as startConversation } from "@/app/api/conversations/route";
import {
  DELETE as cancelOutreach,
  POST as writeOutreach,
} from "@/app/api/visitors/[id]/outreach/route";
import { POST as claimOutreach } from "@/app/api/visitors/outreach/route";
import { POST as checkIn } from "@/app/api/visitors/route";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, removePeople, signInAgent, type Person } from "./support/people";

// A request with no bearer token falls back to the session in its cookies. There is no request
// scope here, so the cookie store is an empty stand-in: these callers have no cookies.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const SAFARI_ON_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";

const guests: Person[] = [];
const visitorIds: string[] = [];
let agent: Person;
let savedSetting: Database["public"]["Tables"]["settings"]["Row"]["value"] | undefined;

async function guest() {
  const person = await newGuest();
  guests.push(person);
  return person;
}

function newVisitorId() {
  const id = `test-${crypto.randomUUID()}`;
  visitorIds.push(id);
  return id;
}

function post(
  handler: (request: Request) => Promise<Response>,
  path: string,
  person: Person | null,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return handler(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { ...person?.headers, ...headers },
      body: JSON.stringify(body),
    }),
  );
}

function outreach(method: "POST" | "DELETE", person: Person | null, id: string, body?: unknown) {
  const request = new Request(`http://localhost/api/visitors/${id}/outreach`, {
    method,
    headers: { ...person?.headers },
    body: JSON.stringify(body ?? {}),
  });
  const context = { params: Promise.resolve({ id }) };
  return method === "POST" ? writeOutreach(request, context) : cancelOutreach(request, context);
}

async function setVisitors(value: { tracking: boolean; liveList: boolean }) {
  await supabaseAdmin.from("settings").upsert({ key: "visitors", value, is_public: true });
}

async function status(response: Response) {
  const body = (await response.json()) as { error?: { code: string } };
  return [response.status, body.error?.code];
}

beforeAll(async () => {
  agent = await signInAgent("sam@example.com");
  const { data } = await supabaseAdmin
    .from("settings")
    .select("value")
    .eq("key", "visitors")
    .maybeSingle();
  savedSetting = data?.value;
});

afterEach(async () => {
  // Back to what the install had, which other tests and sessions may rely on.
  if (savedSetting === undefined) {
    await supabaseAdmin.from("settings").delete().eq("key", "visitors");
  } else {
    await supabaseAdmin
      .from("settings")
      .upsert({ key: "visitors", value: savedSetting, is_public: true });
  }
});

afterAll(async () => {
  await supabaseAdmin.from("visitors").delete().in("id", visitorIds);
  await removePeople(guests);
});

describe("POST /api/visitors", () => {
  it("records a browsing visitor with their browser and location, and nothing else", async () => {
    const id = newVisitorId();
    const response = await post(
      checkIn,
      "/api/visitors",
      null,
      {
        visitorId: id,
        page: { url: "https://shop.example.com/pricing", title: "Pricing" },
        referrer: "https://search.example.org/?q=shop",
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
      },
      {
        "user-agent": SAFARI_ON_IPHONE,
        "x-vercel-ip-country": "BR",
        "x-vercel-ip-country-region": "SP",
        "x-vercel-ip-city": "S%C3%A3o%20Paulo",
        "x-forwarded-for": "203.0.113.7",
      },
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ outreach: false });

    const { data } = await supabaseAdmin.from("visitors").select("*").eq("id", id).single();
    expect(data).toMatchObject({
      contact_id: null,
      page_url: "https://shop.example.com/pricing",
      page_title: "Pricing",
      referrer: "https://search.example.org/?q=shop",
      browser: "Safari",
      os: "iOS",
      device: "mobile",
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
      country: "BR",
      region: "SP",
      city: "São Paulo",
      session_count: 1,
    });
    expect(JSON.stringify(data)).not.toContain("203.0.113.7");
  });

  it("forgets a referrer from the same site", async () => {
    const id = newVisitorId();
    await post(checkIn, "/api/visitors", null, {
      visitorId: id,
      page: { url: "https://shop.example.com/b" },
      referrer: "https://shop.example.com/a",
    });
    const { data } = await supabaseAdmin.from("visitors").select("referrer").eq("id", id).single();
    expect(data?.referrer).toBeNull();
  });

  it("refuses an id that is not one, and a page that is not an address", async () => {
    await expect(
      status(
        await post(checkIn, "/api/visitors", null, {
          visitorId: "x",
          page: { url: "https://a.example" },
        }),
      ),
    ).resolves.toEqual([400, "invalid_request"]);
    await expect(
      status(
        await post(checkIn, "/api/visitors", null, {
          visitorId: newVisitorId(),
          page: { url: "javascript:alert(1)" },
        }),
      ),
    ).resolves.toEqual([400, "invalid_request"]);
  });

  it("refuses check-ins while the install keeps no track of visitors", async () => {
    await setVisitors({ tracking: false, liveList: true });
    const id = newVisitorId();
    await expect(
      status(
        await post(checkIn, "/api/visitors", null, {
          visitorId: id,
          page: { url: "https://shop.example.com/" },
        }),
      ),
    ).resolves.toEqual([410, "disabled"]);
    const { data } = await supabaseAdmin.from("visitors").select("id").eq("id", id);
    expect(data).toEqual([]);
  });

  it("gives a contact who has written their browser's details", async () => {
    const person = await guest();
    const id = newVisitorId();
    await post(checkIn, "/api/visitors", null, {
      visitorId: id,
      page: { url: "https://shop.example.com/help", title: "Help" },
      timezone: "Europe/Berlin",
    });

    const started = await post(startConversation, "/api/conversations", person, {
      message: "Where is my order?",
      contact: { name: "Lena Vogel", email: "lena@example.org" },
      visitorId: id,
    });
    expect(started.status).toBe(201);

    const { data: visitor } = await supabaseAdmin
      .from("visitors")
      .select("contact_id")
      .eq("id", id)
      .single();
    expect(visitor?.contact_id).toBe(person.id);

    // Later check-ins carry the session, and keep the contact up to date.
    await post(
      checkIn,
      "/api/visitors",
      person,
      { visitorId: id, page: { url: "https://shop.example.com/orders", title: "Orders" } },
      { "user-agent": SAFARI_ON_IPHONE },
    );
    const { data: contact } = await supabaseAdmin
      .from("contacts")
      .select("timezone, browser, last_page_title, session_count")
      .eq("id", person.id)
      .single();
    expect(contact).toEqual({
      timezone: "Europe/Berlin",
      browser: "Safari",
      last_page_title: "Orders",
      session_count: 1,
    });
  });
});

describe("a first message from the team", () => {
  async function browsing() {
    const id = newVisitorId();
    await post(checkIn, "/api/visitors", null, {
      visitorId: id,
      page: { url: "https://shop.example.com/pricing", title: "Pricing" },
    });
    return id;
  }

  it("waits for the visitor's browser, which takes it up as a conversation", async () => {
    const id = await browsing();
    const written = await outreach("POST", agent, id, { message: "Any questions about plans?" });
    expect(written.status).toBe(200);

    const next = await post(checkIn, "/api/visitors", null, {
      visitorId: id,
      page: { url: "https://shop.example.com/pricing" },
    });
    await expect(next.json()).resolves.toEqual({ outreach: true });

    // The chat starts a guest session to take it up.
    const person = await guest();
    const claimed = await post(claimOutreach, "/api/visitors/outreach", person, {
      visitorId: id,
      page: { url: "https://shop.example.com/pricing", title: "Pricing" },
    });
    const { conversationId } = (await claimed.json()) as { conversationId: string };
    expect(conversationId).toEqual(expect.any(String));

    const { data } = await supabaseAdmin
      .from("conversations")
      .select("contact_id, assignee_id, unread_for_contact, messages(sender_id, sender_role, body)")
      .eq("id", conversationId)
      .single();
    expect(data).toEqual({
      contact_id: person.id,
      assignee_id: agent.id,
      unread_for_contact: 1,
      messages: [{ sender_id: agent.id, sender_role: "agent", body: "Any questions about plans?" }],
    });

    const again = await post(claimOutreach, "/api/visitors/outreach", person, { visitorId: id });
    await expect(again.json()).resolves.toEqual({ conversationId: null });
  });

  it("can be taken back before it is taken up", async () => {
    const id = await browsing();
    await outreach("POST", agent, id, { message: "Hello there" });
    expect((await outreach("DELETE", agent, id)).status).toBe(200);

    const next = await post(checkIn, "/api/visitors", null, {
      visitorId: id,
      page: { url: "https://shop.example.com/pricing" },
    });
    await expect(next.json()).resolves.toEqual({ outreach: false });
  });

  it("is written only by the team, while both settings are on", async () => {
    const id = await browsing();
    await expect(status(await outreach("POST", null, id, { message: "Hi" }))).resolves.toEqual([
      401,
      "unauthorized",
    ]);
    await expect(
      status(await outreach("POST", await guest(), id, { message: "Hi" })),
    ).resolves.toEqual([403, "forbidden"]);
    await expect(
      status(await outreach("POST", agent, newVisitorId(), { message: "Hi" })),
    ).resolves.toEqual([404, "not_found"]);

    await setVisitors({ tracking: true, liveList: false });
    await expect(status(await outreach("POST", agent, id, { message: "Hi" }))).resolves.toEqual([
      410,
      "disabled",
    ]);
  });

  it("is not taken up by a team member", async () => {
    const id = await browsing();
    await outreach("POST", agent, id, { message: "Hello" });
    await expect(
      status(await post(claimOutreach, "/api/visitors/outreach", agent, { visitorId: id })),
    ).resolves.toEqual([403, "forbidden"]);
  });
});
