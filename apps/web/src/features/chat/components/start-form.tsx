"use client";

import {
  contactDetailsSchema,
  MESSAGE_MAX_LENGTH,
  messageBodySchema,
  phoneSchema,
  type GuestDetails,
} from "@helpwren/core";
import {
  Avatar,
  Button,
  FieldList,
  Icon,
  Textarea,
  toCountryCode,
  Wren,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ComponentProps } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useHelpwren } from "@/lib/helpwren-context";

import { chatKeys } from "../hooks/use-chat";
import { usePage, useShowScreen } from "../store/chat-store";

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
    props: { rows: 5, placeholder: "How can we help?" },
  });
  return fields;
}

export interface StartFormProps {
  guestDetails: GuestDetails;
  /** The country the phone field starts on, as a two-letter code from the install's settings. */
  defaultCountry: string;
  source: string;
  /** Who the visitor is writing to. */
  teamName: string;
  /** True when the visitor has written before, and so has already said who they are. */
  returning: boolean;
}

/** Starts a conversation: who the visitor is, if the install asks, and their first message. */
export function StartForm({
  guestDetails,
  defaultCountry,
  source,
  teamName,
  returning,
}: StartFormProps) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const show = useShowScreen();
  const page = usePage();
  // The server has the last word on whether details are needed; see `start` below.
  const [askAnyway, setAskAnyway] = useState(false);
  const ask = returning && !askAnyway ? "nothing" : guestDetails;

  const schema = useMemo(() => startSchema(ask), [ask]);
  const form = useForm<StartValues>({ resolver: zodResolver(schema), defaultValues: empty });
  const replyBy = useWatch({ control: form.control, name: "replyBy" });

  async function start(values: StartValues) {
    const client = getClient();
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
        // The page the chat is on, when the widget script reported one.
        ...(page ? { page } : {}),
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

  const submit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    void form.handleSubmit(start)(event);
  };
  const { errors, isSubmitting } = form.formState;
  const failure = errors.root?.message;

  // With nothing to ask, the screen is a conversation waiting for its first message.
  if (ask === "nothing" || ask === "none") {
    const message = form.register("message");
    return (
      <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-8 text-center">
          <Wren scene="conversations" decorative className="w-36" />
          <h2 className="pt-2 text-base font-semibold">What can we help with?</h2>
          <p className="text-muted-foreground text-sm">
            Write your message below. {teamName} will reply here.
          </p>
        </div>
        <div className="border-rule grid gap-2 border-t p-3">
          {(failure ?? errors.message?.message) ? (
            <p role="alert" className="text-destructive text-xs">
              {failure ?? errors.message?.message}
            </p>
          ) : null}
          <div className="flex items-end gap-2">
            <Textarea
              aria-label="Your message"
              placeholder="Write a message"
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              className="max-h-32 min-h-10 flex-1 resize-none"
              disabled={isSubmitting}
              {...message}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <Button type="submit" size="icon" aria-label="Send message" loading={isSubmitting}>
              <Icon name="paper-plane-tilt" />
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-3 py-4">
          <Avatar name={teamName} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{teamName}</p>
            <p className="text-muted-foreground text-sm">
              Tell us who you are, so we can reply if you leave.
            </p>
          </div>
        </div>
        <FieldList
          control={form.control}
          fields={fieldsFor(ask, replyBy, defaultCountry)}
          disabled={isSubmitting}
        />
      </div>
      <div className="border-rule grid gap-2 border-t p-3">
        {failure ? (
          <p role="alert" className="text-destructive text-sm">
            {failure}
          </p>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          Send message
          <Icon name="paper-plane-tilt" />
        </Button>
      </div>
    </form>
  );
}
