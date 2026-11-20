import { afterAll, describe, expect, it } from "vitest";

import { serverClient } from "./support/local-supabase";
import { signIn } from "./support/test-data";

// These run against the local database and its demo data (supabase/seed.sql), and remove the
// replies they make. Shortcuts carry a random suffix, so a run never trips over another.
const run = crypto.randomUUID().slice(0, 8);
const madeIds: string[] = [];

const signedInAgent = (email: string) => signIn(email);

afterAll(async () => {
  await serverClient().from("saved_replies").delete().in("id", madeIds);
});

describe("saved replies", () => {
  it("saves a team reply everyone sees, and finds it by title or shortcut", async () => {
    const sam = await signedInAgent("sam@example.com");
    const ada = await signedInAgent("ada@example.com");

    const created = await sam.client.savedReplies.create({
      title: `Refund policy ${run}`,
      body: "Hi {contact.first_name}, refunds take five days.",
      shortcut: ` Refund-${run} `,
    });
    if (!created.ok) throw new Error("The reply was not saved.");
    madeIds.push(created.reply.id);
    expect(created.reply).toMatchObject({
      shortcut: `refund-${run}`,
      visibility: "team",
      ownerId: null,
      createdBy: sam.agent.id,
    });

    await expect(ada.client.savedReplies.list({ search: `refund-${run}` })).resolves.toEqual([
      created.reply,
    ]);
    await expect(ada.client.savedReplies.list({ search: `policy ${run}` })).resolves.toHaveLength(
      1,
    );
  });

  it("keeps a personal reply to its owner", async () => {
    const sam = await signedInAgent("sam@example.com");
    const ada = await signedInAgent("ada@example.com");

    const created = await sam.client.savedReplies.create({
      title: `Sam's sign-off ${run}`,
      body: "Cheers, {agent.first_name}",
      visibility: "personal",
    });
    if (!created.ok) throw new Error("The reply was not saved.");
    madeIds.push(created.reply.id);
    expect(created.reply).toMatchObject({ ownerId: sam.agent.id, shortcut: null });

    await expect(sam.client.savedReplies.list({ search: `sign-off ${run}` })).resolves.toHaveLength(
      1,
    );
    await expect(ada.client.savedReplies.list({ search: `sign-off ${run}` })).resolves.toEqual([]);
    await expect(
      ada.client.savedReplies.update(created.reply.id, { title: "Mine now", body: "Hi" }),
    ).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it("says when a shortcut is taken", async () => {
    const sam = await signedInAgent("sam@example.com");
    const first = await sam.client.savedReplies.create({
      title: "First",
      body: "One",
      shortcut: `taken-${run}`,
    });
    if (first.ok) madeIds.push(first.reply.id);

    await expect(
      sam.client.savedReplies.create({ title: "Second", body: "Two", shortcut: `taken-${run}` }),
    ).resolves.toEqual({ ok: false, reason: "shortcut_taken" });
  });

  it("lets the author and an admin change a team reply, and nobody else", async () => {
    const sam = await signedInAgent("sam@example.com");
    const ada = await signedInAgent("ada@example.com");

    const created = await ada.client.savedReplies.create({
      title: `Opening hours ${run}`,
      body: "We are open nine to five.",
    });
    if (!created.ok) throw new Error("The reply was not saved.");
    madeIds.push(created.reply.id);

    await expect(
      sam.client.savedReplies.update(created.reply.id, { title: "Changed", body: "Changed" }),
    ).resolves.toEqual({ ok: false, reason: "not_found" });
    await expect(sam.client.savedReplies.remove(created.reply.id)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });

    const changed = await ada.client.savedReplies.update(created.reply.id, {
      title: `Opening hours ${run}`,
      body: "We are open eight to six.",
      shortcut: `hours-${run}`,
    });
    expect(changed).toMatchObject({ ok: true, reply: { body: "We are open eight to six." } });

    await expect(ada.client.savedReplies.remove(created.reply.id)).resolves.toEqual({ ok: true });
  });
});
