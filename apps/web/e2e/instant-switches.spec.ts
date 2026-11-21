import { expect, test } from "@playwright/test";

import { signInToInbox } from "./support/mailbox";

// A plain on and off setting is saved the moment it is flipped, with no Save button to press,
// and other changes on the page are left for Save.
test("an admin flips a setting and it is saved at once, leaving other changes for Save", async ({
  page,
}) => {
  await signInToInbox(page, "ada@example.com");
  await page.goto("/dashboard/settings/general");
  const tickets = page.getByRole("switch", { name: "Let people submit a ticket from the chat" });
  const was = await tickets.isChecked();

  // A change not saved yet, which the flip must not send.
  const ask = page.getByRole("combobox", { name: "Ask guests for" });
  const askedBefore = await ask.textContent();
  await ask.click();
  const other = askedBefore?.includes("Nothing") ? "Name and email" : "Nothing";
  await page.getByRole("option", { name: other, exact: true }).click();

  await tickets.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  // The other change is still waiting for Save.
  await expect(page.getByRole("button", { name: "Save changes" })).toBeEnabled();

  await page.reload();
  await expect(tickets).toBeChecked({ checked: !was });
  await expect(ask).toHaveText(askedBefore ?? "");

  // Put it back the same way.
  await tickets.click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(tickets).toBeChecked({ checked: was });
});
