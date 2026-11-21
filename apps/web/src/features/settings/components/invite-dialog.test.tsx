import { Toaster, TooltipProvider } from "@helpwren/design-system";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { inviteMember } from "../actions";
import { InviteDialog } from "./invite-dialog";

// The action runs on the server and the router belongs to Next; neither exists in a unit test.
vi.mock("../actions", () => ({ inviteMember: vi.fn() }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

async function openDialog(emailReady: boolean) {
  const user = userEvent.setup();
  render(
    <TooltipProvider>
      <InviteDialog emailReady={emailReady} />
      <Toaster />
    </TooltipProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Invite" }));
  const dialog = screen.getByRole("dialog", { name: "Invite a team member" });
  return { user, dialog };
}

async function fillIn(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  await user.type(within(dialog).getByLabelText(/^Name/), "Kofi Mensah");
  await user.type(within(dialog).getByLabelText(/^Work email/), "kofi@example.com");
}

describe("InviteDialog", () => {
  beforeEach(() => {
    vi.mocked(inviteMember).mockReset();
    refresh.mockReset();
  });

  it("emails the invite by default when email is set up", async () => {
    vi.mocked(inviteMember).mockResolvedValue({ ok: true, delivery: { kind: "emailed" } });
    const { user, dialog } = await openDialog(true);

    expect(within(dialog).getByRole("radio", { name: /Email an invite/ })).toBeChecked();
    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(inviteMember).toHaveBeenCalledWith({
      name: "Kofi Mensah",
      email: "kofi@example.com",
      role: "agent",
      method: "email",
    });
    expect(await screen.findByText("Invite sent to kofi@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cannot email without a provider, and offers a link instead", async () => {
    const { dialog } = await openDialog(false);

    const email = within(dialog).getByRole("radio", { name: /Email an invite/ });
    expect(email).toBeDisabled();
    expect(within(dialog).getByText("Set up email first")).toBeInTheDocument();
    expect(within(dialog).getByRole("radio", { name: /Copy a link/ })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Create link" })).toBeInTheDocument();
    // The admin no longer types a password for someone else.
    expect(within(dialog).queryByLabelText(/^Password/)).toBeNull();
  });

  it("shows the link once, to copy, after adding them", async () => {
    const link = "https://support.example.com/invite/abc";
    vi.mocked(inviteMember).mockResolvedValue({
      ok: true,
      delivery: { kind: "link", link, emailFailed: false, days: 7 },
    });
    const { user, dialog } = await openDialog(false);
    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Create link" }));

    const shown = await screen.findByRole("dialog", { name: "Invite link for Kofi Mensah" });
    expect(within(shown).getByText(link)).toBeInTheDocument();
    expect(within(shown).getByText(/It works once, for 7 days/)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("shows a temporary password once, to copy", async () => {
    vi.mocked(inviteMember).mockResolvedValue({
      ok: true,
      delivery: { kind: "password", password: "maple-otter-violin-quartz-42" },
    });
    const { user, dialog } = await openDialog(true);
    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole("radio", { name: /Temporary password/ }));
    await user.click(within(dialog).getByRole("button", { name: "Create password" }));

    expect(inviteMember).toHaveBeenCalledWith(expect.objectContaining({ method: "password" }));
    const shown = await screen.findByRole("dialog", {
      name: "Temporary password for Kofi Mensah",
    });
    expect(within(shown).getByText("maple-otter-violin-quartz-42")).toBeInTheDocument();
    await user.click(within(shown).getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("says so in place when the person is already on the team", async () => {
    vi.mocked(inviteMember).mockResolvedValue({ ok: false, reason: "already_member" });
    const { user, dialog } = await openDialog(true);
    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(await within(dialog).findByText("This person is already on the team.")).toBeVisible();
  });
});
