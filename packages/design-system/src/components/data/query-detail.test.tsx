import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QueryDetail } from "./query-detail";
import { QueryProvider } from "./test-utils";

interface Contact {
  id: number;
  name: string;
}

describe("QueryDetail", () => {
  it("shows a loading state, then the item", async () => {
    render(
      <QueryProvider>
        <QueryDetail<Contact>
          queryKey={["contact", 1]}
          queryFn={() => Promise.resolve({ id: 1, name: "Ada Lovelace" })}
        >
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
  });

  it("shows a not-found state when the item is null", async () => {
    render(
      <QueryProvider>
        <QueryDetail<Contact>
          queryKey={["contact", 404]}
          queryFn={() => Promise.resolve(null)}
          messages={{ notFound: "This contact no longer exists." }}
        >
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(await screen.findByText("This contact no longer exists.")).toBeInTheDocument();
  });

  it("lets the caller decide what counts as empty", async () => {
    render(
      <QueryProvider>
        <QueryDetail<Contact[]>
          queryKey={["contacts", "empty"]}
          queryFn={() => Promise.resolve([])}
          isEmpty={(contacts) => contacts.length === 0}
          renderEmpty={() => <p>No contacts</p>}
        >
          {(contacts) => <p>{contacts.length} contacts</p>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(await screen.findByText("No contacts")).toBeInTheDocument();
  });

  it("shows an error with a retry that loads the item", async () => {
    const queryFn = vi
      .fn<() => Promise<Contact>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ id: 1, name: "Ada Lovelace" });
    render(
      <QueryProvider>
        <QueryDetail<Contact> queryKey={["contact", "error"]} queryFn={queryFn}>
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("This could not be loaded.");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
  });

  it("keeps the item on screen with a progress bar while it refreshes", async () => {
    let release: (contact: Contact) => void = () => undefined;
    const queryFn = vi
      .fn<() => Promise<Contact>>()
      .mockResolvedValueOnce({ id: 1, name: "Ada Lovelace" })
      .mockImplementationOnce(
        () =>
          new Promise<Contact>((resolve) => {
            release = resolve;
          }),
      );
    render(
      <QueryProvider>
        <QueryDetail<Contact> queryKey={["contact", "refresh"]} queryFn={queryFn}>
          {(contact, { refetch }) => (
            <>
              <h2>{contact.name}</h2>
              <button type="button" onClick={refetch}>
                Refresh
              </button>
            </>
          )}
        </QueryDetail>
      </QueryProvider>,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Refresh" }));

    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();

    act(() => {
      release({ id: 1, name: "Ada King" });
    });
    expect(await screen.findByRole("heading", { name: "Ada King" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("serves a second reader of the same key from the cache", async () => {
    const queryFn = vi.fn(() => Promise.resolve({ id: 1, name: "Ada Lovelace" }));
    render(
      <QueryProvider>
        <QueryDetail<Contact> queryKey={["contact", "shared"]} queryFn={queryFn} staleTime={60_000}>
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
        <QueryDetail<Contact> queryKey={["contact", "shared"]} queryFn={queryFn} staleTime={60_000}>
          {(contact) => <p>Also {contact.name}</p>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(await screen.findByText("Also Ada Lovelace")).toBeInTheDocument();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("does not fetch while disabled", () => {
    const queryFn = vi.fn(() => Promise.resolve({ id: 1, name: "Ada Lovelace" }));
    render(
      <QueryProvider>
        <QueryDetail<Contact> queryKey={["contact", "off"]} queryFn={queryFn} enabled={false}>
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(queryFn).not.toHaveBeenCalled();
  });

  it("opens with the app's loader, or a skeleton in a record panel's shape when asked", () => {
    const pending = () => new Promise<Contact>(() => undefined);
    const { container, unmount } = render(
      <QueryProvider>
        <QueryDetail<Contact> queryKey={["contact", "slow"]} queryFn={pending}>
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=app-loader]")).toBeInTheDocument();
    expect(container.querySelector("[data-slot=detail-skeleton]")).not.toBeInTheDocument();
    unmount();

    const skeleton = render(
      <QueryProvider>
        <QueryDetail<Contact>
          queryKey={["contact", "slow"]}
          queryFn={pending}
          placeholder="skeleton"
        >
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(skeleton.container.querySelector("[data-slot=detail-skeleton]")).toBeInTheDocument();
  });

  it("says what was not found, with the way out it is given", async () => {
    const onClose = vi.fn();
    render(
      <QueryProvider>
        <QueryDetail<Contact>
          queryKey={["contact", "gone"]}
          queryFn={() => Promise.resolve(null)}
          messages={{
            notFound: "This contact could not be found.",
            notFoundDescription: "They may have been merged.",
          }}
          notFoundAction={
            <button type="button" onClick={onClose}>
              Close
            </button>
          }
        >
          {(contact) => <h2>{contact.name}</h2>}
        </QueryDetail>
      </QueryProvider>,
    );
    expect(await screen.findByText("This contact could not be found.")).toBeInTheDocument();
    expect(screen.getByText("They may have been merged.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
