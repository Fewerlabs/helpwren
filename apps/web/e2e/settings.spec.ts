import { expect, test } from "@playwright/test";

import { database } from "./support/database";
import { signInToInbox } from "./support/mailbox";

// Runs against the local Supabase stack and its demo data, where Ada is an admin and Sam is
// an agent, and guests are asked for a name and an email or phone number.
const NEW_MEMBER = { name: "Kofi Mensah", email: "kofi.e2e@example.com" };

async function restore() {
  await database
    .from("settings")
    .delete()
    .in("key", ["allowed_domains", "widget", "chat_page", "help_center"]);
  await database
    .from("settings")
    .update({ value: { name: "Helpwren Demo" } })
    .eq("key", "brand");
  await database.from("settings").update({ value: "email_or_phone" }).eq("key", "guest_details");
  await database.from("agents").update({ name: "Sam Rivera" }).eq("email", "sam@example.com");
  const { data } = await database.from("agents").select("user_id").eq("email", NEW_MEMBER.email);
  for (const { user_id } of data ?? []) await database.auth.admin.deleteUser(user_id);
}

test.beforeEach(restore);
test.afterEach(restore);

test("an admin changes what the chat asks guests", async ({ page, browser }) => {
  await signInToInbox(page, "ada@example.com");
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings\/general$/);

  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();

  await page.getByRole("combobox", { name: "Ask guests for" }).click();
  await page.getByRole("option", { name: "Nothing" }).click();
  await save.click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  // A visitor opening the chat is now asked for nothing.
  const visitor = await browser.newContext();
  const chat = await visitor.newPage();
  await chat.goto("/embed");
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await expect(chat.getByLabel("Your message")).toBeVisible();
  await expect(chat.getByLabel("Your name")).toHaveCount(0);
  await visitor.close();
});

test("an admin brands the widget, and sees the real one change as they do", async ({
  page,
  browser,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/branding");

  // The preview is the widget itself, in a frame, showing what is in the form.
  const preview = page.getByRole("region", { name: "Widget preview" });
  const chat = preview.frameLocator('iframe[title="Chat"]');
  await expect(chat.getByRole("heading", { level: 1 })).toContainText("Hi there.");

  await page.getByLabel("Brand name").fill("Acme Support");
  await page.getByLabel("Logo file").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: "Current logo" })).toBeVisible();
  await page.getByRole("button", { name: "Blue", exact: true }).click();

  await page.getByRole("tab", { name: "Widget" }).click();
  await page.getByRole("radio", { name: "Bottom left" }).click();
  await page.getByLabel("Greeting").fill("Welcome to Acme.");
  await page.getByLabel("Welcome message").fill("Hello! Ask us anything.");
  const replies = page.getByLabel("Quick replies");
  await replies.fill("Track my order");
  await replies.press("Enter");

  // Before anything is saved, the preview already shows it, and sends nothing.
  await expect(chat.getByRole("heading", { level: 1 })).toContainText("Welcome to Acme.");
  await expect(chat.getByRole("img", { name: "Acme Support" })).toBeVisible();
  await chat.getByRole("button", { name: "Send us a message" }).click();
  await expect(chat.getByText("Hello! Ask us anything.")).toBeVisible();
  await expect(chat.getByRole("button", { name: "Track my order" })).toBeVisible();

  await page.getByRole("tab", { name: "Chat page" }).click();
  await page.getByLabel("Title").fill("Talk to Acme");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  // A visitor on the chat page sees the brand, the welcome message and the quick reply.
  const visitor = await browser.newContext();
  const chatPage = await visitor.newPage();
  await chatPage.goto("/chat");
  await expect(chatPage.getByRole("heading", { name: "Talk to Acme" })).toBeVisible();
  await expect(chatPage.getByRole("heading", { name: /Welcome to Acme\./ })).toBeVisible();
  await chatPage.getByRole("button", { name: "Send us a message" }).click();
  await expect(chatPage.getByText("Hello! Ask us anything.")).toBeVisible();
  await expect(chatPage.getByRole("button", { name: "Send message" })).toHaveCSS(
    "background-color",
    "rgb(29, 78, 216)",
  );

  // The widget script on a site is told where to sit and what colour to be.
  const answer = await chatPage.request.get("/api/widget");
  expect(await answer.json()).toMatchObject({ position: "left", accent: "#1d4ed8" });
  expect(answer.headers()["access-control-allow-origin"]).toBe("*");
  await visitor.close();

  // The change is still there after a reload.
  await page.reload();
  await expect(page.getByLabel("Brand name")).toHaveValue("Acme Support");
  await expect(page.getByRole("button", { name: "Blue", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("a team member changes their own name, and how they are notified", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["notifications"]);
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/profile");

  await expect(page.getByText("sam@example.com")).toBeVisible();
  await page.getByLabel("Your name").fill("Samira Rivera");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");
  await page.reload();
  await expect(page.getByLabel("Your name")).toHaveValue("Samira Rivera");

  // Notification choices are kept as they are made, on this browser.
  await page.getByRole("link", { name: "Notifications" }).click();
  const desktop = page.getByRole("switch", { name: "Desktop notifications" });
  const sound = page.getByRole("switch", { name: "Sound" });
  await expect(page.getByRole("button", { name: "Send a test" })).toBeDisabled();
  await desktop.click();
  await sound.click();
  await page.getByRole("radio", { name: "Only mine and unassigned ones" }).click();
  await expect(page.getByRole("button", { name: "Send a test" })).toBeEnabled();

  await page.reload();
  await expect(desktop).toBeChecked();
  await expect(sound).toBeChecked();
  await expect(page.getByRole("radio", { name: "Only mine and unassigned ones" })).toBeChecked();
});

test("an admin sets which sites may show the chat, and copies the snippet", async ({ page }) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/installation");

  await expect(
    page.getByText('<script src="http://localhost:3000/widget.js"></script>'),
  ).toBeVisible();
  await expect(page.getByText("any site can show your chat")).toBeVisible();

  const domains = page.getByLabel("Domains");
  await domains.fill("https://Example.com/pricing");
  await domains.press("Enter");
  await expect(page.getByRole("button", { name: "Remove example.com" })).toBeVisible();
  await expect(page.getByText("any site can show your chat")).toHaveCount(0);

  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const { data } = await database
    .from("settings")
    .select("value")
    .eq("key", "allowed_domains")
    .single();
  expect(data?.value).toEqual(["example.com"]);
});

test("an admin adds a team member, changes their role and deactivates them", async ({ page }) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/team");
  const team = page.getByRole("list", { name: "Team members" });
  await expect(team.getByRole("listitem")).toHaveCount(2);
  // An admin has no controls for their own access.
  await expect(page.getByRole("button", { name: /Ada Okafor/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Add team member" }).click();
  const dialog = page.getByRole("dialog", { name: "Add a team member" });
  await dialog.getByLabel("Name").fill(NEW_MEMBER.name);
  await dialog.getByLabel("Work email").fill(NEW_MEMBER.email);
  await dialog.getByRole("button", { name: "Add to team" }).click();

  const row = team.getByRole("listitem").filter({ hasText: NEW_MEMBER.name });
  await expect(row).toContainText("Agent");

  await page.getByRole("button", { name: `Make ${NEW_MEMBER.name} an admin` }).click();
  await expect(row).toContainText("Admin");

  await page.getByRole("button", { name: `Deactivate ${NEW_MEMBER.name}` }).click();
  await expect(row).toContainText("Deactivated");
  await expect(page.getByRole("button", { name: `Reactivate ${NEW_MEMBER.name}` })).toBeVisible();
});

test("an agent who is not an admin can read settings and change nothing", async ({ page }) => {
  await signInToInbox(page, "sam@example.com");
  await page.goto("/dashboard/settings/general");

  await expect(page.getByRole("note")).toContainText("Only admins can change these.");
  await expect(page.getByRole("combobox", { name: "Ask guests for" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);

  await page.getByRole("link", { name: "Branding" }).click();
  await expect(page.getByLabel("Brand name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Blue" })).toBeDisabled();

  await page.getByRole("link", { name: "Team" }).click();
  await expect(page.getByRole("list", { name: "Team members" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add team member" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Deactivate/ })).toHaveCount(0);
});
