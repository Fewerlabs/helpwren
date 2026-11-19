import type * as NextServer from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { GET as health } from "@/app/api/health/route";
import { GET as widget } from "@/app/api/widget/route";
import { createFirstAdmin, getInstallStatus, hasTeam } from "@/lib/install-status";
import { supabaseAdmin } from "@/lib/supabase/admin";

// There is no request scope here, so the cookie store is an empty stand-in: no session.
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ getAll: () => [], set: () => undefined }),
}));

// `after` needs a request in progress; here the work it schedules simply runs at once.
vi.mock("next/server", async (original) => ({
  ...(await original<typeof NextServer>()),
  after: (task: () => Promise<unknown>) => void task(),
}));

async function accountExists(email: string): Promise<boolean> {
  const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  return data.users.some((user) => user.email === email);
}

describe("the first admin, on an install that has a team", () => {
  // The demo data has a team, so the door must be shut.
  const email = "intruder.setup-test@example.com";

  it("is refused, and no account or team member is made", async () => {
    await expect(createFirstAdmin("Intruder", email)).resolves.toBe("taken");
    expect(await accountExists(email)).toBe(false);
    const { data } = await supabaseAdmin.from("agents").select("user_id").eq("email", email);
    expect(data).toEqual([]);
  });
});

describe("GET /api/widget", () => {
  type Row = Awaited<ReturnType<typeof getInstallStatus>>;
  let before: Row;
  beforeAll(async () => {
    before = await getInstallStatus();
    await supabaseAdmin
      .from("install_status")
      .update({ widget_last_seen_at: null, widget_last_seen_origin: null })
      .eq("id", true);
  });
  afterAll(async () => {
    await supabaseAdmin
      .from("install_status")
      .update({
        widget_first_seen_origin: before.widget?.firstOrigin ?? null,
        widget_first_seen_at: before.widget?.firstSeenAt ?? null,
        widget_last_seen_origin: before.widget?.lastOrigin ?? null,
        widget_last_seen_at: before.widget?.lastSeenAt ?? null,
      })
      .eq("id", true);
  });

  it("records the site the widget loaded on", async () => {
    const response = await widget(
      new Request("http://localhost:3000/api/widget", {
        headers: { origin: "https://shop.setup-test.example" },
      }),
    );
    expect(response.status).toBe(200);
    await expect
      .poll(async () => (await getInstallStatus()).widget?.lastOrigin)
      .toBe("https://shop.setup-test.example");
  });

  it("records nothing for the install's own pages", async () => {
    await widget(
      new Request("http://localhost:3000/api/widget", {
        headers: { origin: "http://localhost:3000" },
      }),
    );
    expect((await getInstallStatus()).widget?.lastOrigin).toBe("https://shop.setup-test.example");
  });
});

describe("GET /api/health", () => {
  it("reports the database and its migrations, and nothing secret", async () => {
    const response = await health();
    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    expect(body).toMatchObject({
      status: "ok",
      database: "ok",
      schemaVersion: expect.stringMatching(/^\d{14}$/) as unknown,
    });
    const text = JSON.stringify(body);
    expect(text).not.toContain(process.env.SUPABASE_SECRET_KEY ?? "no key");
    expect(text).not.toContain("127.0.0.1");
  });
});

// Needs a database with nobody on its team, which the shared demo database is not. Run it
// against a throwaway stack: SETUP_EMPTY_INSTALL=1 SUPABASE_WORKDIR=<its folder> pnpm test:db.
describe.runIf(process.env.SETUP_EMPTY_INSTALL === "1")("the first admin, on a new install", () => {
  it("is made exactly once when several people set up at the same moment", async () => {
    expect(await hasTeam()).toBe(false);
    const emails = Array.from({ length: 5 }, (_, index) => `racer${index}.setup-test@example.com`);

    const results = await Promise.all(emails.map((email) => createFirstAdmin("Racer", email)));

    expect(results.filter((result) => result === "created")).toHaveLength(1);
    const { data: agents } = await supabaseAdmin.from("agents").select("email, role, active");
    expect(agents).toEqual([
      { email: emails[results.indexOf("created")], role: "admin", active: true },
    ]);
    // The losers' accounts were removed again.
    for (const [index, email] of emails.entries()) {
      expect(await accountExists(email)).toBe(results[index] === "created");
    }
    await expect(createFirstAdmin("Late", "late.setup-test@example.com")).resolves.toBe("taken");
  });

  afterAll(async () => {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    for (const user of data.users) {
      if (user.email?.endsWith(".setup-test@example.com")) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }
  });
});
