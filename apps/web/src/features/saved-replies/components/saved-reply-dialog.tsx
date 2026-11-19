"use client";

import {
  fillPlaceholders,
  PLACEHOLDERS,
  SAMPLE_PLACEHOLDER_VALUES,
  type SavedReply,
} from "@helpwren/core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldList,
  MessageBubble,
  Textarea,
  toast,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { useRefreshSavedReplies } from "../hooks/use-saved-replies";
import { replaceRange } from "../picker";
import { savedReplyFormSchema, type SavedReplyFormValues } from "../schemas";

const failures = {
  forbidden: "You can change your own replies, and an admin can change the team's.",
  shortcut_taken: "Another saved reply already has this shortcut.",
  not_found: "This reply no longer exists, or you cannot change it.",
  failed: "The reply could not be saved. Try again.",
} as const;

export interface SavedReplyDialogProps {
  /** The reply being changed, or `null` to write a new one. */
  reply: SavedReply | null;
  /** Text to start a new reply with, such as what was typed in the reply box. */
  initialBody?: string;
  onClose: () => void;
}

/**
 * The editor for one saved reply: its title, shortcut, who sees it and its words, with the
 * placeholders to click in and a preview filled with made-up values.
 */
export function SavedReplyDialog({ reply, initialBody = "", onClose }: SavedReplyDialogProps) {
  const getClient = useHelpwren();
  const refresh = useRefreshSavedReplies();
  const body = useRef<HTMLTextAreaElement | null>(null);
  const form = useForm<SavedReplyFormValues>({
    resolver: zodResolver(savedReplyFormSchema),
    defaultValues: {
      title: reply?.title ?? "",
      shortcut: reply?.shortcut ?? "",
      visibility: reply?.visibility ?? "team",
      body: reply?.body ?? initialBody,
    },
  });
  const text = useWatch({ control: form.control, name: "body" });

  /** Puts a placeholder where the caret is in the reply, and keeps typing there. */
  function insert(token: string) {
    const field = body.current;
    const current = form.getValues("body");
    const start = field?.selectionStart ?? current.length;
    const end = field?.selectionEnd ?? current.length;
    const next = replaceRange(current, { start, end }, token);
    form.setValue("body", next.text, { shouldDirty: true });
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(next.caret, next.caret);
    });
  }

  const fields: FieldItem<SavedReplyFormValues>[] = [
    {
      name: "title",
      label: "Title",
      type: "input",
      required: true,
      props: { autoComplete: "off", placeholder: "Refund policy" },
    },
    {
      name: "shortcut",
      label: "Shortcut",
      type: "input",
      hint: "Type / and this in the reply box to find it. Optional.",
      props: { autoComplete: "off", placeholder: "refund", prepend: "/" },
    },
    {
      name: "visibility",
      label: "Who can use it",
      type: "radio",
      props: {
        options: [
          { value: "team", label: "Everyone on the team" },
          { value: "personal", label: "Only me" },
        ],
      },
    },
    {
      name: "body",
      label: "Reply",
      type: "custom",
      required: true,
      render: ({ field }) => (
        <Textarea
          {...field}
          ref={(element) => {
            field.ref(element);
            body.current = element;
          }}
          rows={6}
          placeholder="Hi {contact.first_name}, thanks for writing in."
        />
      ),
    },
  ];

  async function save(values: SavedReplyFormValues) {
    const input = { ...values, shortcut: values.shortcut || null };
    const replies = getClient().savedReplies;
    const result = await (reply ? replies.update(reply.id, input) : replies.create(input)).catch(
      () => ({ ok: false as const, reason: "failed" as const }),
    );
    if (!result.ok) {
      if (result.reason === "shortcut_taken") {
        form.setError("shortcut", { message: failures.shortcut_taken });
      } else {
        form.setError("root", { message: failures[result.reason] });
      }
      return;
    }
    toast.success(reply ? "Saved reply updated" : "Reply saved");
    refresh();
    onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{reply ? "Edit saved reply" : "New saved reply"}</DialogTitle>
          <DialogDescription>
            Put it into any reply or note in one go, and change it before you send.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void form.handleSubmit(save)(event);
          }}
        >
          <FieldList
            control={form.control}
            fields={fields}
            disabled={form.formState.isSubmitting}
          />
          <section aria-labelledby="placeholders-heading" className="grid gap-2">
            <h3 id="placeholders-heading" className="text-xs font-medium">
              Placeholders
            </h3>
            <p className="text-muted-foreground text-xs">
              Filled in from the conversation when the reply is used. Click one to add it.
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((placeholder) => (
                <li key={placeholder.token}>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 font-mono text-[0.6875rem]"
                    aria-label={`Add ${placeholder.label.toLowerCase()}`}
                    title={placeholder.label}
                    onClick={() => {
                      insert(placeholder.token);
                    }}
                  >
                    {placeholder.token}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="preview-heading" className="grid gap-2">
            <h3 id="preview-heading" className="text-xs font-medium">
              Preview
            </h3>
            <div className="bg-muted/40 border-rule rounded-xl border p-3">
              {text.trim() ? (
                <MessageBubble from="self" size="sm" className="ml-auto max-w-[90%]">
                  {fillPlaceholders(text, SAMPLE_PLACEHOLDER_VALUES)}
                </MessageBubble>
              ) : (
                <p className="text-muted-foreground text-xs">
                  The reply shows here as a customer called Jordan Lee would read it.
                </p>
              )}
            </div>
          </section>
          {form.formState.errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {reply ? "Save changes" : "Save reply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
