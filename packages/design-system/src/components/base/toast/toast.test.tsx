import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { toast, Toaster } from "./toast";

// Sonner keeps its toasts outside React, so one test's toasts would show in the next.
afterEach(() => {
  act(() => {
    toast.dismiss();
  });
});

describe("toast", () => {
  it("shows a message in the notifications region", async () => {
    render(<Toaster />);
    act(() => {
      toast.message("Copied to the clipboard");
    });

    expect(await screen.findByText("Copied to the clipboard")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /^Notifications/ })).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("shows success and error toasts with a description", async () => {
    render(<Toaster />);
    act(() => {
      toast.success("Conversation resolved", { description: "Priya was told." });
      toast.error("The change could not be saved");
    });

    const success = (await screen.findByText("Conversation resolved")).closest("li");
    expect(success).toHaveAttribute("data-type", "success");
    expect(success).toHaveTextContent("Priya was told.");
    expect(screen.getByText("The change could not be saved").closest("li")).toHaveAttribute(
      "data-type",
      "error",
    );
  });

  it("offers an action, and closes once it is pressed", async () => {
    const onClick = vi.fn();
    render(<Toaster />);
    act(() => {
      toast.message("Conversation resolved", { action: { label: "Undo", onClick } });
    });

    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

    expect(onClick).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(screen.queryByText("Conversation resolved")).not.toBeInTheDocument();
    });
  });

  it("follows a promise from loading to how it ended", async () => {
    render(<Toaster />);
    let finish: (name: string) => void = () => undefined;
    const saving = new Promise<string>((resolve) => {
      finish = resolve;
    });
    act(() => {
      toast.promise(saving, {
        loading: "Saving…",
        success: (name) => `${name} saved`,
        error: "Not saved",
      });
    });
    expect(await screen.findByText("Saving…")).toBeInTheDocument();

    act(() => {
      finish("Branding");
    });
    expect(await screen.findByText("Branding saved")).toBeInTheDocument();
    expect(screen.queryByText("Saving…")).not.toBeInTheDocument();
  });

  it("shows the error when the promise rejects", async () => {
    render(<Toaster />);
    act(() => {
      toast.promise(Promise.reject(new Error("offline")), {
        loading: "Saving…",
        success: "Saved",
        error: (error) => (error instanceof Error ? `Not saved: ${error.message}` : "Not saved"),
      });
    });
    expect(await screen.findByText("Not saved: offline")).toBeInTheDocument();
  });

  it("dismisses a toast by its id", async () => {
    render(<Toaster />);
    let id: string | number = "";
    act(() => {
      id = toast.message("Still here", { duration: Infinity });
    });
    expect(await screen.findByText("Still here")).toBeInTheDocument();

    act(() => {
      toast.dismiss(id);
    });
    await vi.waitFor(() => {
      expect(screen.queryByText("Still here")).not.toBeInTheDocument();
    });
  });
});
