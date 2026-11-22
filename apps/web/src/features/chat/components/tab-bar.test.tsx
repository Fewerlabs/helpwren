import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetChatStore } from "../store/chat-store";
import { TabBar } from "./tab-bar";

beforeEach(() => {
  resetChatStore();
});

describe("TabBar", () => {
  it("shows the three tabs by default", () => {
    render(<TabBar current="home" shown={["home", "messages", "help"]} unread={0} poweredBy />);
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Messages" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("leaves out a tab the install turned off", () => {
    render(<TabBar current="messages" shown={["messages", "help"]} unread={0} poweredBy />);
    expect(screen.queryByRole("button", { name: "Home" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Help" })).toBeInTheDocument();
  });

  it("shows no row of tabs when Messages is the only one, but keeps the credit", () => {
    render(<TabBar current="messages" shown={["messages"]} unread={0} poweredBy />);
    expect(screen.queryByRole("navigation", { name: "Chat" })).not.toBeInTheDocument();
    expect(screen.getByText(/powered by/i)).toBeInTheDocument();
  });
});
