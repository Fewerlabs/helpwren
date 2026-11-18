import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("renders its parts in order", () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Refund for order 1042</CardTitle>
          <CardDescription>Opened two hours ago</CardDescription>
        </CardHeader>
        <CardContent>Charged twice.</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveTextContent(
      "Refund for order 1042Opened two hours agoCharged twice.Footer",
    );
  });

  it("is outlined rather than shadowed, and merges className", () => {
    render(
      <Card data-testid="card" className="max-w-sm">
        Body
      </Card>,
    );
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("border-line", "ring-0", "max-w-sm");
    expect(card).not.toHaveClass("ring-1");
  });
});
