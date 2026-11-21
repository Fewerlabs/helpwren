import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestLoginCode, submitLoginCode, submitPassword } from "../actions";
import { LoginForm } from "./login-form";

// The actions run on the server. Here they are stand-ins, so the test covers the form alone.
vi.mock("../actions", () => ({
  requestLoginCode: vi.fn(),
  submitLoginCode: vi.fn(),
  submitPassword: vi.fn(),
}));

const EMAIL = "ada@example.com";

async function askForCode(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/work email/i), EMAIL);
  await user.click(screen.getByRole("button", { name: "Email me a code instead" }));
  return screen.findByLabelText(/sign-in code/i);
}

beforeEach(() => {
  vi.mocked(requestLoginCode).mockReset().mockResolvedValue({ ok: true });
  vi.mocked(submitLoginCode).mockReset();
  vi.mocked(submitPassword).mockReset();
});

describe("LoginForm", () => {
  it("shows the code button working while a code is sent, not the sign-in button", async () => {
    const user = userEvent.setup();
    vi.mocked(requestLoginCode).mockReturnValue(new Promise(() => undefined));
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), EMAIL);
    await user.click(screen.getByRole("button", { name: "Email me a code instead" }));

    expect(screen.getByRole("button", { name: /email me a code instead/i })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    const signIn = screen.getByRole("button", { name: /^sign in$/i });
    expect(signIn).not.toHaveAttribute("aria-busy");
    expect(signIn).toBeDisabled();
  });

  it("offers no code by email where the install cannot send one", () => {
    render(<LoginForm allowCode={false} />);

    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Email me a code instead" })).toBeNull();
  });

  it("asks for a real email address before sending anything", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), "ada");
    await user.click(screen.getByRole("button", { name: "Email me a code instead" }));

    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(requestLoginCode).not.toHaveBeenCalled();
  });

  it("moves on to the code once it has been sent, without confirming the email exists", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await askForCode(user);

    expect(requestLoginCode).toHaveBeenCalledWith(EMAIL);
    expect(screen.getByRole("status")).toHaveTextContent(
      `If ${EMAIL} is on the team, a 6-digit code has been sent to it.`,
    );
  });

  it("says so when the code could not be sent", async () => {
    vi.mocked(requestLoginCode).mockResolvedValue({ ok: false, reason: "failed" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), EMAIL);
    await user.click(screen.getByRole("button", { name: "Email me a code instead" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Try again in a moment.");
    expect(screen.queryByLabelText(/sign-in code/i)).not.toBeInTheDocument();
  });

  it("does not send a code that is not six digits", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(await askForCode(user), "12ab");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter the 6-digit code from the email.")).toBeInTheDocument();
    expect(submitLoginCode).not.toHaveBeenCalled();
  });

  it("submits the code with the email it was sent to", async () => {
    vi.mocked(submitLoginCode).mockResolvedValue({ ok: false, reason: "invalid_code" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(await askForCode(user), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That code is wrong or out of date.",
    );
    expect(submitLoginCode).toHaveBeenCalledWith(EMAIL, "123456", undefined);
  });

  it("tells someone who is not on the team to ask for an invite", async () => {
    vi.mocked(submitLoginCode).mockResolvedValue({ ok: false, reason: "not_an_agent" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(await askForCode(user), "123456");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ask an admin to invite you.");
  });

  it("sends a new code on request", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await askForCode(user);
    await user.click(screen.getByRole("button", { name: "Send a new code" }));

    expect(await screen.findByText(/a new code is on its way/i)).toBeInTheDocument();
    expect(requestLoginCode).toHaveBeenCalledTimes(2);
  });

  it("goes back to the password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await askForCode(user);
    await user.click(screen.getByRole("button", { name: "Use a password" }));

    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it("signs in with the email and password, and says only that they do not match", async () => {
    vi.mocked(submitPassword).mockResolvedValue({ ok: false, reason: "invalid_credentials" });
    const user = userEvent.setup();
    render(<LoginForm next="/setup" />);

    await user.type(screen.getByLabelText(/work email/i), EMAIL);
    await user.type(screen.getByLabelText(/^password/i), "correct horse");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email and password do not match.",
    );
    expect(submitPassword).toHaveBeenCalledWith(EMAIL, "correct horse", "/setup");
  });

  it("asks for the password before signing in with one", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), EMAIL);
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter your password.")).toBeInTheDocument();
    expect(submitPassword).not.toHaveBeenCalled();
  });

  it("says when there have been too many tries", async () => {
    vi.mocked(submitPassword).mockResolvedValue({ ok: false, reason: "rate_limited" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), EMAIL);
    await user.type(screen.getByLabelText(/^password/i), "guess");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries.");
  });
});
