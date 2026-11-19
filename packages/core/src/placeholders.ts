/** What a saved reply's placeholders are filled from. Anything missing gets a fallback. */
export interface PlaceholderValues {
  contact?: { name?: string | null | undefined; email?: string | null | undefined } | undefined;
  agent?: { name?: string | null | undefined } | undefined;
  brand?: { name?: string | null | undefined } | undefined;
  /** The ticket number, when the conversation is a ticket. */
  conversation?: { number?: number | null | undefined } | undefined;
}

/** A placeholder a saved reply may hold, what it stands for and what it says when unknown. */
export interface Placeholder {
  token: string;
  label: string;
  fallback: string;
  value: (values: PlaceholderValues) => string | undefined;
}

/** The text without the spaces around it, or `undefined` when nothing is left. */
function present(text: string | null | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed === "" ? undefined : trimmed;
}

const firstName = (name: string | null | undefined) => present(name)?.split(/\s+/)[0];

/** Every placeholder, in the order the editor lists them. */
export const PLACEHOLDERS: readonly Placeholder[] = [
  {
    token: "{contact.first_name}",
    label: "Contact's first name",
    fallback: "there",
    value: (values) => firstName(values.contact?.name),
  },
  {
    token: "{contact.name}",
    label: "Contact's full name",
    fallback: "there",
    value: (values) => present(values.contact?.name),
  },
  {
    token: "{contact.email}",
    label: "Contact's email",
    fallback: "your email address",
    value: (values) => present(values.contact?.email),
  },
  {
    token: "{agent.first_name}",
    label: "Your first name",
    fallback: "the team",
    value: (values) => firstName(values.agent?.name),
  },
  {
    token: "{agent.name}",
    label: "Your full name",
    fallback: "the team",
    value: (values) => present(values.agent?.name),
  },
  {
    token: "{brand.name}",
    label: "Your brand's name",
    fallback: "our team",
    value: (values) => present(values.brand?.name),
  },
  {
    token: "{conversation.number}",
    label: "Ticket number",
    fallback: "this conversation",
    value: (values) => {
      const number = values.conversation?.number;
      return number === null || number === undefined ? undefined : `#${number}`;
    },
  },
];

const byToken = new Map(PLACEHOLDERS.map((placeholder) => [placeholder.token, placeholder]));

/**
 * Fills a saved reply's placeholders, such as `{contact.first_name}`, from what is known about
 * the conversation, and a fallback such as "there" for anything unknown, so a reply never goes
 * out with a gap or a raw placeholder in it. Braces that name no placeholder are left alone.
 */
export function fillPlaceholders(body: string, values: PlaceholderValues): string {
  return body.replace(/\{\s*([a-z]+\.[a-z_]+)\s*\}/g, (match, name: string) => {
    const placeholder = byToken.get(`{${name}}`);
    if (!placeholder) return match;
    return placeholder.value(values) ?? placeholder.fallback;
  });
}

/** Made-up values, for showing what a saved reply will look like before it is used. */
export const SAMPLE_PLACEHOLDER_VALUES: PlaceholderValues = {
  contact: { name: "Jordan Lee", email: "jordan@example.com" },
  agent: { name: "Ada Okafor" },
  brand: { name: "Acme" },
  conversation: { number: 1042 },
};
