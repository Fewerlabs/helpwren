import { type TeamMember } from "@helpwren/core";
import { ConfirmProvider, Toaster, TooltipProvider } from "@helpwren/design-system";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changeMember } from "../actions";
import { TeamList } from "./team-list";

// The action runs on the server and the router belongs to Next; neither exists in a unit test.
vi.mock("../actions", () => ({ changeMember: vi.fn() }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const ada: TeamMember = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Ada Okafor",
  email: "ada@example.com",
  role: "admin",
  active: true,
  photo: undefined,
};
const sam: TeamMember = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Sam Rivera",
  email: "sam@example.com",
  role: "agent",
  active: true,
  photo: undefined,
};

function renderList(members: TeamMember[] = [ada, sam]) {
  render(
    <TooltipProvider>
      <ConfirmProvider>
        <TeamList members={members} currentId={ada.id} canEdit />
        <Toaster />
      </ConfirmProvider>
    </TooltipProvider>,
  );
}

describe("TeamList", () => {
  beforeEach(() => {
    vi.mocked(changeMember).mockReset().mockResolvedValue({ ok: true });
    refresh.mockReset();
  });

  it("asks before deactivating someone, and does nothing when the answer is no", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Deactivate, Sam Rivera" }));
    const dialog = screen.getByRole("alertdialog", { name: "Deactivate Sam Rivera?" });
    // The safe answer has the focus, so Enter cannot lock someone out by accident.
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(changeMember).not.toHaveBeenCalled();
  });

  it("deactivates once confirmed, then says so", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Deactivate, Sam Rivera" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Deactivate" }),
    );

    expect(changeMember).toHaveBeenCalledWith(sam.id, { active: false });
    expect(await screen.findByText("Sam Rivera deactivated")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps the dialog open and says why when deactivating fails", async () => {
    vi.mocked(changeMember).mockResolvedValue({ ok: false, reason: "last_admin" });
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Deactivate, Sam Rivera" }));
    const dialog = screen.getByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "The team needs at least one active admin.",
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("changes a role once confirmed, and reactivates without asking", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Make admin, Sam Rivera" }));
    expect(changeMember).not.toHaveBeenCalled();
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Make admin" }),
    );
    expect(changeMember).toHaveBeenCalledWith(sam.id, { role: "admin" });
    expect(await screen.findByText("Sam Rivera is now an admin")).toBeInTheDocument();
  });

  it("leaves the role alone when the change is cancelled", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Make admin, Sam Rivera" }));
    await user.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }),
    );
    expect(changeMember).not.toHaveBeenCalled();
  });
});
