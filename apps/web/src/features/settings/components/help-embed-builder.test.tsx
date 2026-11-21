import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { HelpEmbedBuilder, helpEmbedSnippets } from "./help-embed-builder";

const ORIGIN = "https://support.example.com";

describe("helpEmbedSnippets", () => {
  it("puts the chosen parts in the frame's address and in the script's options", () => {
    const [html, script] = helpEmbedSnippets(ORIGIN, {
      hide: ["breadcrumbs", "feedback"],
      padding: "compact",
      theme: "dark",
    });
    expect(html?.code).toContain(
      `src="${ORIGIN}/help?embed=1&hide=breadcrumbs,feedback&padding=compact&theme=dark"`,
    );
    expect(html?.code).toContain(`event.origin !== "${ORIGIN}"`);
    expect(script?.code).toContain(`<script src="${ORIGIN}/widget.js"></script>`);
    expect(script?.code).toContain(
      'Helpwren.embedHelp(document.getElementById("helpwren-help"), { hide: ["breadcrumbs", "feedback"], padding: "compact", theme: "dark" });',
    );
  });

  it("shows everything when nothing is chosen", () => {
    const [html, script] = helpEmbedSnippets(ORIGIN, { hide: [] });
    expect(html?.code).toContain(`src="${ORIGIN}/help?embed=1"`);
    expect(script?.code).toContain('Helpwren.embedHelp(document.getElementById("helpwren-help"));');
  });
});

describe("HelpEmbedBuilder", () => {
  it("previews and writes the snippet for the parts left on", async () => {
    const user = userEvent.setup();
    render(<HelpEmbedBuilder origin={ORIGIN} />);
    await user.click(screen.getByRole("checkbox", { name: "Breadcrumbs" }));
    await user.click(screen.getByRole("checkbox", { name: "Title" }));
    await user.click(screen.getByRole("switch", { name: "Transparent background" }));

    expect(screen.getByTitle("Help center preview")).toHaveAttribute(
      "src",
      "/help?embed=1&hide=title,breadcrumbs&bg=transparent",
    );
    expect(screen.getByText(/hide=title,breadcrumbs&bg=transparent/)).toBeInTheDocument();
  });
});
