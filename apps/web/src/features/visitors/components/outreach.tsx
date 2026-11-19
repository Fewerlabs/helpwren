"use client";

import { outreachInputSchema, type Visitor } from "@helpwren/core";
import {
  Button,
  FieldError,
  FieldList,
  type FieldItem,
  Link,
  Spinner,
  toast,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import NextLink from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

import { useHelpwren } from "@/lib/helpwren-context";

import { VISITORS_QUERY_KEY } from "../hooks/use-visitors";

const failures = {
  off: "Starting conversations with visitors is switched off in Settings > General.",
  not_found: "This visitor has gone. Their browser is no longer checking in.",
  forbidden: "Only team members can write to visitors.",
} as const;

type OutreachValues = z.infer<typeof outreachInputSchema>;

const fields: FieldItem<OutreachValues>[] = [
  {
    name: "message",
    label: "Message",
    type: "textarea",
    hint: "It appears in their chat as a message from you, the next time their browser checks in.",
    props: { rows: 3, placeholder: "Hi there. Can I help you find anything?" },
  },
];

/**
 * Writing first to someone on the site. The message waits on the visitor's row until their
 * browser checks in and takes it up, which makes it a conversation in the inbox.
 */
export function Outreach({ visitor }: { visitor: Visitor }) {
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const form = useForm<OutreachValues>({
    resolver: zodResolver(outreachInputSchema),
    defaultValues: { message: "" },
  });
  const { outreach } = visitor;

  const refresh = () => queryClient.invalidateQueries({ queryKey: VISITORS_QUERY_KEY });

  async function send(values: OutreachValues) {
    try {
      const result = await getClient().visitors.startConversation(visitor.id, values.message);
      if (result.ok) {
        form.reset({ message: "" });
        toast.success("Message left for the visitor");
        await refresh();
      } else {
        form.setError("root", { message: failures[result.reason] });
      }
    } catch {
      form.setError("root", { message: "The message could not be sent. Try again." });
    }
  }

  async function cancel() {
    setCancelling(true);
    try {
      const result = await getClient().visitors.cancelOutreach(visitor.id);
      if (result.ok) await refresh();
      else toast.error(failures[result.reason]);
    } catch {
      toast.error("The message could not be taken back. Try again.");
    } finally {
      setCancelling(false);
    }
  }

  if (outreach?.status === "waiting") {
    return (
      <div className="grid gap-2 text-xs">
        <p className="bg-muted rounded-lg px-3 py-2 whitespace-pre-wrap">{outreach.message}</p>
        <p role="status" className="text-muted-foreground flex items-center gap-1.5">
          <Spinner className="size-3" aria-hidden="true" />
          Waiting for the visitor&apos;s browser to pick it up
        </p>
        <div>
          <Button variant="secondary" size="sm" disabled={cancelling} onClick={() => void cancel()}>
            Take it back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {outreach?.status === "started" ? (
        <p role="status" className="text-xs">
          Their browser picked up your message.{" "}
          <Link asChild>
            <NextLink href={`/dashboard/inbox?view=all&c=${outreach.conversationId}`}>
              Open the conversation
            </NextLink>
          </Link>
        </p>
      ) : null}
      <form
        noValidate
        className="grid gap-2"
        onSubmit={(event) => {
          void form.handleSubmit(send)(event);
        }}
      >
        <FieldList control={form.control} fields={fields} disabled={form.formState.isSubmitting} />
        {form.formState.errors.root?.message ? (
          <FieldError>{form.formState.errors.root.message}</FieldError>
        ) : null}
        <div>
          <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
            Start conversation
          </Button>
        </div>
      </form>
    </div>
  );
}
