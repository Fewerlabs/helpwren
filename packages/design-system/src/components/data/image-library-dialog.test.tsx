import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ImageLibraryDialog, type ImageLibraryDialogProps } from "./image-library-dialog";
import { QueryProvider } from "./test-utils";

const png = (name: string) => new File(["x"], name, { type: "image/png" });

function setup(props: Partial<ImageLibraryDialogProps> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onUpload: vi.fn(),
    onChoose: vi.fn(),
  };
  render(
    <QueryProvider>
      <ImageLibraryDialog
        open
        queryKey={["pictures"]}
        queryFn={() =>
          Promise.resolve({
            items: [
              { url: "https://example.com/a.png", name: "a.png" },
              { url: "https://example.com/b.png", name: "b.png" },
            ],
            nextCursor: null,
          })
        }
        {...handlers}
        {...props}
      />
    </QueryProvider>,
  );
  return handlers;
}

describe("ImageLibraryDialog", () => {
  it("shows the pictures already uploaded, and uses the one picked", async () => {
    const { onChoose, onOpenChange } = setup();

    await userEvent.click(await screen.findByRole("button", { name: "Use b.png" }));
    expect(onChoose).toHaveBeenCalledWith({ url: "https://example.com/b.png", name: "b.png" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uploads pictures chosen from the computer", async () => {
    const { onUpload, onOpenChange } = setup();

    await userEvent.upload(screen.getByLabelText("Picture files"), [
      png("one.png"),
      png("two.png"),
    ]);
    expect(onUpload).toHaveBeenCalledWith([
      expect.objectContaining({ name: "one.png" }),
      expect.objectContaining({ name: "two.png" }),
    ]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uploads pictures dropped on it, and leaves out other files", () => {
    const { onUpload } = setup();
    const zone = screen.getByRole("button", { name: /Drag pictures here/ });
    const notes = new File(["x"], "notes.txt", { type: "text/plain" });

    fireEvent.dragEnter(zone, { dataTransfer: { files: [] } });
    expect(zone).toHaveAttribute("data-over");
    fireEvent.drop(zone, { dataTransfer: { files: [png("drop.png"), notes] } });

    expect(onUpload).toHaveBeenCalledWith([expect.objectContaining({ name: "drop.png" })]);
    expect(zone).not.toHaveAttribute("data-over");
  });

  it("says when nothing has been uploaded yet", async () => {
    setup({ queryFn: () => Promise.resolve({ items: [], nextCursor: null }) });
    expect(await screen.findByText("No pictures uploaded yet.")).toBeInTheDocument();
  });
});
