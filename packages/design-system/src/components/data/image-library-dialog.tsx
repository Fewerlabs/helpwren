"use client";

import { type QueryKey } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { cn } from "#lib/cn";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../base/dialog/dialog";
import { Icon } from "../base/icon/icon";
import { QueryList, type QueryListPage, type QueryListRequest } from "./query-list";

/** A picture already uploaded, to use again. */
export interface LibraryImage {
  url: string;
  /** What it is called, for the button that picks it. Default "picture". */
  name?: string;
}

export interface ImageLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Identifies the pictures already uploaded in the cache. */
  queryKey: QueryKey;
  /** Fetches a page of the pictures already uploaded, newest first. */
  queryFn: (request: QueryListRequest<number>) => Promise<QueryListPage<LibraryImage, number>>;
  /** New pictures, dropped in or chosen from the computer, to upload and put in. */
  onUpload: (files: File[]) => void;
  /** A picture already uploaded, to put in. */
  onChoose: (image: LibraryImage) => void;
  /** The types of picture that may be uploaded, for the file picker. */
  accept?: string;
}

const imagesIn = (files: FileList | undefined | null) =>
  [...(files ?? [])].filter((file) => file.type.startsWith("image/"));

/**
 * Where a picture comes from when one is added to the writing: dropped in or chosen from the
 * computer, or picked from the pictures already uploaded, under it. Closes once one is given.
 */
export function ImageLibraryDialog({
  open,
  onOpenChange,
  queryKey,
  queryFn,
  onUpload,
  onChoose,
  accept = "image/*",
}: ImageLibraryDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const upload = (files: File[]) => {
    if (files.length === 0) return;
    onOpenChange(false);
    onUpload(files);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOver(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex max-h-[min(40rem,90dvh)] flex-col gap-4 sm:max-w-2xl">
        <div>
          <DialogTitle>Add a picture</DialogTitle>
          <DialogDescription className="sr-only">
            Upload new pictures, or use one already uploaded.
          </DialogDescription>
        </div>

        <button
          type="button"
          data-slot="image-drop-zone"
          data-over={over || undefined}
          className={cn(
            "border-rule text-muted-foreground hover:bg-muted/50 focus-visible:ring-ring flex shrink-0 flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center text-sm transition-colors outline-none focus-visible:ring-2",
            over && "border-primary bg-primary/5 text-foreground",
          )}
          onClick={() => {
            fileInput.current?.click();
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            upload(imagesIn(event.dataTransfer.files));
          }}
        >
          <Icon name="upload-simple" className="size-5" />
          <span>
            Drag pictures here, or{" "}
            <span className="text-foreground font-medium underline underline-offset-4">
              choose files
            </span>
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          aria-label="Picture files"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const files = imagesIn(event.target.files);
            // Cleared, so choosing the same file again still counts as a change.
            event.target.value = "";
            upload(files);
          }}
        />

        <section
          aria-labelledby="image-library-heading"
          className="flex min-h-0 flex-1 flex-col gap-2"
        >
          <h3 id="image-library-heading" className="text-muted-foreground text-xs font-medium">
            Uploaded
          </h3>
          <QueryList<LibraryImage, number>
            queryKey={queryKey}
            queryFn={queryFn}
            // Opened again after an upload, it shows the new picture.
            staleTime={0}
            aria-label="Uploaded pictures"
            className="-mx-1 min-h-32 overflow-y-auto"
            contentClassName="p-1"
            listClassName="grid grid-cols-3 gap-2 sm:grid-cols-4"
            getItemKey={(image) => image.url}
            renderEnd={() => null}
            messages={{
              empty: "No pictures uploaded yet.",
              error: "The pictures could not be loaded.",
            }}
            renderItem={(image) => (
              <button
                type="button"
                aria-label={`Use ${image.name ?? "picture"}`}
                className="border-rule bg-muted focus-visible:ring-ring hover:border-primary block aspect-square w-full overflow-hidden rounded-lg border outline-none focus-visible:ring-2"
                onClick={() => {
                  onOpenChange(false);
                  onChoose(image);
                }}
              >
                <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            )}
          />
        </section>
      </DialogContent>
    </Dialog>
  );
}
