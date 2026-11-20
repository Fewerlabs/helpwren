import { type Brand, type EmailTemplate, type EmailTemplateKind } from "@helpwren/core";

import { renderEmail } from "./template";

/** The words each email is filled with, from what happened. Every value is plain text. */
export interface EmailVariables {
  /** The install's brand name. */
  brand: string;
  /** The contact's first name, or "there" when it is not known. */
  name: string;
  /** The ticket's number and subject, such as "#1042 Can't move my booking". Empty for a chat. */
  ticket: string;
  /** "a new reply" or "3 new replies". */
  replies: string;
  /** The ticket's new status, such as "Resolved". */
  status: string;
}

export type EmailVariable = keyof EmailVariables;

/** What each placeholder stands for, for the editor's hints. */
export const emailVariableHelp: Record<EmailVariable, string> = {
  brand: "Your brand name",
  name: "The contact's first name, or “there”",
  ticket: "The ticket's number and subject",
  replies: "“a new reply” or “3 new replies”",
  status: "The ticket's new status",
};

export interface EmailTemplateInfo {
  /** Its name in Settings. */
  label: string;
  /** A shorter name, for its tab. */
  tab: string;
  /** When it is sent. */
  description: string;
  /** The placeholders that mean something in it. */
  variables: readonly EmailVariable[];
  /** Helpwren's own words, used for anything the admin leaves empty. */
  defaults: Record<keyof EmailTemplate, string>;
  /** Why the contact is getting it, in small print. Not editable: it is what keeps it honest. */
  footer: string;
}

export const emailTemplates: Record<EmailTemplateKind, EmailTemplateInfo> = {
  chatReply: {
    label: "New reply in a chat",
    tab: "Chat reply",
    description:
      "Sent when a contact has not read the team's reply in the chat after a few minutes.",
    variables: ["brand", "name", "replies"],
    defaults: {
      subject: "New reply from {{brand}}",
      heading: "You have {{replies}} from {{brand}}",
      body: "Here is what was said while you were away.",
      button: "Continue the conversation",
    },
    footer: "You are getting this because you wrote to {{brand}} and have not read the reply yet.",
  },
  ticketReply: {
    label: "New reply on a ticket",
    tab: "Ticket reply",
    description:
      "Sent when a contact has not read the team's reply on their ticket after a few minutes.",
    variables: ["brand", "name", "ticket", "replies"],
    defaults: {
      subject: "Re: {{ticket}}",
      heading: "You have {{replies}} from {{brand}}",
      body: "About your ticket {{ticket}}.",
      button: "Continue the conversation",
    },
    footer: "You are getting this because you wrote to {{brand}} and have not read the reply yet.",
  },
  ticketStatus: {
    label: "Ticket status changed",
    tab: "Ticket status",
    description: "Sent when the team changes the status of a contact's ticket.",
    variables: ["brand", "name", "ticket", "status"],
    defaults: {
      subject: "{{ticket}}: {{status}}",
      heading: "Your ticket is now {{status}}",
      body: "{{brand}} changed the status of your ticket {{ticket}}.\n\nYou can add to it in the conversation at any time.",
      button: "Open the conversation",
    },
    footer: "You are getting this because you opened a ticket with {{brand}}.",
  },
};

/** Said in every email that can be answered by replying to it. */
export const REPLY_HINT = "Reply to this email, or continue in the chat.";

/** Puts the values in for `{{name}}`-style placeholders. One it does not know is left out. */
export function fillPlaceholders(text: string, variables: Partial<EmailVariables>): string {
  return text
    .replace(/\{\{\s*([a-z]+)\s*\}\}/gi, (_, name: string) => {
      const value = variables[name.toLowerCase() as EmailVariable];
      return value ?? "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export interface BuildEmailOptions {
  brand: Brand;
  kind: EmailTemplateKind;
  /** The admin's own words, if any. */
  template?: EmailTemplate | undefined;
  variables: EmailVariables;
  quotes?: readonly { from: string; text: string }[] | undefined;
  /** Where the button goes. */
  url: string;
  /** Whether the contact can answer by replying, which adds a line saying so. */
  answerable: boolean;
}

/** One email from a template: the admin's words where given, Helpwren's elsewhere. */
export function buildEmail({
  brand,
  kind,
  template,
  variables,
  quotes,
  url,
  answerable,
}: BuildEmailOptions): { subject: string; html: string; text: string } {
  const info = emailTemplates[kind];
  const words = (field: keyof EmailTemplate) =>
    fillPlaceholders(template?.[field] ?? info.defaults[field], variables);

  const heading = words("heading");
  const body = words("body")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const { html, text } = renderEmail(brand, {
    preview: quotes?.at(-1)?.text ?? body[0] ?? heading,
    heading,
    body: [...body, ...(answerable ? [REPLY_HINT] : [])],
    quotes,
    action: { label: words("button"), url },
    footer: fillPlaceholders(info.footer, variables),
  });
  return {
    subject: words("subject") || fillPlaceholders(info.defaults.subject, variables),
    html,
    text,
  };
}

/** Made-up details for the preview and test emails, so each placeholder shows what it becomes. */
export function sampleEmail({
  brand,
  kind,
  template,
}: Pick<BuildEmailOptions, "brand" | "kind" | "template">): BuildEmailOptions {
  const ticket = kind === "chatReply" ? "" : "#1042 Can't move my booking";
  return {
    brand,
    kind,
    template,
    variables: {
      brand: brand.name,
      name: "Amara",
      ticket,
      replies: "a new reply",
      status: "Resolved",
    },
    quotes:
      kind === "ticketStatus"
        ? undefined
        : [{ from: "Sam Rivera", text: "I've moved it to Thursday at 3pm. See you then!" }],
    url: "https://example.com/chat",
    answerable: true,
  };
}
