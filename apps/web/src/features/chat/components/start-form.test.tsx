import { type GuestDetails, type HelpwrenClient } from "@helpwren/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { resetChatStore, useScreen } from "../store/chat-store";
import { StartForm } from "./start-form";

// The client library is replaced by stand-ins, so these tests cover the form alone.
const startGuest = vi.fn();
const start = vi.fn();
const getClient = () =>
  ({ sessions: { startGuest }, conversations: { start } }) as unknown as HelpwrenClient;

function Screen() {
  const current = useScreen();
  return (
    <output>{current.name === "conversation" ? `conversation ${current.id}` : current.name}</output>
  );
}

function renderForm(
  guestDetails: GuestDetails,
  returning = false,
  opening: { welcome?: string; quickReplies?: string[]; ticket?: boolean } = {},
) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HelpwrenProvider getClient={getClient}>
        <StartForm
          guestDetails={guestDetails}
          teamName="Acme"
          source="web"
          welcome={opening.welcome}
          quickReplies={opening.quickReplies ?? []}
          returning={returning}
          ticket={opening.ticket ?? false}
        />
        <Screen />
      </HelpwrenProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

const send = () => screen.getByRole("button", { name: "Send message" });

beforeEach(() => {
  resetChatStore();
  startGuest.mockReset().mockResolvedValue({ id: "guest-1", isGuest: true });
  start.mockReset().mockResolvedValue({ ok: true, conversation: { id: "c1" } });
});

describe("StartForm", () => {
  it("asks for a name and an email when the install wants an email", async () => {
    const user = renderForm("email");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    await user.click(send());
    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Write a message.")).toBeInTheDocument();
    expect(startGuest).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/your name/i), "Ada");
    await user.type(screen.getByRole("textbox", { name: /email/i }), "ada@example.com");
    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());

    expect(await screen.findByText("conversation c1")).toBeInTheDocument();
    expect(start).toHaveBeenCalledWith({
      message: "Hello",
      source: "web",
      contact: { name: "Ada", email: "ada@example.com" },
      // How long the form was open, which tells a person from a script.
      elapsedMs: expect.any(Number) as number,
    });
  });

  it("asks for a phone number when the install wants one, starting on +234", () => {
    renderForm("phone");
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /country/i })).toHaveTextContent("+234");
    expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();
  });

  it("lets the visitor choose between email and phone when the install accepts either", async () => {
    const user = renderForm("email_or_phone");
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Phone" }));
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/your name/i), "Ada");
    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());
    expect(await screen.findByText("Enter your phone number.")).toBeInTheDocument();
    expect(start).not.toHaveBeenCalled();
  });

  it("asks only for a message when the install asks for nothing", async () => {
    const user = renderForm("none");
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());

    expect(await screen.findByText("conversation c1")).toBeInTheDocument();
    expect(start).toHaveBeenCalledWith({ message: "Hello", source: "web", contact: {} });
  });

  it("does not ask a returning visitor who they are, unless the server says it must", async () => {
    start.mockResolvedValueOnce({ ok: false, reason: "details_required" });
    const user = renderForm("email", true);
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());

    expect(await screen.findByRole("alert")).toHaveTextContent("Tell us who you are");
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your message/i)).toHaveValue("Hello");
  });

  it("says so when the visitor has started too many conversations", async () => {
    start.mockResolvedValue({ ok: false, reason: "rate_limited" });
    const user = renderForm("none");

    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());

    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in a while.");
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("says so when sending fails, and keeps what was written", async () => {
    start.mockRejectedValue(new Error("offline"));
    const user = renderForm("none");

    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be sent");
    expect(screen.getByLabelText(/your message/i)).toHaveValue("Hello");
  });

  it("opens with the team's welcome, and sends a quick reply at one tap", async () => {
    const user = renderForm("none", false, {
      welcome: "Hello! Ask us anything.",
      quickReplies: ["Pricing", "Track my order"],
    });
    expect(screen.getByText("Hello! Ask us anything.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Track my order" }));
    expect(await screen.findByText("conversation c1")).toBeInTheDocument();
    expect(start).toHaveBeenCalledWith({ message: "Track my order", source: "web", contact: {} });
  });

  it("fills a quick reply in as the message when details are still needed", async () => {
    const user = renderForm("email", false, { quickReplies: ["Pricing"] });

    await user.click(screen.getByRole("button", { name: "Pricing" }));
    expect(screen.getByLabelText(/your message/i)).toHaveValue("Pricing");
    expect(start).not.toHaveBeenCalled();
  });

  it("opens a ticket with a subject, and asks for one even from someone already known", async () => {
    const user = renderForm("email", true, { ticket: true });
    // Known already, so no name or email; a ticket still needs saying what it is about.
    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit ticket" }));
    expect(await screen.findByText("Say what the ticket is about.")).toBeInTheDocument();
    expect(start).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/subject/i), "Cracked screen");
    await user.type(screen.getByLabelText(/details/i), "It arrived broken.");
    await user.click(screen.getByRole("button", { name: "Submit ticket" }));

    expect(await screen.findByText("conversation c1")).toBeInTheDocument();
    expect(start).toHaveBeenCalledWith({
      message: "It arrived broken.",
      source: "web",
      contact: {},
      ticket: { subject: "Cracked screen" },
      elapsedMs: expect.any(Number) as number,
    });
  });

  it("sends what a bot wrote in the field nobody sees, and says when the server refused", async () => {
    start.mockResolvedValueOnce({ ok: false, reason: "refused" });
    const user = renderForm("none");
    const hidden = document.querySelector<HTMLInputElement>('input[name="website"]');
    if (!hidden) throw new Error("No hidden field.");
    // Out of reach of the keyboard and screen readers, so only a bot fills it in.
    expect(hidden.tabIndex).toBe(-1);
    expect(hidden.closest('[aria-hidden="true"]')).not.toBeNull();

    await user.type(hidden, "https://cheap.example");
    await user.type(screen.getByLabelText(/your message/i), "Hello");
    await user.click(send());

    expect(await screen.findByRole("alert")).toHaveTextContent("Your message was not sent");
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({ honeypot: "https://cheap.example" }),
    );
  });
});
