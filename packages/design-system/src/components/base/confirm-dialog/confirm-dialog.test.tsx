import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../button/button";
import { ConfirmDialog } from "./confirm-dialog";
import { ConfirmProvider, useConfirm, type ConfirmOptions } from "./use-confirm";

/** A promise settled by hand, to hold an action half-way. */
function deferred() {
  let resolve: () => void = () => undefined;
  let reject: (reason: Error) => void = () => undefined;
  const promise = new Promise<void>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

describe("ConfirmDialog", () => {
  it("opens from its trigger as an alert dialog, named and described", async () => {
    render(
      <ConfirmDialog
        trigger={<Button>Resolve</Button>}
        title="Resolve this conversation?"
        description="The contact is told."
      />,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));

    const dialog = screen.getByRole("alertdialog", { name: "Resolve this conversation?" });
    expect(dialog).toHaveAccessibleDescription("The contact is told.");
    expect(screen.getByRole("button", { name: "Confirm" })).toHaveFocus();
  });

  it("calls onConfirm and closes, and returns focus to the trigger", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        trigger={<Button>Archive</Button>}
        title="Archive it?"
        confirmLabel="Archive now"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Archive" }));
    await userEvent.click(screen.getByRole("button", { name: "Archive now" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toHaveFocus();
  });

  it("focuses Cancel first when the tone is destructive", async () => {
    render(
      <ConfirmDialog
        trigger={<Button>Delete</Button>}
        tone="destructive"
        title="Delete it?"
        confirmLabel="Delete for good"
        cancelLabel="Keep it"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByRole("button", { name: "Keep it" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Delete for good" })).toHaveAttribute(
      "data-variant",
      "destructive",
    );
  });

  it("is controlled through open, and reports Cancel and Escape as cancelling", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    function Controlled() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <Button
            onClick={() => {
              setOpen(true);
            }}
          >
            Ask again
          </Button>
          <ConfirmDialog
            open={open}
            onOpenChange={setOpen}
            title="Leave?"
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </>
      );
    }
    render(<Controlled />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Ask again" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows loading while onConfirm runs, then closes when it resolves", async () => {
    const action = deferred();
    render(<ConfirmDialog defaultOpen title="Send it?" onConfirm={() => action.promise} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(screen.getByRole("button", { name: /Confirm/ })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    // Escape cannot back out of something already under way.
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    action.resolve();
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("stays open with the error when onConfirm rejects, and can be tried again", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("The server is not answering."))
      .mockResolvedValueOnce();
    render(<ConfirmDialog defaultOpen title="Send it?" onConfirm={onConfirm} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The server is not answering.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await vi.waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });

  it("takes its own words for the error", async () => {
    render(
      <ConfirmDialog
        defaultOpen
        title="Send it?"
        errorMessage="It could not be sent."
        onConfirm={() => Promise.reject(new Error("500"))}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("It could not be sent.");
  });

  it("shows extra content, and can hold the confirm button until it is ready", async () => {
    render(
      <ConfirmDialog defaultOpen title="Delete the workspace?" confirmDisabled>
        <p>Everything in it goes too.</p>
      </ConfirmDialog>,
    );
    expect(screen.getByText("Everything in it goes too.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    });
  });
});

describe("useConfirm", () => {
  function Asker({
    options,
    onAnswer,
  }: {
    options: ConfirmOptions;
    onAnswer: (a: boolean) => void;
  }) {
    const confirm = useConfirm();
    return (
      <Button
        onClick={() => {
          void confirm(options).then(onAnswer);
        }}
      >
        Ask
      </Button>
    );
  }

  function setup(options: ConfirmOptions) {
    const onAnswer = vi.fn();
    render(
      <ConfirmProvider>
        <Asker options={options} onAnswer={onAnswer} />
      </ConfirmProvider>,
    );
    return onAnswer;
  }

  it("resolves to true when the person confirms", async () => {
    const onAnswer = setup({ title: "Resolve it?", confirmLabel: "Resolve" });
    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    const dialog = screen.getByRole("alertdialog", { name: "Resolve it?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Resolve" }));
    await vi.waitFor(() => {
      expect(onAnswer).toHaveBeenCalledWith(true);
    });
    expect(onAnswer).toHaveBeenCalledOnce();
  });

  it("resolves to false from Cancel and from Escape", async () => {
    const user = userEvent.setup();
    const onAnswer = setup({ title: "Resolve it?" });

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await vi.waitFor(() => {
      expect(onAnswer).toHaveBeenLastCalledWith(false);
    });

    await user.click(screen.getByRole("button", { name: "Ask" }));
    await user.keyboard("{Escape}");
    await vi.waitFor(() => {
      expect(onAnswer).toHaveBeenCalledTimes(2);
    });
    expect(onAnswer).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("waits for onConfirm, and does not answer while it is failing", async () => {
    const onConfirm = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Not saved."))
      .mockResolvedValueOnce();
    const onAnswer = setup({ title: "Save it?", onConfirm });

    await userEvent.click(screen.getByRole("button", { name: "Ask" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Not saved.");
    expect(onAnswer).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await vi.waitFor(() => {
      expect(onAnswer).toHaveBeenCalledWith(true);
    });
  });

  it("says what is missing when there is no provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Asker options={{ title: "?" }} onAnswer={vi.fn()} />)).toThrow(
      "useConfirm needs a ConfirmProvider above it.",
    );
    quiet.mockRestore();
  });
});
