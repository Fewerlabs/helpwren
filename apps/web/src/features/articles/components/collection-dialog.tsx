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
  IconPicker,
  toast,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { collectionHref, useArticlesChanged } from "../hooks/use-articles";
import { useRemoveCollection } from "../hooks/use-remove-collection";
import { collectionFormSchema, type CollectionFormValues } from "../schemas";

export interface CollectionDialogProps {
  /** The collection to change, or `null` to make a new one. */
  collection: Collection | null;
  /** Every collection in order, to move this one among. */
  collections: readonly Collection[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called with a new collection once it is saved, in place of opening it. For a form that
   * makes one while choosing where something goes, such as the article editor.
   */
  onCreated?: ((collection: Collection) => void) | undefined;
}

const fields: FieldItem<CollectionFormValues>[] = [
  {
    name: "name",
    label: "Name",
    type: "input",
    required: true,
    props: { placeholder: "Getting started", autoComplete: "off" },
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    hint: "One line under the name on your help center.",
    props: { rows: 2, placeholder: "Set up your account and add the chat to your site." },
  },
  {
    name: "icon",
    label: "Icon",
    type: "custom",
    render: ({ field }) => (
      <IconPicker
        label="Icon"
        value={field.value}
        onChange={field.onChange}
        disabled={field.disabled ?? false}
      />
    ),
  },
];

const FAILED = "The collection could not be saved. Try again.";

/** What the form starts with: the collection's own values, or a new one's. */
function startingValues(collection: Collection | null): CollectionFormValues {
  return {
    name: collection?.name ?? "",
    description: collection?.description ?? "",
    icon: collection?.icon ?? "book-open",
  };
}

/** The form that makes a collection, or renames, reorders and deletes one. */
export function CollectionDialog({
  collection,
  collections,
  open,
  onOpenChange,
  onCreated,
}: CollectionDialogProps) {
  const router = useRouter();
  const getClient = useHelpwren();
  const removeCollection = useRemoveCollection();
  const changed = useArticlesChanged();
  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: startingValues(collection),
  });
  // Each time it opens, the form starts again: empty for a new collection, or with what is saved
  // for one being changed. Nothing typed into an earlier form carries over.
  const { reset } = form;
  useEffect(() => {
    if (open) reset(startingValues(collection));
  }, [open, collection, reset]);
  const busy = form.formState.isSubmitting;
  const place = collection ? collections.findIndex((item) => item.id === collection.id) : -1;

  async function save(values: CollectionFormValues) {
    try {
      const result = collection
        ? await getClient().collections.update(collection.id, values)
        : await getClient().collections.create(values);
      if (!result.ok) {
        form.setError("root", { message: FAILED });
        return;
      }
      // What was saved is now what the form holds, so nothing in it is left unsaved.
      reset(values);
      await changed();
      onOpenChange(false);
      if (!collection) {
        if (onCreated) onCreated(result.collection);
        else router.push(collectionHref(result.collection.slug));
      }
      toast.success(collection ? "Collection saved" : "Collection added");
    } catch {
      form.setError("root", { message: FAILED });
    }
  }

  async function move(by: -1 | 1) {
    const other = collections[place + by];
    if (!collection || !other) return;
    const ids = collections.map((item) => item.id);
    ids[place] = other.id;
    ids[place + by] = collection.id;
    try {
      await getClient().collections.reorder(ids);
      await changed();
    } catch {
      toast.error("The collections could not be reordered. Try again.");
    }
  }

  async function remove() {
    if (collection && (await removeCollection(collection))) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{collection ? "Edit collection" : "New collection"}</DialogTitle>
          <DialogDescription>
            A collection groups articles on one subject. Visitors see it once it holds a published
            article.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void form.handleSubmit(save)(event);
          }}
        >
          <FieldList control={form.control} fields={fields} disabled={busy} />
          {collection ? (
            <div className="border-rule flex flex-wrap items-center justify-between gap-2 border-t pt-4">
              <div className="flex gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || place <= 0}
                  onClick={() => void move(-1)}
                >
                  Move up
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy || place === collections.length - 1}
                  onClick={() => void move(1)}
                >
                  Move down
                </Button>
              </div>
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => void remove()}>
                Delete collection
              </Button>
            </div>
          ) : null}
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
            <Button type="submit" loading={busy}>
              {collection ? "Save" : "Add collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
