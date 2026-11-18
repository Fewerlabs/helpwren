import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("accepts several lines of text", async () => {
    render(<Textarea aria-label="Reply" />);
    const textarea = screen.getByRole("textbox", { name: "Reply" });
    await userEvent.type(textarea, "Hello{Enter}there");
    expect(textarea).toHaveValue("Hello\nthere");
  });

  it("passes the invalid and disabled states through, and merges className", () => {
    render(<Textarea aria-label="Reply" aria-invalid disabled className="min-h-40" />);
    const textarea = screen.getByRole("textbox", { name: "Reply" });
    expect(textarea).toBeInvalid();
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass("min-h-40");
    expect(textarea).not.toHaveClass("min-h-24");
  });
});
