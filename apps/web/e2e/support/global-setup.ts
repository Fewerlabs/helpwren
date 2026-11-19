import { database } from "./database";

// The specs change settings that exist once per install, and expect to start from the demo's.
// Whoever is trying the app locally may have set them differently, so the run notes what is
// there, starts from the demo's values, and puts everything back as it found it at the end.

/** The demo's settings, as supabase/seed.sql writes them, that the specs rely on. */
const DEMO_SETTINGS = [
  { key: "brand", value: { name: "Helpwren Demo" }, is_public: true },
  { key: "guest_details", value: "email_or_phone", is_public: true },
];
/** Settings the demo leaves unset, so the specs see the defaults. */
const UNSET = [
  "allowed_domains",
  "widget",
  "chat_page",
  "help_center",
  "email",
  "tickets",
  "identity",
  "push",
];
/** The demo's team members, whose names, photos and access the specs change and put back. */
const DEMO_TEAM = ["ada@example.com", "sam@example.com"];

async function must<T>(
  request: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T | null> {
  const { data, error } = await request;
  if (error) throw error instanceof Error ? error : new Error(JSON.stringify(error));
  return data;
}

/** Reads every row a query finds, or fails. */
async function rows<T>(request: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  return (await must(request)) ?? [];
}

/** Removes every row of a table whose key is not one of these. */
async function removeAllBut(table: "settings" | "secrets", keys: readonly string[]) {
  const query = database.from(table).delete();
  await must(
    keys.length > 0 ? query.not("key", "in", `(${keys.join(",")})`) : query.neq("key", ""),
  );
}

// eslint-disable-next-line import-x/no-default-export -- Playwright loads the setup by its default export.
export default async function globalSetup() {
  const settings = await rows(database.from("settings").select("key, value, is_public"));
  const secrets = await rows(database.from("secrets").select("key, value"));
  const team = await rows(
    database.from("agents").select("user_id, name, photo, role, active").in("email", DEMO_TEAM),
  );

  await must(database.from("settings").upsert(DEMO_SETTINGS));
  await must(database.from("settings").delete().in("key", UNSET));

  return async () => {
    await removeAllBut(
      "settings",
      settings.map((row) => row.key),
    );
    if (settings.length > 0) await must(database.from("settings").upsert(settings));

    await removeAllBut(
      "secrets",
      secrets.map((row) => row.key),
    );
    if (secrets.length > 0) await must(database.from("secrets").upsert(secrets));

    for (const { user_id: id, ...member } of team) {
      await must(database.from("agents").update(member).eq("user_id", id));
    }
  };
}
