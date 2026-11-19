import { describe, expect, it } from "vitest";

import { fillPlaceholders, PLACEHOLDERS, SAMPLE_PLACEHOLDER_VALUES } from "./placeholders";

describe("fillPlaceholders", () => {
  it("fills every placeholder from what is known", () => {
    expect(
      fillPlaceholders(
        "Hi {contact.first_name} ({contact.name}, {contact.email}). " +
          "{agent.first_name} / {agent.name} at {brand.name}, about {conversation.number}.",
        SAMPLE_PLACEHOLDER_VALUES,
      ),
    ).toBe("Hi Jordan (Jordan Lee, jordan@example.com). Ada / Ada Okafor at Acme, about #1042.");
  });

  it("falls back to sensible words for what is not known", () => {
    expect(
      fillPlaceholders(
        "Hi {contact.first_name}, {agent.first_name} from {brand.name} about {conversation.number}",
        { contact: { name: null }, conversation: { number: null } },
      ),
    ).toBe("Hi there, the team from our team about this conversation");
  });

  it("treats a blank name as no name", () => {
    expect(fillPlaceholders("Hi {contact.first_name}", { contact: { name: "   " } })).toBe(
      "Hi there",
    );
  });

  it("allows spaces inside the braces", () => {
    expect(fillPlaceholders("Hi { contact.first_name }", SAMPLE_PLACEHOLDER_VALUES)).toBe(
      "Hi Jordan",
    );
  });

  it("leaves braces that name no placeholder alone", () => {
    expect(fillPlaceholders("{order.id} and {not a placeholder}", {})).toBe(
      "{order.id} and {not a placeholder}",
    );
  });

  it("fills the same placeholder each time it appears", () => {
    expect(fillPlaceholders("{brand.name} {brand.name}", { brand: { name: "Acme" } })).toBe(
      "Acme Acme",
    );
  });

  it("lists a fallback for every placeholder", () => {
    for (const placeholder of PLACEHOLDERS) {
      expect(fillPlaceholders(placeholder.token, {})).toBe(placeholder.fallback);
    }
  });
});
