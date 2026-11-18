"use client";

import {
  contactDetailsSchema,
  MESSAGE_MAX_LENGTH,
  messageBodySchema,
  phoneSchema,
  type GuestDetails,
} from "@helpwren/core";
import { Button, FieldList, Icon, toCountryCode, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { getChatClient } from "../client";
import { chatKeys } from "../hooks/use-chat";
import { useShowScreen } from "../store/chat-store";

interface StartValues {
  name: string;
  /** Which of the two the visitor chose to give, when the install accepts either. */
  replyBy: "email" | "phone";
  email: string;
  phone: string;
  message: string;
}

const empty: StartValues = { name: "", replyBy: "email", email: "", phone: "", message: "" };

const valid = (schema: z.ZodType, value: string) => schema.safeParse(value).success;

/** The form's rules for one install: the client library's own, applied to the fields shown. */
function startSchema(ask: GuestDetails | "nothing") {
  return z
    .object({
      name: z.string(),
      replyBy: z.enum(["email", "phone"]),
      email: z.string(),
      phone: z.string(),
      message: z.string().refine((value) => valid(messageBodySchema, value), {
        error: (issue) =>
          String(issue.input).trim().length > MESSAGE_MAX_LENGTH
            ? `Keep your message under ${MESSAGE_MAX_LENGTH.toLocaleString("en")} characters.`
            : "Write a message.",
      }),
    })
    .superRefine((values, context) => {
      if (ask === "nothing" || ask === "none") return;

      if (!valid(contactDetailsSchema.shape.name.unwrap(), values.name)) {
        context.addIssue({ code: "custom", path: ["name"], message: "Enter your name." });
      }
      const by = ask === "email_or_phone" ? values.replyBy : ask;
      if (by === "email" && !valid(contactDetailsSchema.shape.email.unwrap(), values.email)) {
        context.addIssue({ code: "custom", path: ["email"], message: "Enter your email address." });
      }
      if (by === "phone" && !valid(phoneSchema, values.phone)) {
        context.addIssue({ code: "custom", path: ["phone"], message: "Enter your phone number." });
      }
    });
}

function fieldsFor(
  ask: GuestDetails | "nothing",
  replyBy: StartValues["replyBy"],
  defaultCountry: string,
) {
  const fields: FieldItem<StartValues>[] = [];
  const country = toCountryCode(defaultCountry);
  if (ask !== "nothing" && ask !== "none") {
    fields.push({
      name: "name",
      label: "Your name",
      type: "input",
      required: true,
      props: { autoComplete: "name", prepend: <Icon name="user" /> },
    });
    if (ask === "email_or_phone") {
      fields.push({
        name: "replyBy",
        label: "How can we reach you?",
        type: "radio",
        props: {
          className: "flex gap-4",
          options: [
            { value: "email", label: "Email" },
            { value: "phone", label: "Phone" },
          ],
        },
      });
    }
    const by = ask === "email_or_phone" ? replyBy : ask;
    fields.push(
      by === "email"
        ? {
            name: "email",
            label: "Email",
            type: "input",
            required: true,
            hint: "So we can reply if you leave.",
            props: {
              type: "email",
              autoComplete: "email",
              autoCapitalize: "none",
              prepend: <Icon name="envelope" />,
            },
          }
        : {
            name: "phone",
            label: "Phone number",
            type: "phone",
            required: true,
            hint: "So we can reach you if you leave.",
            props: {
              autoComplete: "tel",
              // Pasting a number from another country still switches to it.
              ...(country ? { defaultCountry: country } : {}),
            },
          },
    );
  }
  fields.push({
    name: "message",
    label: "Your message",
    type: "textarea",
    required: true,
    props: { rows: 4, placeholder: "How can we help?" },
  });
  return fields;
}

export interface StartFormProps {
  guestDetails: GuestDetails;
  /** The country the phone field starts on, as a two-letter code from the install's settings. */
  defaultCountry: string;
  source: string;
  /** True when the visitor has written before, and so has already said who they are. */
  returning: boolean;
}

/** Starts a conversation: who the visitor is, if the install asks, and their first message. */
export function StartForm({ guestDetails, defaultCountry, source, returning }: StartFormProps) {
  const queryClient = useQueryClient();
  const show = useShowScreen();
  // The server has the last word on whether details are needed; see `start` below.
  const [askAnyway, setAskAnyway] = useState(false);
  const ask = returning && !askAnyway ? "nothing" : guestDetails;

  const schema = useMemo(() => startSchema(ask), [ask]);
  const form = useForm<StartValues>({ resolver: zodResolver(schema), defaultValues: empty });
  const replyBy = useWatch({ control: form.control, name: "replyBy" });

  async function start(values: StartValues) {
    const client = getChatClient();
    const by = ask === "email_or_phone" ? values.replyBy : ask;

    try {
      // The session is created here, with the first message, not when the chat is opened.
      await client.sessions.startGuest();
      const result = await client.conversations.start({
        message: values.message,
        source,
        contact:
          ask === "nothing" || ask === "none"
            ? {}
            : {
                name: values.name,
                ...(by === "email" ? { email: values.email } : { phone: values.phone }),
              },
        ...(document.referrer ? { page: { url: document.referrer } } : {}),
      });

      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: chatKeys.session });
        await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
        show({ name: "conversation", id: result.conversation.id });
      } else if (result.reason === "details_required") {
        setAskAnyway(true);
        form.setError("root", { message: "Tell us who you are, so we can reply." });
      } else {
        form.setError("root", {
          message: "You have started several conversations. Try again in a while.",
        });
      }
    } catch {
      form.setError("root", { message: "Your message could not be sent. Try again." });
    }
  }

  return (
    <form
      noValidate
      className="grid gap-5 p-4"
      onSubmit={(event) => {
        void form.handleSubmit(start)(event);
      }}
    >
      <FieldList
        control={form.control}
        fields={fieldsFor(ask, replyBy, defaultCountry)}
        disabled={form.formState.isSubmitting}
      />
      {form.formState.errors.root ? (
        <p role="alert" className="text-destructive text-sm">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      <Button type="submit" loading={form.formState.isSubmitting}>
        Send message
      </Button>
    </form>
  );
}
