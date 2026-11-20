import { randomInt, randomUUID } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { POST as answerArticle } from "@/app/api/articles/[id]/feedback/route";
import { POST as upload } from "@/app/api/conversations/[id]/attachments/route";
import { POST as startConversation } from "@/app/api/conversations/route";
import { POST as checkIn } from "@/app/api/visitors/route";
import { requestNetwork } from "@/lib/api/rate-limit";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { newGuest, removePeople, signInAgent, type Person } from "./support/people";

// The captcha's secret is read when the server's environment is first parsed.
vi.hoisted(() => {
  process.env.TURNSTILE_SECRET_KEY = "test-turnstile-secret";
});

// A request with no bearer token falls back to the session in its cookies. There is no request
// scope here, so the cookie store is an empty stand-in: these callers have no cookies.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

const created: Person[] = [];
async function guest() {
  const person = await newGuest();
  created.push(person);
  return person;
}

/** A network of its own for each test, so counts left by other runs do not carry over. */
function freshNetwork() {
  return `198.51.${randomInt(0, 255)}.${randomInt(1, 254)}`;
}

const details = { name: "Priya Nair", email: "priya@example.org" };

function start(person: Person, body: Record<string, unknown>, network = freshNetwork()) {
  return startConversation(
    new Request("http://localhost/api/conversations", {
      method: "POST",
      headers: { ...person.headers, "x-forwarded-for": network },
      body: JSON.stringify({ message: "Do you ship abroad?", contact: details, ...body }),
    }),
  );
}

async function errorCode(response: Response) {
  const body = (await response.json()) as { error: { code: string } };
  return [response.status, body.error.code];
}

afterAll(async () => {
  await removePeople(created);
});

describe("starting a conversation", () => {
  it("refuses a form whose hidden field was filled in", async () => {
    const response = await start(await guest(), { honeypot: "https://cheap-pills.example" });
    expect(await errorCode(response)).toEqual([422, "refused"]);
  });

  it("refuses a form sent faster than a person types", async () => {
    expect(await errorCode(await start(await guest(), { elapsedMs: 40 }))).toEqual([
      422,
      "refused",
    ]);
    expect((await start(await guest(), { elapsedMs: 9000 })).status).toBe(201);
  });

  it("refuses a page address that is not a web address", async () => {
    const response = await start(await guest(), {
      page: { url: "javascript:alert(document.cookie)" },
    });
    expect(response.status).toBe(400);
  });

  it("refuses a first message that is only a link", async () => {
    const response = await start(await guest(), { message: "https://spam.example/win" });
    expect(await errorCode(response)).toEqual([422, "refused"]);
  });

  it("records the visitor's network as a keyed hash, never as an address", async () => {
    const person = await guest();
    const network = freshNetwork();
    expect((await start(person, {}, network)).status).toBe(201);

    const { data } = await supabaseAdmin
      .from("contacts")
      .select("network_key")
      .eq("id", person.id)
      .single();
    expect(data?.network_key).toMatch(/^[a-f0-9]{64}$/);
    expect(data?.network_key).not.toContain(network);
  });

  it("refuses anyone on a network the team has blocked", async () => {
    const spammer = await guest();
    const network = freshNetwork();
    expect((await start(spammer, {}, network)).status).toBe(201);
    const key = requestNetwork(
      new Request("http://localhost", { headers: { "x-forwarded-for": network } }),
    ).key;
    if (!key) throw new Error("No network key.");
    await supabaseAdmin.from("blocked_networks").insert({ key, contact_id: spammer.id });

    try {
      const response = await start(await guest(), { message: "A new guest now" }, network);
      expect(await errorCode(response)).toEqual([422, "refused"]);
    } finally {
      await supabaseAdmin.from("blocked_networks").delete().eq("key", key);
    }
  });

  describe("with the captcha on", () => {
    const realFetch = globalThis.fetch;

    beforeAll(async () => {
      await supabaseAdmin.from("settings").upsert({
        key: "spam",
        value: { captcha: "turnstile", siteKey: "test-site-key" },
        is_public: true,
      });
      // Cloudflare's answer is played here; every other request goes out as usual.
      vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = input instanceof Request ? input.url : input.toString();
        if (url.startsWith("https://challenges.cloudflare.com/")) {
          const token = init?.body instanceof URLSearchParams ? init.body.get("response") : null;
          return Promise.resolve(Response.json({ success: token === "good-token" }));
        }
        return realFetch(input, init);
      });
    });

    afterEach(() => {
      vi.mocked(globalThis.fetch).mockClear();
    });

    afterAll(async () => {
      vi.mocked(globalThis.fetch).mockRestore();
      await supabaseAdmin.from("settings").delete().eq("key", "spam");
    });

    it("refuses a guest without a good answer, and takes one with it", async () => {
      expect(await errorCode(await start(await guest(), {}))).toEqual([422, "refused"]);
      expect(await errorCode(await start(await guest(), { captchaToken: "bad" }))).toEqual([
        422,
        "refused",
      ]);
      expect((await start(await guest(), { captchaToken: "good-token" })).status).toBe(201);
    });
  });
});

describe("checking in", () => {
  it("counts a browser's check-ins, and refuses them past twenty a minute", async () => {
    const visitorId = `test-${randomUUID()}`;
    const network = freshNetwork();
    const send = () =>
      checkIn(
        new Request("http://localhost/api/visitors", {
          method: "POST",
          headers: { "x-forwarded-for": network },
          body: JSON.stringify({ visitorId, page: { url: "https://example.com/" } }),
        }),
      );
    const statuses: number[] = [];
    for (let count = 0; count < 21; count += 1) statuses.push((await send()).status);

    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true);
    const refused = await send();
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toBe("60");
    await supabaseAdmin.from("visitors").delete().eq("id", visitorId);
  });
});

describe("sending a file", () => {
  // The smallest PNG there is: one transparent pixel.
  const pixel = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );

  async function conversationOf(person: Person) {
    const response = await start(person, {});
    expect(response.status).toBe(201);
    return ((await response.json()) as { conversationId: string }).conversationId;
  }

  function send(person: Person, conversationId: string, file: File) {
    const form = new FormData();
    form.set("file", file);
    form.set("name", file.name);
    return upload(
      new Request(`http://localhost/api/conversations/${conversationId}/attachments`, {
        method: "POST",
        headers: { ...person.headers, "x-forwarded-for": freshNetwork() },
        body: form,
      }),
      { params: Promise.resolve({ id: conversationId }) },
    );
  }

  async function removeFolder(conversationId: string) {
    const bucket = supabaseAdmin.storage.from("attachments");
    const { data } = await bucket.list(conversationId);
    if (data?.length) await bucket.remove(data.map((file) => `${conversationId}/${file.name}`));
  }

  it("stores a picture in the conversation's folder, under the type its bytes say", async () => {
    const person = await guest();
    const id = await conversationOf(person);
    try {
      // Named as a JPEG, but its bytes are a PNG: it is kept as what it is.
      const response = await send(
        person,
        id,
        new File([pixel], "screen.jpg", { type: "image/jpeg" }),
      );
      expect(response.status).toBe(201);
      const stored = (await response.json()) as { path: string; type: string; name: string };
      expect(stored.path.startsWith(`${id}/`)).toBe(true);
      expect(stored.type).toBe("image/png");
      expect(stored.name).toBe("screen.jpg");
    } finally {
      await removeFolder(id);
    }
  });

  it("refuses a page of HTML dressed up as a picture", async () => {
    const person = await guest();
    const id = await conversationOf(person);
    const page = new File(["<html><script>alert(1)</script></html>"], "cat.png", {
      type: "image/png",
    });
    expect(await errorCode(await send(person, id, page))).toEqual([415, "unsupported"]);
  });

  it("refuses an SVG, which can carry a script", async () => {
    const person = await guest();
    const id = await conversationOf(person);
    const svg = new File(["<svg onload='alert(1)'/>"], "logo.txt", { type: "text/plain" });
    expect(await errorCode(await send(person, id, svg))).toEqual([415, "unsupported"]);
  });

  it("does not let anyone put a file in a conversation that is not theirs", async () => {
    const owner = await guest();
    const id = await conversationOf(owner);
    const file = new File([pixel], "planted.png", { type: "image/png" });
    expect(await errorCode(await send(await guest(), id, file))).toEqual([404, "not_found"]);
  });

  it("lets the team add a file to any conversation", async () => {
    const owner = await guest();
    const id = await conversationOf(owner);
    try {
      const agent = await signInAgent("sam@example.com");
      const file = new File(["Steps to fix it"], "steps.txt", { type: "text/plain" });
      expect((await send(agent, id, file)).status).toBe(201);
    } finally {
      await removeFolder(id);
    }
  });

  it("does not let a blocked contact send a file", async () => {
    const person = await guest();
    const id = await conversationOf(person);
    await supabaseAdmin
      .from("contacts")
      .update({ blocked_at: new Date().toISOString() })
      .eq("id", person.id);
    const file = new File([pixel], "again.png", { type: "image/png" });
    expect(await errorCode(await send(person, id, file))).toEqual([422, "refused"]);
  });
});

describe("answering whether an article helped", () => {
  let articleId = "";

  beforeAll(async () => {
    const { data, error } = await supabaseAdmin
      .from("articles")
      .insert({ title: "Feedback test", slug: `feedback-test-${randomUUID()}`, status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    articleId = data.id;
  });

  afterAll(async () => {
    await supabaseAdmin.from("articles").delete().eq("id", articleId);
  });

  function answer(id: string, network: string) {
    return answerArticle(
      new Request(`http://localhost/api/articles/${id}/feedback`, {
        method: "POST",
        headers: { "x-forwarded-for": network },
        body: JSON.stringify({ helpful: true }),
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  async function answers() {
    const { count } = await supabaseAdmin
      .from("article_feedback")
      .select("id", { count: "exact", head: true })
      .eq("article_id", articleId);
    return count;
  }

  it("does not take an answer for a draft", async () => {
    expect(await errorCode(await answer(articleId, freshNetwork()))).toEqual([404, "not_found"]);
  });

  it("counts one answer per network a day, and thanks the rest without counting them", async () => {
    const { data: collection } = await supabaseAdmin
      .from("collections")
      .select("id")
      .limit(1)
      .single();
    await supabaseAdmin
      .from("articles")
      .update({ status: "published", collection_id: collection?.id ?? null })
      .eq("id", articleId);

    const network = freshNetwork();
    expect((await answer(articleId, network)).status).toBe(204);
    expect((await answer(articleId, network)).status).toBe(204);
    expect(await answers()).toBe(1);
    expect((await answer(articleId, freshNetwork())).status).toBe(204);
    expect(await answers()).toBe(2);
  });
});
