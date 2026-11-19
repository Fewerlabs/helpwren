"use client";

import {
  contactDetailsSchema,
  MESSAGE_MAX_LENGTH,
  messageBodySchema,
  phoneSchema,
  ticketSubjectSchema,
  type GuestDetails,
} from "@helpwren/core";
import {
  Button,
  FieldList,
  Icon,
  MessageBubble,
  Textarea,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useMemo, useState, type ComponentProps } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useHelpwren } from "@/lib/helpwren-context";

import { TeamAvatar } from "../brand";
import { chatKeys } from "../hooks/use-chat";
import { existingVisitorId } from "../hooks/use-visitor-tracking";
import {
  type PendingStart,
  useClaimed,
  usePage,
  usePageContext,
  usePendingStart,
  usePreview,
  useSetPendingStart,
  useShowScreen,
} from "../store/chat-store";

interface StartValues {
  name: string;
  /** Which of the two the visitor chose to give, when the install accepts either. */
  replyBy: "email" | "phone";
  email: string;
  phone: string;
  /** What a ticket is about. Only asked for a ticket. */
  subject: string;
  message: string;
}

const empty: StartValues = {
  name: "",
  replyBy: "email",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

const valid = (schema: z.ZodType, value: string) => schema.safeParse(value).success;

/** The form's rules for one install: the client library's own, applied to the fields shown. */
function startSchema(ask: GuestDetails | "nothing", ticket: boolean) {
  return z
    .object({
      name: z.string(),
      replyBy: z.enum(["email", "phone"]),
      email: z.string(),
      phone: z.string(),
      subject: z.string().refine((value) => !ticket || valid(ticketSubjectSchema, value), {
        error: (issue) =>
          String(issue.input).trim() === ""
            ? "Say what the ticket is about."
            : "Keep the subject under 200 characters.",
      }),
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
  ticket: boolean,
) {
  const fields: FieldItem<StartValues>[] = [];
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
            // Starts on +234. Pasting a number from another country switches to it.
            props: { autoComplete: "tel" },
          },
    );
  }
  if (ticket) {
    fields.push({
      name: "subject",
      label: "Subject",
      type: "input",
      required: true,
      props: { placeholder: "What is it about, in a line" },
    });
  }
  fields.push({
    name: "message",
    label: ticket ? "Details" : "Your message",
    type: "textarea",
    required: true,
    props: {
      rows: 5,
      placeholder: ticket ? "What happened, and what did you expect?" : "How can we help?",
    },
  });
  return fields;
}

export interface StartFormProps {
  guestDetails: GuestDetails;
  source: string;
  /** Who the visitor is writing to. */
  teamName: string;
  /** A message from the team that opens the conversation, before the visitor writes. */
  welcome: string | undefined;
  /** Replies the visitor can send with one tap. */
  quickReplies: readonly string[];
  /** True when the visitor has written before, and so has already said who they are. */
  returning: boolean;
  /** Opens a ticket in place of a chat: a subject is asked for, and it is tracked by number. */
  ticket?: boolean;
}

interface QuickRepliesProps {
  replies: readonly string[];
  disabled: boolean;
  onPick: (reply: string) => void;
}

/** The install's ready-made replies, as buttons. */
function QuickReplies({ replies, disabled, onPick }: QuickRepliesProps) {
  if (replies.length === 0) return null;
  return (
    <ul aria-label="Quick replies" className="flex flex-wrap gap-2">
      {replies.map((reply) => (
        <li key={reply}>
          <button
            type="button"
            disabled={disabled}
            className="bg-muted hover:bg-rule focus-visible:outline-ring rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            onClick={() => {
              onPick(reply);
            }}
          >
            {reply}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Starts a conversation: who the visitor is, if the install asks, and their first message. */
export function StartForm({
  guestDetails,
  source,
  teamName,
  welcome,
  quickReplies,
  returning,
  ticket = false,
}: StartFormProps) {
  const getClient = useHelpwren();
  const preview = usePreview();
  const queryClient = useQueryClient();
  const show = useShowScreen();
  const page = usePage();
  const pageContext = usePageContext();
  // Who the page says this is, without proof: it saves them typing, and labels the conversation.
  const claimed = useClaimed();
  // The server has the last word on whether details are needed; see `start` below.
  const [askAnyway, setAskAnyway] = useState(false);
  const ask = returning && !askAnyway ? "nothing" : guestDetails;

  const schema = useMemo(() => startSchema(ask, ticket), [ask, ticket]);
  const form = useForm<StartValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...empty, name: claimed?.name ?? "", email: claimed?.email ?? "" },
  });
  const replyBy = useWatch({ control: form.control, name: "replyBy" });

  async function start(values: StartValues) {
    if (preview) {
      form.setError("root", { message: "This is a preview, so nothing was sent." });
      return;
    }
    const client = getClient();
    const by = ask === "email_or_phone" ? values.replyBy : ask;

    // What the page said about the visitor, for the team to see beside the conversation.
    const context = { ...pageContext, ...(claimed?.id ? { claimedUserId: claimed.id } : {}) };
    const visitorId = existingVisitorId();

    try {
      // The session is created here, with the first message, not when the chat is opened.
      await client.sessions.startGuest();
      const result = await client.conversations.start({
        message: values.message,
        source,
        contact:
          ask === "nothing" || ask === "none"
            ? {
                ...(claimed?.name ? { name: claimed.name } : {}),
                ...(claimed?.email ? { email: claimed.email } : {}),
              }
            : {
                name: values.name,
                ...(by === "email" ? { email: values.email } : { phone: values.phone }),
              },
        ...(ticket ? { ticket: { subject: values.subject } } : {}),
        // The page the chat is on, when the widget script reported one.
        ...(page ? { page } : {}),
        ...(Object.keys(context).length > 0 ? { context } : {}),
        // The browser that has been checking in, so the team sees its details on the contact.
        ...(visitorId ? { visitorId } : {}),
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

  // What the page around the chat asked this conversation to begin with is used once here.
  const pendingStart = usePendingStart();
  const setPendingStart = useSetPendingStart();
  const applyPending = useEffectEvent(({ reply, draft }: PendingStart) => {
    setPendingStart(null);
    // Words from the page around the chat are only put in the box: the visitor sends them.
    if (draft) form.setValue("message", draft, { shouldDirty: true });
    // A quick reply is sent for them, but only if it is one of the install's own.
    if (!reply || !quickReplies.includes(reply)) return;
    form.setValue("message", reply, { shouldDirty: true });
    if (ask === "nothing" || ask === "none") void form.handleSubmit(start)();
  });
  useEffect(() => {
    if (pendingStart !== null) applyPending(pendingStart);
  }, [pendingStart]);

  const submit: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    void form.handleSubmit(start)(event);
  };
  const { errors, isSubmitting } = form.formState;
  const failure = errors.root?.message;

  const known = ask === "nothing" || ask === "none";

  // With nothing to ask, the screen is a conversation waiting for its first message. A ticket
  // always has its subject to ask for, so it is always the form below.
  if (known && !ticket) {
    const message = form.register("message");
    return (
      <form noValidate className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
        {welcome || quickReplies.length > 0 ? (
          // A conversation the team has already opened: their welcome, and replies to tap.
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-y-auto p-4">
            {welcome ? (
              <MessageBubble from="other" author={teamName} avatar={<TeamAvatar size="sm" />}>
                {welcome}
              </MessageBubble>
            ) : null}
            <QuickReplies
              replies={quickReplies}
              disabled={isSubmitting}
              onPick={(reply) => {
                form.setValue("message", reply);
                void form.handleSubmit(start)();
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 overflow-y-auto px-8 text-center">
            <TeamAvatar size="lg" />
            <h2 className="pt-2 text-base font-semibold">What can we help with?</h2>
            <p className="text-muted-foreground text-sm">
              Write your message below. {teamName} will reply here.
            </p>
          </div>
        )}
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
          <TeamAvatar />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{teamName}</p>
            <p className="text-muted-foreground text-sm">
              {ticket
                ? "Open a ticket and we will follow it up. You can check on it here at any time."
                : "Tell us who you are, so we can reply if you leave."}
            </p>
          </div>
        </div>
        {welcome ? (
          <MessageBubble from="other" author={teamName} className="pb-4">
            {welcome}
          </MessageBubble>
        ) : null}
        <FieldList
          control={form.control}
          fields={fieldsFor(ask, replyBy, ticket)}
          disabled={isSubmitting}
        />
        {quickReplies.length > 0 ? (
          <div className="pt-3">
            <QuickReplies
              replies={quickReplies}
              disabled={isSubmitting}
              // Who they are is still needed, so a tap fills the message in and leaves the rest.
              onPick={(reply) => {
                form.setValue("message", reply, { shouldDirty: true, shouldValidate: true });
              }}
            />
          </div>
        ) : null}
      </div>
      <div className="border-rule grid gap-2 border-t p-3">
        {failure ? (
          <p role="alert" className="text-destructive text-sm">
            {failure}
          </p>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          {ticket ? "Submit ticket" : "Send message"}
          <Icon name={ticket ? "ticket" : "paper-plane-tilt"} />
        </Button>
      </div>
    </form>
  );
}
