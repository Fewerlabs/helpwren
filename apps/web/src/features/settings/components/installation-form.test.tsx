import { parseSettings } from "@helpwren/core";
import { TooltipProvider } from "@helpwren/design-system";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveInstallation } from "../actions";
import { InstallationForm } from "./installation-form";

// The action runs on the server and the router belongs to Next; neither exists in a unit test.
vi.mock("../actions", () => ({ saveInstallation: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function renderForm() {
  render(
    <TooltipProvider>
      <InstallationForm
        settings={parseSettings([{ key: "sources", value: ["web"] }])}
        appUrl="https://support.example.com"
        canEdit
      />
    </TooltipProvider>,
  );
}

describe("InstallationForm's sources", () => {
  beforeEach(() => {
    vi.mocked(saveInstallation).mockReset().mockResolvedValue({ ok: true });
  });

  it("adds an app's source and saves it with the rest", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole("textbox", { name: "Sources" }), "Business App{Enter}");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(saveInstallation).toHaveBeenCalledWith({
      allowedDomains: [],
      sources: ["web", "business_app"],
    });
  });

  it("keeps at least one source", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Remove web" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Keep at least one source.")).toBeInTheDocument();
    expect(saveInstallation).not.toHaveBeenCalled();
  });
});
