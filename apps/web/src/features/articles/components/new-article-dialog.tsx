"use client";

import { type Collection } from "@helpwren/core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldList,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { ARTICLES_QUERY_KEY, HELP_PATH } from "../hooks/use-articles";
import { newArticleSchema, type NewArticleValues } from "../schemas";

export interface NewArticleDialogProps {
  collections: readonly Collection[];
  /** The collection the table is showing, which the new article starts in. */
  collectionId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Stands for "no collection yet" in the list of choices, where a value cannot be empty. */
const LATER = "later";
const FAILED = "The article could not be started. Try again.";

/**
 * Asks for a title before an article exists, because its address is made from the title once
 * and then stays put. The draft opens in the editor.
 */
export function NewArticleDialog({
  collections,
  collectionId,
  open,
  onOpenChange,
}: NewArticleDialogProps) {
  const router = useRouter();
  const getClient = useHelpwren();
  const queryClient = useQueryClient();
  const form = useForm<NewArticleValues>({
    resolver: zodResolver(newArticleSchema),
    values: { title: "", collectionId: collectionId ?? LATER },
  });

  const fields = useMemo<FieldItem<NewArticleValues>[]>(
    () => [
      {
        name: "title",
        label: "Title",
        type: "input",
        required: true,
        hint: "Its address is made from this. You can change both while it is a draft.",
        props: { placeholder: "Reset your password", autoComplete: "off" },
      },
      {
        name: "collectionId",
        label: "Collection",
        type: "select",
        props: {
          options: [
            { value: LATER, label: "Choose later" },
            ...collections.map((collection) => ({
              value: collection.id,
              label: collection.name,
            })),
          ],
        },
      },
    ],
    [collections],
  );

  async function start(values: NewArticleValues) {
    try {
      const result = await getClient().articles.create({
        title: values.title,
        collectionId: values.collectionId === LATER ? null : values.collectionId,
      });
      if (!result.ok) {
        form.setError("root", { message: FAILED });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ARTICLES_QUERY_KEY });
      router.push(`${HELP_PATH}/${result.article.id}`);
    } catch {
      form.setError("root", { message: FAILED });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New article</DialogTitle>
          <DialogDescription>
            It starts as a draft that only your team can see, until you publish it.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void form.handleSubmit(start)(event);
          }}
        >
          <FieldList
            control={form.control}
            fields={fields}
            disabled={form.formState.isSubmitting}
          />
          {form.formState.errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Start writing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
