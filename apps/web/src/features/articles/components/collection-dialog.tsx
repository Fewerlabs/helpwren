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
  useConfirm,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useHelpwren } from "@/lib/helpwren-context";

import { collectionHref, HELP_PATH, useArticlesChanged } from "../hooks/use-articles";
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

/** The form that makes a collection, or renames, reorders and removes one. */
export function CollectionDialog({
  collection,
  collections,
  open,
  onOpenChange,
  onCreated,
}: CollectionDialogProps) {
  const router = useRouter();
  const getClient = useHelpwren();
  const confirm = useConfirm();
  const changed = useArticlesChanged();
  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    values: {
      name: collection?.name ?? "",
      description: collection?.description ?? "",
      icon: collection?.icon ?? "book-open",
    },
  });
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
    if (!collection) return;
    if (collection.articleCount > 0) {
      toast.error("Move or remove this collection's articles first.");
      return;
    }
    const confirmed = await confirm({
      title: `Remove ${collection.name}?`,
      description: "The collection is removed for good. It holds no articles.",
      confirmLabel: "Remove",
      tone: "destructive",
    });
    if (!confirmed) return;
    try {
      const result = await getClient().collections.remove(collection.id);
      if (!result.ok && result.reason === "not_empty") {
        toast.error("Move or remove this collection's articles first.");
        return;
      }
      await changed();
      onOpenChange(false);
      router.push(HELP_PATH);
      toast.success("Collection removed");
    } catch {
      toast.error("The collection could not be removed. Try again.");
    }
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
                Remove collection
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
