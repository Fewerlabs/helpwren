"use client";

import { Button, cn } from "@helpwren/design-system";
import { useRef, useState, type ReactNode } from "react";

const failures = {
  forbidden: "You are not allowed to change this.",
  too_large: "That file is over 1 MB. Choose a smaller one.",
  unsupported: "Choose a PNG, JPG or WebP image.",
  failed: "The image could not be uploaded. Try again.",
} as const;

export type ImageUploadResult =
  { ok: true; url: string } | { ok: false; reason: "forbidden" | "too_large" | "unsupported" };

export interface ImageFieldProps {
  /** The address of the image, or empty when there is none. */
  value: string;
  onChange: (value: string) => void;
  /** Stores the file and gives back its address. */
  upload: (file: File) => Promise<ImageUploadResult>;
  /** What the image is, such as "logo" or "photo", for the buttons and its description. */
  noun: string;
  /** Shown in the frame when there is no image. */
  placeholder: ReactNode;
  /** A circle for a face, a rounded square for a logo. Default `square`. */
  shape?: "square" | "circle";
  /** The largest file, in bytes, checked before uploading. */
  maxBytes: number;
  /** The kinds of file offered by the file picker, such as `image/png`. */
  accept: readonly string[];
  disabled?: boolean;
}

/**
 * An image a person uploads: what is there now, and a way to put another in its place or take
 * it away. The file is stored when it is chosen; the form it sits in decides when it is used,
 * which is when the form is saved.
 */
export function ImageField({
  value,
  onChange,
  upload,
  noun,
  placeholder,
  shape = "square",
  maxBytes,
  accept,
  disabled = false,
}: ImageFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);

  async function choose(file: File) {
    setFailure(null);
    if (file.size > maxBytes) {
      setFailure("too_large");
      return;
    }
    setUploading(true);
    try {
      const result = await upload(file);
      if (result.ok) onChange(result.url);
      else setFailure(result.reason);
    } catch {
      setFailure("failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "border-rule bg-muted/40 grid size-14 shrink-0 place-items-center overflow-hidden border",
            shape === "circle" ? "rounded-full" : "rounded-xl",
          )}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- from the install's own storage, whose host the optimiser does not know
            <img
              src={value}
              alt={`Current ${noun}`}
              className={cn("size-full", shape === "circle" ? "object-cover" : "object-contain")}
            />
          ) : (
            placeholder
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {value ? `Replace ${noun}` : `Upload ${noun}`}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => {
              setFailure(null);
              onChange("");
            }}
          >
            Remove
          </Button>
        ) : null}
        <input
          ref={input}
          type="file"
          aria-label={`${noun.charAt(0).toUpperCase()}${noun.slice(1)} file`}
          accept={accept.join(",")}
          className="sr-only"
          tabIndex={-1}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Cleared, so choosing the same file again after a failure still counts as a change.
            event.target.value = "";
            if (file) void choose(file);
          }}
        />
      </div>
      {failure ? (
        <p role="alert" className="text-destructive text-xs">
          {failures[failure]}
        </p>
      ) : null}
    </div>
  );
}
