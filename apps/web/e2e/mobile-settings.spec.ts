import { createServer, type Server } from "node:http";
import { type AddressInfo } from "node:net";

import { verifyWebhook } from "@helpwren/adapters";
import { expect, test } from "@playwright/test";
import { exportPKCS8, generateKeyPair } from "jose";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// An admin sets up push notifications from Settings > Mobile. Runs against the local Supabase
// stack, where Ada is an admin and Sam is an agent.
const SECRETS = ["expo_access_token", "fcm_service_account", "push_webhook_secret"];

async function restore() {
  await database.from("settings").delete().eq("key", "push");
  await database.from("secrets").delete().in("key", SECRETS);
}

async function secret(key: string): Promise<unknown> {
  const { data } = await database.from("secrets").select("value").eq("key", key).maybeSingle();
  return data?.value;
}

test.beforeEach(restore);
test.afterEach(restore);

test("an admin turns on Expo and Firebase, keeping their secrets out of sight", async ({
  page,
}) => {
  const { privateKey } = await generateKeyPair("RS256", { extractable: true });
  const keyFile = JSON.stringify({
    type: "service_account",
    project_id: "acme-app",
    private_key_id: "abc123",
    private_key: await exportPKCS8(privateKey),
    client_email: "helpwren@acme-app.iam.gserviceaccount.com",
  });

  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/mobile");

  await page.getByRole("switch", { name: "Expo" }).click();
  await page.getByLabel("Access token").fill("expo-robot-token-for-tests");
  await page.getByRole("switch", { name: "Firebase Cloud Messaging" }).click();

  // A file that is not a service account's key is turned away before anything is saved.
  await page.getByLabel("Service account key file").fill('{"type":"authorized_user"}');
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Paste the whole key file Firebase gave you")).toBeVisible();

  await page.getByLabel("Service account key file").fill(keyFile);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();

  // Kept as secrets, and only the project and account shown again.
  await expect(page.getByText("Token saved")).toBeVisible();
  await expect(page.getByText("Key file saved")).toBeVisible();
  await expect(
    page.getByText("acme-app · helpwren@acme-app.iam.gserviceaccount.com"),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("expo-robot-token-for-tests");
  await expect(page.locator("body")).not.toContainText("PRIVATE KEY");
  expect(await secret("expo_access_token")).toBe("expo-robot-token-for-tests");
  expect(await secret("fcm_service_account")).toMatchObject({ project_id: "acme-app" });
  const { data: setting } = await database
    .from("settings")
    .select("value, is_public")
    .eq("key", "push")
    .single();
  expect(setting).toEqual({ value: { expo: true, fcm: true, webhook: null }, is_public: false });

  await page.getByRole("button", { name: "Remove the Firebase key file" }).click();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("No key file")).toBeVisible();
  expect(await secret("fcm_service_account")).toBeUndefined();
});

test("an admin points pushes at their own backend, and a signed test reaches it", async ({
  page,
}) => {
  const received: { body: string; signature: string }[] = [];
  const backend: Server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      received.push({ body, signature: String(request.headers["helpwren-signature"]) });
      response.writeHead(204).end();
    });
  });
  await new Promise<void>((resolve) => {
    backend.listen(0, "127.0.0.1", resolve);
  });
  const { port } = backend.address() as AddressInfo;

  try {
    await signInToInbox(page, "ada@example.com");
    await page.goto("/dashboard/settings/mobile");
    await page.getByRole("switch", { name: "Your own backend" }).click();
    await page.getByLabel("Address").fill(`http://127.0.0.1:${String(port)}/push`);
    await expect(page.getByRole("button", { name: "Send a test" })).toBeDisabled();

    // The secret is shown once, when it is made.
    await page.getByRole("button", { name: "Make a signing secret" }).click();
    const shown = page.getByRole("status").filter({ hasText: "It will not be shown again" });
    await expect(shown).toBeVisible();
    const signing = await secret("push_webhook_secret");
    expect(typeof signing).toBe("string");
    await expect(shown).toContainText(String(signing));

    await page.getByRole("button", { name: "Send a test" }).click();
    await expect(page.getByText("Your backend took the test")).toBeVisible();
    expect(received).toHaveLength(1);
    const [request] = received;
    expect(verifyWebhook(request?.body ?? "", request?.signature ?? "", String(signing))).toBe(
      true,
    );
    expect(JSON.parse(request?.body ?? "{}")).toMatchObject({ type: "push.test" });

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Saved." })).toBeVisible();
    const { data: setting } = await database
      .from("settings")
      .select("value")
      .eq("key", "push")
      .single();
    expect(setting?.value).toEqual({
      expo: false,
      fcm: false,
      webhook: { url: `http://127.0.0.1:${String(port)}/push` },
    });
  } finally {
    backend.close();
  }
});

test("an agent who is not an admin sees the push settings, and changes nothing", async ({
  page,
}) => {
  await database.from("settings").upsert({ key: "push", value: { expo: true } });
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/mobile");

  await expect(page.getByText("Only admins can change these.")).toBeVisible();
  await expect(page.getByRole("switch", { name: "Expo" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Make a signing secret" })).toHaveCount(0);
});
